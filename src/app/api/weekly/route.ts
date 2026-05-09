import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper to get current week number
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate weekly challenges
async function generateWeeklyChallenges(week: number, year: number) {
  const challenges = [
    {
      name: 'Maestro del Giro',
      nameEn: 'Spin Master',
      description: 'Realiza 500 giros en el Sueño Onírico.',
      descEn: 'Perform 500 spins in the Dream Spin.',
      challengeType: 'spins',
      requirement: 500,
      reward: { lumens: 5000, energy: 200, experience: 1000 },
    },
    {
      name: 'Gran Contribuyente',
      nameEn: 'Great Contributor',
      description: 'Ofrece 1000 puntos elementales al Árbol del Mundo.',
      descEn: 'Offer 1000 elemental points to the World Tree.',
      challengeType: 'world_contribution',
      requirement: 1000,
      reward: { lumens: 10000, experience: 2000 },
    },
    {
      name: 'Explorador Incansable',
      nameEn: 'Tireless Explorer',
      description: 'Saquea 20 santuarios de otros jugadores.',
      descEn: 'Raid 20 sanctuaries from other players.',
      challengeType: 'raids',
      requirement: 20,
      reward: { lumens: 3000, energy: 100, experience: 800 },
    },
    {
      name: 'Coleccionista de Élite',
      nameEn: 'Elite Collector',
      description: 'Consigue 5 nuevos espíritus esta semana.',
      descEn: 'Acquire 5 new spirits this week.',
      challengeType: 'spirits',
      requirement: 5,
      reward: { lumens: 5000, experience: 1500 },
    }
  ];

  const created = [];
  for (const ch of challenges) {
    const c = await db.weeklyChallenge.create({
      data: {
        ...ch,
        weekNumber: week,
        year: year,
      }
    });
    created.push(c);
  }
  return created;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    // Find weekly challenges for this week
    let weeklyChallenges = await db.weeklyChallenge.findMany({
      where: { weekNumber: currentWeek, year: currentYear },
      include: {
        playerChallenges: { where: { playerId: player.id } },
      },
    });

    // If none exist, generate them
    if (weeklyChallenges.length === 0) {
      await generateWeeklyChallenges(currentWeek, currentYear);
      // Re-fetch
      weeklyChallenges = await db.weeklyChallenge.findMany({
        where: { weekNumber: currentWeek, year: currentYear },
        include: {
          playerChallenges: { where: { playerId: player.id } },
        },
      });
    }

    // Ensure player has progress entries
    const playerChallengePromises = weeklyChallenges.map(async (ch) => {
      if (ch.playerChallenges.length === 0) {
        return db.playerWeeklyChallenge.create({
          data: {
            playerId: player.id,
            challengeId: ch.id,
            progress: 0,
          }
        });
      }
    });
    await Promise.all(playerChallengePromises);

    // Final fetch
    const finalChallenges = await db.weeklyChallenge.findMany({
      where: { weekNumber: currentWeek, year: currentYear },
      include: {
        playerChallenges: { where: { playerId: player.id } },
      },
    });

    const result = finalChallenges.map(ch => {
      const pc = ch.playerChallenges[0];
      return {
        ...ch,
        progress: pc?.progress || 0,
        completed: pc?.completed || false,
        claimed: pc?.claimed || false,
      };
    });

    return NextResponse.json({
      challenges: result,
      totalChallenges: result.length,
      completedCount: result.filter(c => c.completed).length,
      claimedCount: result.filter(c => c.claimed).length,
    });

  } catch (error) {
    console.error('Weekly challenges GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await request.json();
    const { challengeId } = body;

    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const playerChallenge = await db.playerWeeklyChallenge.findUnique({
      where: { playerId_challengeId: { playerId: player.id, challengeId } },
      include: { challenge: true }
    });

    if (!playerChallenge) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });
    if (!playerChallenge.completed) return NextResponse.json({ error: 'Desafío no completado' }, { status: 400 });
    if (playerChallenge.claimed) return NextResponse.json({ error: 'Recompensa ya reclamada' }, { status: 400 });

    const reward = playerChallenge.challenge.reward as any;

    await db.$transaction([
      db.playerWeeklyChallenge.update({
        where: { id: playerChallenge.id },
        data: { claimed: true }
      }),
      db.playerProfile.update({
        where: { id: player.id },
        data: {
          lumens: { increment: reward.lumens || 0 },
          energy: { increment: reward.energy || 0 },
          experience: { increment: reward.experience || 0 },
        }
      })
    ]);

    return NextResponse.json({ success: true, reward });

  } catch (error) {
    console.error('Weekly challenges POST error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
