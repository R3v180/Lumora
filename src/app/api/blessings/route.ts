import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/blessings - Get player's blessing data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { blessings: { orderBy: { day: 'desc' } } },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Blessings should exist (created on registration), but create if missing
    if (player.blessings.length === 0) {
      const blessing = await db.blessing.create({
        data: {
          playerId: player.id,
          day: 1,
          claimed: false,
          lastClaimAt: new Date(),
        },
      });
      player.blessings = [blessing];
    }

    const currentBlessing = player.blessings[0];

    // Calculate if today's blessing can be claimed
    const now = new Date();
    const lastClaim = new Date(currentBlessing.lastClaimAt);
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    const canClaim = !currentBlessing.claimed && hoursSinceLastClaim >= 20; // Can claim after 20h

    // If claimed and 20+ hours passed, advance to next day
    const readyForNextDay = currentBlessing.claimed && hoursSinceLastClaim >= 20;

    // Calculate streak - check if the last claim was within the last 48h
    const isStreakActive = hoursSinceLastClaim < 48;

    // Blessings reward schedule (7-day cycle)
    const BLESSING_REWARDS = [
      { day: 1, lumens: 100, energy: 20 },
      { day: 2, lumens: 150, energy: 0 },
      { day: 3, lumens: 200, energy: 30 },
      { day: 4, lumens: 250, energy: 0 },
      { day: 5, lumens: 300, energy: 40 },
      { day: 6, lumens: 400, energy: 0 },
      { day: 7, lumens: 500, energy: 50, isMega: true }, // Mega blessing on day 7
    ];

    const currentReward = BLESSING_REWARDS.find(
      (r) => r.day === ((currentBlessing.day - 1) % 7) + 1
    ) || BLESSING_REWARDS[0];

    const nextReward = BLESSING_REWARDS.find(
      (r) => r.day === (currentBlessing.day % 7) + 1
    ) || BLESSING_REWARDS[0];

    return NextResponse.json({
      day: currentBlessing.day,
      displayDay: ((currentBlessing.day - 1) % 7) + 1,
      cycleDay: ((currentBlessing.day - 1) % 7) + 1,
      claimed: currentBlessing.claimed,
      canClaim: canClaim || readyForNextDay,
      readyForNextDay,
      isStreakActive,
      streak: isStreakActive ? currentBlessing.day : 0,
      currentReward,
      nextReward,
      lastClaimAt: currentBlessing.lastClaimAt,
      hoursSinceLastClaim: Math.round(hoursSinceLastClaim * 10) / 10,
      hoursUntilNext: Math.max(0, Math.round((20 - hoursSinceLastClaim) * 10) / 10),
      blessingSchedule: BLESSING_REWARDS,
    });
  } catch (error) {
    console.error('Blessings fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener bendiciones' },
      { status: 500 }
    );
  }
}

// POST /api/blessings - Claim daily blessing
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { blessings: { orderBy: { day: 'desc' } } },
    });

    if (!player || player.blessings.length === 0) {
      return NextResponse.json({ error: 'Bendición no encontrada' }, { status: 404 });
    }

    const currentBlessing = player.blessings[0];

    // Check if can claim
    const now = new Date();
    const lastClaim = new Date(currentBlessing.lastClaimAt);
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

    if (currentBlessing.claimed && hoursSinceLastClaim < 20) {
      return NextResponse.json(
        { error: 'Ya reclamaste tu bendición hoy', hoursUntilNext: Math.round((20 - hoursSinceLastClaim) * 10) / 10 },
        { status: 400 }
      );
    }

    // Blessings reward schedule
    const BLESSING_REWARDS: Record<number, { lumens: number; energy: number; isMega?: boolean }> = {
      1: { lumens: 100, energy: 20 },
      2: { lumens: 150, energy: 0 },
      3: { lumens: 200, energy: 30 },
      4: { lumens: 250, energy: 0 },
      5: { lumens: 300, energy: 40 },
      6: { lumens: 400, energy: 0 },
      7: { lumens: 500, energy: 50, isMega: true },
    };

    const cycleDay = ((currentBlessing.day - 1) % 7) + 1;
    const reward = BLESSING_REWARDS[cycleDay] || BLESSING_REWARDS[1];

    // Determine next day
    const isStreakActive = hoursSinceLastClaim < 48;
    const nextDay = isStreakActive ? currentBlessing.day + 1 : 1; // Reset streak if >48h

    // Claim in transaction
    await db.$transaction(async (tx) => {
      // Mark current blessing as claimed
      await tx.blessing.update({
        where: { id: currentBlessing.id },
        data: {
          claimed: true,
          lastClaimAt: now,
        },
      });

      // Give rewards
      const updateData: any = {
        lumens: { increment: reward.lumens },
      };

      if (reward.energy > 0) {
        const newEnergy = Math.min(player.energy + reward.energy, player.maxEnergy);
        updateData.energy = newEnergy;
      }

      await tx.playerProfile.update({
        where: { id: player.id },
        data: updateData,
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'daily',
          amount: reward.lumens,
          currency: 'lumens',
          metadata: {
            source: 'blessing',
            day: currentBlessing.day,
            cycleDay,
            energyReward: reward.energy,
            isMega: reward.isMega || false,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      day: currentBlessing.day,
      cycleDay,
      nextDay,
      reward: {
        lumens: reward.lumens,
        energy: reward.energy,
        isMega: reward.isMega || false,
      },
      isStreakActive,
      streakBroken: !isStreakActive,
      nextCycleDay: ((nextDay - 1) % 7) + 1,
    });
  } catch (error) {
    console.error('Blessing claim error:', error);
    return NextResponse.json(
      { error: 'Error al reclamar bendición' },
      { status: 500 }
    );
  }
}
