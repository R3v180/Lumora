import { NextRequest, NextResponse } from 'next/server'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const RAID_ENERGY_COST = 20;
const STEAL_PERCENTAGE = 0.2; // 20% of idle lumens
const AUTO_SHIELD_HOURS = 2;

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

    const targets = await db.playerProfile.findMany({
      where: {
        id: { notIn: excludeIds },
        sanctuary: {
          OR: [
            { shieldUntil: null },
            { shieldUntil: { lt: now } },
          ],
          lastCollectAt: { lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // At least 2h idle
        },
      },
      include: {
        sanctuary: { select: { lumensPerHour: true, lastCollectAt: true, name: true } },
      },
      take: 3,
      orderBy: { sanctuaryLevel: 'desc' },
    });

    const raidTargets = targets.map((t) => {
      const hoursSinceCollect = Math.min(8,
        (now.getTime() - (t.sanctuary?.lastCollectAt?.getTime() || now.getTime())) / 3600000
      );
      const idleLumens = Math.floor((t.sanctuary?.lumensPerHour || 0) * hoursSinceCollect);

      return {
        id: t.id,
        displayName: t.displayName,
        level: t.level,
        sanctuaryName: t.sanctuary?.name || 'Sanctuary',
        idleLumens,
        stealable: Math.floor(idleLumens * STEAL_PERCENTAGE),
      };
    });

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
    const { targetId } = await request.json();

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

    // Check shield
    if (target.sanctuary.shieldUntil && target.sanctuary.shieldUntil > new Date()) {
      return NextResponse.json({ error: 'Objetivo protegido por escudo' }, { status: 400 });
    }

    // Calculate Power
    const POWER_MAP: Record<string, number> = {
      common: 10,
      uncommon: 25,
      rare: 60,
      epic: 150,
      legendary: 400
    };
    const attackerPower = player.spirits.reduce((sum, s) => sum + (POWER_MAP[s.spiritType.rarity] || 0), 0);
    const defenderPower = target.spirits.reduce((sum, s) => sum + (POWER_MAP[s.spiritType.rarity] || 0), 0);

    // Success chance: base 70%, modified by power difference
    // If attacker power is double defender power, chance is 100%
    // If defender power is double attacker power, chance is 20%
    const powerRatio = attackerPower / (defenderPower || 1);
    const successChance = Math.max(0.1, Math.min(1.0, 0.7 * powerRatio));

    if (Math.random() > successChance) {
      // Failed raid: still costs energy but awards less or nothing
      await db.playerProfile.update({
        where: { id: player.id },
        data: { energy: { decrement: RAID_ENERGY_COST } },
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Tus espíritus no fueron lo suficientemente fuertes para romper las defensas.',
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
    
    // Reduce stolen percentage if defender is stronger
    const effectiveStealPercentage = STEAL_PERCENTAGE * Math.min(1.0, powerRatio);
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

      // Give attacker auto-shield
      if (player.sanctuary) {
        await tx.sanctuary.update({
          where: { id: player.sanctuary.id },
          data: {
            shieldUntil: new Date(now.getTime() + AUTO_SHIELD_HOURS * 60 * 60 * 1000),
          },
        });
      }

      // Reset target's lastCollectAt so their idle resets
      await tx.sanctuary.update({
        where: { id: target.sanctuary!.id },
        data: { lastCollectAt: now },
      });

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
        shieldUntil: new Date(now.getTime() + AUTO_SHIELD_HOURS * 60 * 60 * 1000).toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Raid POST error:', error);
    return NextResponse.json({ error: 'Error en saqueo' }, { status: 500 });
  }
}
