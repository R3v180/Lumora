import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const BOSS_ENERGY_COST = 10;
const BOSS_DURATION_HOURS = 24;

const ELEMENT_ADVANTAGE: Record<string, string> = {
  fire: 'nature',
  nature: 'water',
  water: 'fire',
  dream: 'star',
  star: 'dream',
};

const BOSS_TEMPLATES = [
  { name: 'Devorador del Vacío', nameEn: 'Void Devourer', element: 'fire', maxHp: 50000 },
  { name: 'Leviatán Abisal', nameEn: 'Abyssal Leviathan', element: 'water', maxHp: 60000 },
  { name: 'Pesadilla Eterna', nameEn: 'Eternal Nightmare', element: 'dream', maxHp: 55000 },
  { name: 'Coloso de Raíces', nameEn: 'Root Colossus', element: 'nature', maxHp: 45000 },
  { name: 'Fragmento Estelar', nameEn: 'Stellar Fragment', element: 'star', maxHp: 70000 },
];

async function getOrCreateActiveBoss() {
  // Check for active boss
  let boss = await db.worldBoss.findFirst({
    where: { status: 'active' },
    include: {
      damageLogs: {
        orderBy: { damage: 'desc' },
        take: 10,
        include: {
          player: { select: { displayName: true, level: true } },
        },
      },
    },
  });

  if (boss) return boss;

  // Expire any old bosses
  await db.worldBoss.updateMany({
    where: { status: 'active', endsAt: { lte: new Date() } },
    data: { status: 'expired' },
  });

  // Create new boss
  const template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
  const now = new Date();
  const endsAt = new Date(now.getTime() + BOSS_DURATION_HOURS * 60 * 60 * 1000);

  // Scale HP based on number of defeated bosses
  const defeatedCount = await db.worldBoss.count({ where: { status: 'defeated' } });
  const hpMultiplier = 1 + (defeatedCount * 0.5); // 50% more HP per defeated boss
  const scaledHp = Math.floor(template.maxHp * hpMultiplier);

  boss = await db.worldBoss.create({
    data: {
      name: template.name,
      nameEn: template.nameEn,
      element: template.element,
      maxHp: scaledHp,
      currentHp: scaledHp,
      startsAt: now,
      endsAt,
      status: 'active',
    },
    include: {
      damageLogs: {
        orderBy: { damage: 'desc' },
        take: 10,
        include: {
          player: { select: { displayName: true, level: true } },
        },
      },
    },
  });

  return boss;
}

// GET: Return active boss + ranking
export async function GET() {
  try {
    const boss = await getOrCreateActiveBoss();

    // Aggregate top 10 damage dealers
    const ranking = await db.bossDamageLog.groupBy({
      by: ['playerId'],
      where: { bossId: boss.id },
      _sum: { damage: true },
      orderBy: { _sum: { damage: 'desc' } },
      take: 10,
    });

    // Fetch player names for ranking
    const playerIds = ranking.map((r) => r.playerId);
    const players = await db.playerProfile.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, displayName: true, level: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const topDealers = ranking.map((r, i) => ({
      rank: i + 1,
      playerId: r.playerId,
      displayName: playerMap.get(r.playerId)?.displayName || 'Unknown',
      level: playerMap.get(r.playerId)?.level || 1,
      totalDamage: r._sum.damage || 0,
    }));

    return NextResponse.json({
      boss: {
        id: boss.id,
        name: boss.name,
        nameEn: boss.nameEn,
        element: boss.element,
        maxHp: boss.maxHp,
        currentHp: boss.currentHp,
        status: boss.status,
        endsAt: boss.endsAt.toISOString(),
        timeLeftMs: boss.endsAt.getTime() - Date.now(),
      },
      ranking: topDealers,
    });
  } catch (error) {
    console.error('Boss GET error:', error);
    return NextResponse.json({ error: 'Error loading boss' }, { status: 500 });
  }
}

// POST: Attack boss with 3 spirits
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    // Generate 5 random spins
    const ELEMENTS = ['fire', 'water', 'nature', 'dream', 'star'];
    const spins = Array.from({ length: 5 }, () => ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]);

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: {
        spirits: { include: { spiritType: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Check energy
    if (player.energy < BOSS_ENERGY_COST) {
      return NextResponse.json({ error: 'Energía insuficiente' }, { status: 400 });
    }

    // Validate spirits belong to player
    // Base damage per spin based on player level
    const baseDamage = player.level * 250;

    // Get active boss
    const boss = await db.worldBoss.findFirst({ where: { status: 'active' } });
    if (!boss) {
      return NextResponse.json({ error: 'No hay jefe activo' }, { status: 404 });
    }

    // Calculate damage
    let totalDamage = 0;
    let hasAdvantage = false;

    for (const spinElement of spins) {
      let dmg = baseDamage;

      // Elemental advantage: x2
      if (ELEMENT_ADVANTAGE[spinElement] === boss.element) {
        dmg *= 2;
        hasAdvantage = true;
      } else if (spinElement === 'star') {
        dmg *= 1.5; // Star is always good
      }

      // RNG variance ±20%
      const rng = 0.8 + Math.random() * 0.4;
      dmg = Math.floor(dmg * rng);

      totalDamage += dmg;
    }

    // Apply damage in transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct energy
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { energy: { decrement: BOSS_ENERGY_COST } },
      });

      // Apply damage to boss
      const updatedBoss = await tx.worldBoss.update({
        where: { id: boss.id },
        data: { currentHp: { decrement: Math.min(totalDamage, boss.currentHp) } },
      });

      // Log damage FIRST so it's included in rankings
      // Wait, BossDamageLog has a unique constraint @@unique([bossId, playerId])
      // So we must upsert.
      const existingLog = await tx.bossDamageLog.findFirst({
        where: { bossId: boss.id, playerId: player.id },
      });

      if (existingLog) {
        await tx.bossDamageLog.update({
          where: { id: existingLog.id },
          data: { damage: { increment: totalDamage }, spiritsUsed: spins },
        });
      } else {
        await tx.bossDamageLog.create({
          data: {
            bossId: boss.id,
            playerId: player.id,
            damage: totalDamage,
            spiritsUsed: spins,
          },
        });
      }

      // Check if boss defeated
      if (updatedBoss.currentHp <= 0) {
        await tx.worldBoss.update({
          where: { id: boss.id },
          data: { status: 'defeated', currentHp: 0 },
        });

        // Get rankings to distribute chests
        const rankings = await tx.bossDamageLog.findMany({
          where: { bossId: boss.id },
          orderBy: { damage: 'desc' },
        });

        const chestsData = rankings.map((r, i) => {
          let rarity = 'common';
          let hours = 2; // Common unlock time
          
          if (i === 0) { rarity = 'legendary'; hours = 24; }
          else if (i < 3) { rarity = 'epic'; hours = 12; }
          else if (i < 10) { rarity = 'rare'; hours = 6; }
          
          return {
            playerId: r.playerId,
            type: 'boss',
            rarity,
            unlocksAt: new Date(Date.now() + hours * 60 * 60 * 1000),
          };
        });

        if (chestsData.length > 0) {
          await (tx as any).playerChest.createMany({ data: chestsData });
        }
      }

      // Reward lumens based on damage
      const lumensReward = Math.floor(totalDamage / 10);
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { lumens: { increment: lumensReward } },
      });

      return {
        spins,
        damage: totalDamage,
        bossHp: Math.max(0, updatedBoss.currentHp),
        defeated: updatedBoss.currentHp <= 0,
        lumensReward,
        newEnergy: player.energy - BOSS_ENERGY_COST,
        newLumens: player.lumens + lumensReward,
      };
    });

    return NextResponse.json({
      ...result,
      hasAdvantage,
    });
  } catch (error) {
    console.error('Boss POST error:', error);
    return NextResponse.json({ error: 'Error al atacar al jefe' }, { status: 500 });
  }
}
