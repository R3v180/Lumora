import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/daily - Get today's daily challenges with player progress
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Get today's challenges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyChallenges = await db.dailyChallenge.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        playerChallenges: {
          where: { playerId: player.id },
        },
      },
    });

    // If no challenges exist for today, generate them
    if (dailyChallenges.length === 0) {
      dailyChallenges = await generateDailyChallenges(today);
    }

    const result = dailyChallenges.map((ch) => {
      const playerCh = ch.playerChallenges[0];
      return {
        id: ch.id,
        name: ch.name,
        nameEn: ch.nameEn,
        description: ch.description,
        descEn: ch.descEn,
        challengeType: ch.challengeType,
        requirement: ch.requirement,
        reward: ch.reward,
        progress: playerCh?.progress || 0,
        completed: playerCh?.completed || false,
        claimed: playerCh?.claimed || false,
      };
    });

    const completedCount = result.filter((c) => c.completed).length;
    const claimedCount = result.filter((c) => c.claimed).length;

    return NextResponse.json({
      challenges: result,
      completedCount,
      claimedCount,
      totalChallenges: result.length,
      allClaimed: result.every((c) => c.claimed),
    });
  } catch (error) {
    console.error('Daily challenges fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener desafíos diarios' },
      { status: 500 }
    );
  }
}

// POST /api/daily - Claim a completed daily challenge reward
export async function POST(request: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Se requiere challengeId' },
        { status: 400 }
      );
    }

    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const playerChallenge = await db.playerDailyChallenge.findFirst({
      where: { playerId: player.id, challengeId },
      include: { challenge: true },
    });

    if (!playerChallenge) {
      return NextResponse.json(
        { error: 'Desafío no encontrado' },
        { status: 404 }
      );
    }

    if (!playerChallenge.completed) {
      return NextResponse.json(
        { error: 'Desafío no completado aún' },
        { status: 400 }
      );
    }

    if (playerChallenge.claimed) {
      return NextResponse.json(
        { error: 'Recompensa ya reclamada' },
        { status: 400 }
      );
    }

    // Claim reward
    const reward = playerChallenge.challenge.reward as any;

    await db.$transaction(async (tx) => {
      await tx.playerDailyChallenge.update({
        where: { id: playerChallenge.id },
        data: { claimed: true },
      });

      const updateData: any = {};
      if (reward.lumens) {
        updateData.lumens = { increment: reward.lumens };
      }
      if (reward.energy) {
        updateData.energy = Math.min(player.energy + reward.energy, player.maxEnergy);
      }
      if (reward.experience) {
        updateData.experience = player.experience + reward.experience;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: updateData,
        });
      }

      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'daily',
          amount: reward.lumens || 0,
          currency: 'lumens',
          metadata: { source: 'daily_challenge', challengeId, challengeName: playerChallenge.challenge.name },
        },
      });
    });

    return NextResponse.json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error('Daily challenge claim error:', error);
    return NextResponse.json(
      { error: 'Error al reclamar desafío' },
      { status: 500 }
    );
  }
}

async function generateDailyChallenges(date: Date) {
  const challengeTemplates = [
    {
      name: 'Giro Matutino',
      nameEn: 'Morning Spin',
      description: 'Realiza 5 giros oníricos',
      descEn: 'Perform 5 dream spins',
      challengeType: 'spin_combo',
      requirement: 5,
      reward: { lumens: 100, experience: 25 },
    },
    {
      name: 'Coleccionista Diario',
      nameEn: 'Daily Collector',
      description: 'Consigue 3 espíritus en un día',
      descEn: 'Obtain 3 spirits in a day',
      challengeType: 'collect_spirit',
      requirement: 3,
      reward: { lumens: 200, experience: 50 },
    },
    {
      name: 'Generoso con Lumora',
      nameEn: 'Lumora Generous',
      description: 'Contribuye 50 puntos elementales al mundo',
      descEn: 'Contribute 50 elemental points to the world',
      challengeType: 'world_contribution',
      requirement: 50,
      reward: { lumens: 150, experience: 40 },
    },
    {
      name: 'Fusionador Experto',
      nameEn: 'Expert Merger',
      description: 'Fusiona 2 espíritus',
      descEn: 'Merge 2 spirits',
      challengeType: 'merge_spirits',
      requirement: 2,
      reward: { lumens: 175, experience: 30 },
    },
  ];

  const challenges = [];
  for (let i = 0; i < challengeTemplates.length; i++) {
    const template = challengeTemplates[i];
    const challenge = await db.dailyChallenge.create({
      data: {
        name: template.name,
        nameEn: template.nameEn,
        description: template.description,
        descEn: template.descEn,
        challengeType: template.challengeType,
        requirement: template.requirement,
        reward: template.reward,
        date,
      },
    });
    challenges.push({ ...challenge, playerChallenges: [] });
  }

  return challenges;
}
