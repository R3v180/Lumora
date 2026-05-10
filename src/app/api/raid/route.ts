import { NextRequest, NextResponse } from 'next/server'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateChallengeProgress, updateAchievementProgress } from '@/lib/challenges';

const RAID_ENERGY_COST = 20;
const STEAL_PERCENTAGE = 0.2; // 20% of idle lumens
const AUTO_SHIELD_HOURS = 2;
const REFRESH_COST = 500;

// GET: Find 3 vulnerable sanctuaries
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { sanctuary: true, guild: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Check if player has a shield active
    const myShield = player.sanctuary?.shieldUntil && player.sanctuary.shieldUntil > new Date()
      ? player.sanctuary.shieldUntil.toISOString()
      : null;

    // Find vulnerable players (no shield, old lastCollectAt, exclude friends/guild)
    const now = new Date();
    const friendIds1 = await db.friendship.findMany({
      where: { player1Id: player.id, status: 'accepted' },
      select: { player2Id: true },
    });
    const friendIds2 = await db.friendship.findMany({
      where: { player2Id: player.id, status: 'accepted' },
      select: { player1Id: true },
    });
    const excludeIds = [
      player.id,
      ...friendIds1.map((f) => f.player2Id),
      ...friendIds2.map((f) => f.player1Id),
    ];

    // Also exclude guild members
    if (player.guild) {
      const guildMembers = await db.guildMember.findMany({
        where: { guildId: player.guild.guildId },
        select: { playerId: true },
      });
      excludeIds.push(...guildMembers.map((m) => m.playerId));
    }

    // Find vulnerable players - raw SQL for resilience
    const targets = await db.$queryRawUnsafe(`
      SELECT 
        pp.id, pp."displayName", pp.level, pp.avatar,
        s."lumensPerHour", s."lastCollectAt", s.name as "sanctuaryName", s."shieldUntil"
      FROM player_profiles pp
      JOIN sanctuaries s ON pp.id = s."playerId"
      WHERE pp.id NOT IN (${excludeIds.map((_, i) => `$${i + 1}`).join(', ')})
      AND s."lastCollectAt" < $${excludeIds.length + 1}
      AND (
        (s."shieldUntil" IS NULL OR s."shieldUntil" < $${excludeIds.length + 2})
        OR
        (RANDOM() < 0.2 AND s."shieldUntil" >= $${excludeIds.length + 2})
      )
      ORDER BY RANDOM()
      LIMIT 3
    `, ...[
      ...excludeIds, 
      new Date(now.getTime() - 15 * 60 * 1000),
      now
    ]);

    const targetIds = (targets as any[]).map(t => t.id);
    const fullTargets = await db.playerProfile.findMany({
      where: { id: { in: targetIds } },
      include: { spirits: { include: { spiritType: true } } }
    });

    const raidTargets = (targets as any[]).map((t) => {
      const hoursSinceCollect = Math.min(8,
        (now.getTime() - (new Date(t.lastCollectAt).getTime())) / 3600000
      );
      const idleLumens = Math.floor((t.lumensPerHour || 0) * hoursSinceCollect);
      const isShielded = t.shieldUntil && new Date(t.shieldUntil) > now;
      
      const fullT = fullTargets.find(ft => ft.id === t.id);
      const defenseIds = (fullT?.arenaDefenseTeam as string[]) || [];
      const defenseElements = defenseIds.map(id => fullT?.spirits.find(s => s.id === id)?.spiritType.element).filter(Boolean);

      return {
        id: t.id,
        displayName: t.displayName,
        level: t.level,
        avatar: t.avatar,
        sanctuaryName: t.sanctuaryName || 'Sanctuary',
        idleLumens,
        stealable: Math.floor(idleLumens * STEAL_PERCENTAGE),
        isShielded,
        defenseElements,
      };
    }).filter(t => t.stealable > 0);

    // Recent raids by this player
    const recentRaids = await db.raidLog.findMany({
      where: { attackerId: player.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      targets: raidTargets,
      myShield,
      energy: player.energy,
      recentRaids,
    });
  } catch (error) {
    console.error('Raid GET error:', error);
    return NextResponse.json({ error: 'Error loading raids' }, { status: 500 });
  }
}

// POST: Execute a raid
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { targetId, precision = 0.5 } = await request.json();

    if (!targetId) {
      return NextResponse.json({ error: 'Objetivo no especificado' }, { status: 400 });
    }

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { sanctuary: true, spirits: { include: { spiritType: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (player.energy < RAID_ENERGY_COST) {
      return NextResponse.json({ error: 'Energía insuficiente' }, { status: 400 });
    }

    const target = await db.playerProfile.findUnique({
      where: { id: targetId },
      include: { sanctuary: true, spirits: { include: { spiritType: true } } },
    });

    if (!target || !target.sanctuary) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    // Get World Tree Dominant Aura
    const worldState = await db.worldState.findUnique({ where: { id: 'lumora_world' } });
    let dominantAura: any = null;
    if (worldState) {
      const { getDominantElement, getDominantAura } = await import('@/lib/worldTree');
      const dominant = getDominantElement(worldState);
      dominantAura = getDominantAura(dominant, worldState.treeLevel);
    }

    let isPiercing = false;
    // Check shield
    if (target.sanctuary.shieldUntil && target.sanctuary.shieldUntil > new Date()) {
      if (precision === 1.0) {
        isPiercing = true;
      } else {
        return NextResponse.json({ error: 'Objetivo protegido por escudo. Requiere precisión Perfecta.' }, { status: 400 });
      }
    }

    const ELEMENT_ADVANTAGE: Record<string, string> = {
      fire: 'nature',
      nature: 'water',
      water: 'fire',
      dream: 'star',
      star: 'dream',
    };

    const attackerSquadIds = (player.arenaDefenseTeam as string[]) || [];
    const defenderSquadIds = (target.arenaDefenseTeam as string[]) || [];
    
    const getBasePower = (profile: any, squadIds: string[]) => {
      const squadSpirits = squadIds.map(id => profile.spirits.find((s: any) => s.id === id)).filter(Boolean);
      return squadSpirits.map((s: any) => {
        const RARITY_MULTIPLIERS: Record<string, number> = { legendary: 1.6, epic: 1.3, rare: 1.15, common: 1.0 };
        const basePwr = s.spiritType.basePower * s.level;
        const mult = RARITY_MULTIPLIERS[s.spiritType.rarity] || 1.0;
        return {
          id: s.id,
          element: s.spiritType.element,
          power: Math.round(basePwr * mult)
        };
      });
    };

    const attackerSpirits = getBasePower(player, attackerSquadIds);
    const defenderSpirits = getBasePower(target, defenderSquadIds);

    let attackerPower = 0;
    let defenderPower = 0;

    for (let i = 0; i < 3; i++) {
      const aSpirit = attackerSpirits[i];
      const dSpirit = defenderSpirits[i];
      
      let aPwr = aSpirit ? aSpirit.power : 0;
      let dPwr = dSpirit ? dSpirit.power : 0;

      if (aSpirit && dSpirit) {
        if (ELEMENT_ADVANTAGE[aSpirit.element] === dSpirit.element) {
          aPwr = Math.round(aPwr * 1.15); // +15%
          dPwr = Math.round(dPwr * 0.90); // -10%
        } else if (ELEMENT_ADVANTAGE[dSpirit.element] === aSpirit.element) {
          dPwr = Math.round(dPwr * 1.15); // +15%
          aPwr = Math.round(aPwr * 0.90); // -10%
        }
      }

      attackerPower += aPwr;
      defenderPower += dPwr;
    }

    // Apply synergies
    const applySynergy = (power: number, spirits: any[]) => {
      if (spirits.length === 0) return 0;
      const elements = spirits.map(s => s.element);
      const counts: Record<string, number> = {};
      elements.forEach(e => counts[e] = (counts[e] || 0) + 1);
      const maxCount = Math.max(...Object.values(counts) as number[], 0);
      const bonus = maxCount === 3 ? 0.25 : maxCount === 2 ? 0.10 : 0.05;
      return Math.round(power * (1 + bonus));
    };

    attackerPower = applySynergy(attackerPower, attackerSpirits);
    defenderPower = applySynergy(defenderPower, defenderSpirits);

    // Apply Fire Aura (Combat Damage)
    if (dominantAura && dominantAura.type === 'combatDamage') {
      attackerPower = Math.round(attackerPower * (1 + dominantAura.value));
    }

    // Success chance: base 50%, modified by power difference and precision
    const powerRatio = attackerPower / (defenderPower || 1);
    let successChance = Math.max(0.1, Math.min(1.0, 0.5 * powerRatio)) * (0.5 + precision); // precision 1.0 => 1.5x multiplier
    successChance = Math.min(1.0, successChance);

    if (Math.random() > successChance) {
      // Failed raid: still costs energy but awards less or nothing
      await db.playerProfile.update({
        where: { id: player.id },
        data: { energy: { decrement: RAID_ENERGY_COST } },
      });
      return NextResponse.json({ 
        success: false, 
        error: isPiercing ? 'Tu ataque perfecto no fue suficiente para romper el escudo enemigo.' : 'Tus espíritus no fueron lo suficientemente fuertes.',
        attackerPower,
        defenderPower,
        newEnergy: player.energy - RAID_ENERGY_COST 
      });
    }

    // Calculate stealable lumens
    const now = new Date();
    const hoursSinceCollect = Math.min(8,
      (now.getTime() - target.sanctuary.lastCollectAt.getTime()) / 3600000
    );
    const idleLumens = Math.floor(target.sanctuary.lumensPerHour * hoursSinceCollect);
    
    // Reduce stolen percentage if defender is stronger, or if piercing
    const baseStealPercentage = isPiercing ? (STEAL_PERCENTAGE * 0.4) : STEAL_PERCENTAGE;
    const effectiveStealPercentage = baseStealPercentage * Math.min(1.0, powerRatio) * (precision >= 1.0 ? 1.2 : 1.0);
    const stolenLumens = Math.floor(idleLumens * effectiveStealPercentage);

    if (stolenLumens <= 0) {
      return NextResponse.json({ error: 'No hay lumens que robar' }, { status: 400 });
    }

    // Execute raid in transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct energy from attacker
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { energy: { decrement: RAID_ENERGY_COST } },
      });

      // Give lumens to attacker
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { lumens: { increment: stolenLumens } },
      });

      // REMOVED: No more auto-shield for attacking. 

      // reset target's lastCollectAt
      await tx.sanctuary.update({
        where: { id: target.sanctuary!.id },
        data: { lastCollectAt: now },
      });
      
      // Roll for chest drop (15% chance)
      let droppedChest: any = null;
      if (Math.random() < 0.15) {
        const rarityRoll = Math.random();
        let rarity = 'common';
        let durationMs = 3 * 3600000; // 3h
        
        if (rarityRoll > 0.95) {
          rarity = 'epic';
          durationMs = 12 * 3600000; // 12h
        } else if (rarityRoll > 0.75) {
          rarity = 'rare';
          durationMs = 6 * 3600000; // 6h
        }
        
        droppedChest = await tx.playerChest.create({
          data: {
            playerId: player.id,
            type: 'raid',
            rarity,
            durationMs,
            unlocksAt: now, // Will need to be started manually
            status: 'locked'
          }
        });
      }

      // Log raid
      await tx.raidLog.create({
        data: {
          attackerId: player.id,
          defenderId: target.id,
          lumensStolen: stolenLumens,
        },
      });

      return {
        lumensStolen: stolenLumens,
        newLumens: player.lumens + stolenLumens,
        newEnergy: player.energy - RAID_ENERGY_COST,
        droppedChest: droppedChest ? {
          id: droppedChest.id,
          rarity: droppedChest.rarity,
          type: droppedChest.type
        } : null
      };
    });

    // Update challenge progress (Exploration/Raid)
    await updateChallengeProgress(player.id, 'raid_sanctuaries', 1);
    await updateChallengeProgress(player.id, 'raids', 1);
    
    // Update achievement progress (Exploration)
    await updateAchievementProgress(player.id, 'exploration', 1);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Raid POST error:', error);
    return NextResponse.json({ error: 'Error en saqueo' }, { status: 500 });
  }
}
