import { NextResponse } from 'next/server'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const RACE_DURATION_MINUTES = 15;

async function getOrCreateActiveRace() {
  const now = new Date();

  // Find active race
  let race = await db.spinRace.findFirst({
    where: { status: 'active', endsAt: { gt: now } },
    include: {
      entries: {
        orderBy: { score: 'desc' },
        take: 10,
        include: {
          player: { select: { displayName: true, level: true } },
        },
      },
    },
  });

  if (race) return race;

  // Complete expired races
  await db.spinRace.updateMany({
    where: { status: 'active', endsAt: { lte: now } },
    data: { status: 'completed' },
  });

  // Create a new race
  const startsAt = now;
  const endsAt = new Date(now.getTime() + RACE_DURATION_MINUTES * 60 * 1000);

  race = await db.spinRace.create({
    data: { startsAt, endsAt, status: 'active' },
    include: {
      entries: {
        orderBy: { score: 'desc' },
        take: 10,
        include: {
          player: { select: { displayName: true, level: true } },
        },
      },
    },
  });

  return race;
}

// GET: Return active race + ranking
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const race = await getOrCreateActiveRace();

    // Find player's entry
    const myEntry = await db.spinRaceEntry.findUnique({
      where: { raceId_playerId: { raceId: race.id, playerId: player.id } },
    });

    // Calculate player position
    const entriesAbove = myEntry
      ? await db.spinRaceEntry.count({
          where: { raceId: race.id, score: { gt: myEntry.score } },
        })
      : null;

    return NextResponse.json({
      race: {
        id: race.id,
        startsAt: race.startsAt.toISOString(),
        endsAt: race.endsAt.toISOString(),
        status: race.status,
        timeLeftMs: race.endsAt.getTime() - Date.now(),
      },
      myScore: myEntry?.score || 0,
      myPosition: entriesAbove !== null ? entriesAbove + 1 : null,
      ranking: race.entries.map((e, i) => ({
        rank: i + 1,
        displayName: e.player.displayName,
        level: e.player.level,
        score: e.score,
        isYou: e.playerId === player.id,
      })),
    });
  } catch (error) {
    console.error('Race GET error:', error);
    return NextResponse.json({ error: 'Error loading race' }, { status: 500 });
  }
}
