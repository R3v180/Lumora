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
  { id: 'void', name: 'Devorador del Vacío', nameEn: 'Void Devourer', element: 'fire', maxHp: 50000 },
  { id: 'leviathan', name: 'Leviatán Abisal', nameEn: 'Abyssal Leviathan', element: 'water', maxHp: 60000 },
  { id: 'nightmare', name: 'Pesadilla Eterna', nameEn: 'Eternal Nightmare', element: 'dream', maxHp: 55000 },
  { id: 'colossus', name: 'Coloso de Raíces', nameEn: 'Root Colossus', element: 'nature', maxHp: 45000 },
];

async function getOrCreateActiveBoss() {
  let boss = await db.worldBoss.findFirst({
    where: { status: 'active' },
  });

  if (boss) return boss;

  // Expire any old bosses
  await db.worldBoss.updateMany({
    where: { status: 'active', endsAt: { lte: new Date() } },
    data: { status: 'expired' },
  });

  // Get last boss to avoid repetition
  const lastBoss = await db.worldBoss.findFirst({
    where: { status: { in: ['defeated', 'expired'] } },
    orderBy: { createdAt: 'desc' },
  });

  // Filter templates to get a different one
  const availableTemplates = lastBoss 
    ? BOSS_TEMPLATES.filter(t => t.name !== lastBoss.name)
    : BOSS_TEMPLATES;
    
  const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  const now = new Date();
  const endsAt = new Date(now.getTime() + BOSS_DURATION_HOURS * 60 * 60 * 1000);

  const defeatedCount = await db.worldBoss.count({ where: { status: 'defeated' } });
  const hpMultiplier = 1 + (defeatedCount * 0.5);
  const scaledHp = Math.floor(template.maxHp * hpMultiplier);

  boss = await db.worldBoss.create({
    data: {
      name: template.name,
      nameEn: template.nameEn,
      element: template.element,
      type: template.id, // Store the type for image matching
      maxHp: scaledHp,
      currentHp: scaledHp,
      startsAt: now,
      endsAt,
      status: 'active',
    },
  });

  return boss;
}

// GET: Return active boss + ranking
export async function GET() {
  try {
    const boss = await getOrCreateActiveBoss();

    const ranking = await db.bossDamageLog.findMany({
      where: { bossId: boss.id },
      orderBy: { damage: 'desc' },
      take: 10,
      include: {
        player: { select: { displayName: true, level: true } },
      },
    });

    const topDealers = ranking.map((r, i) => ({
      rank: i + 1,
      playerId: r.playerId,
      displayName: r.player.displayName,
      level: r.player.level,
      totalDamage: r.damage,
    }));

    return NextResponse.json({
      boss: {
        id: boss.id,
        name: boss.name,
        nameEn: boss.nameEn,
        element: boss.element,
        type: (boss as any).type || boss.element, // Fallback to element
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

// POST: Attack boss
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { multiplier = 1 } = await request.json();
    const validatedMultiplier = [1, 3, 5, 10].includes(multiplier) ? multiplier : 1;
    const energyCost = BOSS_ENERGY_COST * validatedMultiplier;

    const userId = (session.user as any).id;
    const ELEMENTS = ['fire', 'water', 'nature', 'dream', 'star'];
    const spins = Array.from({ length: 5 }, () => ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]);

    const player = await db.playerProfile.findUnique({
      where: { userId },
    });

    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    if (player.energy < energyCost) return NextResponse.json({ error: 'Energía insuficiente' }, { status: 400 });

    const boss = await db.worldBoss.findFirst({ where: { status: 'active' } });
    if (!boss) return NextResponse.json({ error: 'No hay jefe activo' }, { status: 404 });

    // Calculate base damage
    const damageMultiplier = validatedMultiplier === 10 ? 1.1 : 1.0; // 10% bonus for x10
    const baseDamagePerSpin = (player.level * 500 * validatedMultiplier * damageMultiplier) / 5;
    
    let totalDamage = 0;
    let hasAdvantage = false;

    for (const spinElement of spins) {
      let dmg = baseDamagePerSpin;
      if (ELEMENT_ADVANTAGE[spinElement] === boss.element) {
        dmg *= 2;
        hasAdvantage = true;
      } else if (spinElement === 'star') {
        dmg *= 1.5;
      }
      // RNG variance ±15% (more stable)
      const rng = 0.85 + Math.random() * 0.3;
      totalDamage += Math.floor(dmg * rng);
    }

    const result = await db.$transaction(async (tx) => {
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { energy: { decrement: energyCost } },
      });

      const updatedBoss = await tx.worldBoss.update({
        where: { id: boss.id },
        data: { currentHp: { decrement: Math.min(totalDamage, boss.currentHp) } },
      });

      const existingLog = await tx.bossDamageLog.findFirst({
        where: { bossId: boss.id, playerId: player.id },
      });

      let finalPlayerDamage = totalDamage;
      if (existingLog) {
        const updatedLog = await tx.bossDamageLog.update({
          where: { id: existingLog.id },
          data: { damage: { increment: totalDamage }, spiritsUsed: spins },
        });
        finalPlayerDamage = updatedLog.damage;
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

      const lumensReward = Math.floor(totalDamage / 10);
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { lumens: { increment: lumensReward } },
      });

      let playerRank = '-';
      if (updatedBoss.currentHp <= 0) {
        await tx.worldBoss.update({
          where: { id: boss.id },
          data: { status: 'defeated', currentHp: 0 },
        });

        const allLogs = await tx.bossDamageLog.findMany({
          where: { bossId: boss.id },
          orderBy: { damage: 'desc' },
        });
        
        const rankIndex = allLogs.findIndex(l => l.playerId === player.id);
        playerRank = rankIndex !== -1 ? (rankIndex + 1).toString() : '-';

        // Distribute chests... (simplified for now to keep focus)
      }

      return {
        spins,
        damage: totalDamage,
        bossHp: Math.max(0, updatedBoss.currentHp),
        defeated: updatedBoss.currentHp <= 0,
        lumensReward,
        newEnergy: player.energy - energyCost,
        newLumens: player.lumens + lumensReward,
        playerTotalDamage: finalPlayerDamage,
        playerRank,
      };
    });

    return NextResponse.json({ ...result, hasAdvantage });
  } catch (error) {
    console.error('Boss POST error:', error);
    return NextResponse.json({ error: 'Error al atacar al jefe' }, { status: 500 });
  }
}
