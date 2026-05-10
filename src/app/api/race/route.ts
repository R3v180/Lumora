import { NextResponse } from 'next/server'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const RACE_DURATION_MINUTES = 15;
const ELEMENTS = ['fire', 'water', 'nature', 'dream', 'star'];

function getMissionElement(raceId: string) {
  // Deterministic element based on ID to avoid adding field to DB
  const charCodeSum = raceId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ELEMENTS[charCodeSum % ELEMENTS.length];
}

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

  const newRace = await db.spinRace.create({
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

  return newRace;
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
      select: { id: true, level: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const race = await getOrCreateActiveRace();
    if (!race) {
        return NextResponse.json({ error: 'No se pudo obtener/crear carrera' }, { status: 500 });
    }

    // Find player's entry
    const myEntry = await db.spinRaceEntry.findUnique({
      where: { raceId_playerId: { raceId: race.id, playerId: player.id } },
    });

    // Calculate player position
    const entriesAbove = myEntry
      ? await db.spinRaceEntry.count({
          where: { raceId: race.id, score: { gt: myEntry.score } },
        })
      : 0;

    // HIBRID RANKING: Real entries + Bots
    let finalRanking = race.entries.map((e) => ({
      rank: 0,
      displayName: e.player.displayName,
      level: e.player.level,
      score: e.score,
      isYou: e.playerId === player.id,
    }));

    // If player is NOT in the top 10 but has a score, add them
    if (myEntry && !finalRanking.some(r => r.isYou)) {
      finalRanking.push({
        rank: 0,
        displayName: session.user.name || 'Tú',
        level: player.level,
        score: myEntry.score,
        isYou: true
      } as any);
    }

    // Add bots to fill space (at least 5 competitors)
    const bots = [
      { displayName: 'ShadowRunner', level: 12, score: 1250, isYou: false },
      { displayName: 'NeonSpirit', level: 8, score: 840, isYou: false },
      { displayName: 'LumoraKing', level: 25, score: 3100, isYou: false },
      { displayName: 'MysticLeaf', level: 5, score: 420, isYou: false },
    ];
    
    bots.forEach(bot => {
      if (finalRanking.length < 10 && !finalRanking.some(r => r.displayName === bot.displayName)) {
        finalRanking.push(bot as any);
      }
    });

    // Sort by score
    finalRanking.sort((a, b) => b.score - a.score);
    finalRanking = finalRanking.map((r, i) => ({ ...r, rank: i + 1 }));

    // Find my final position in this list
    const myFinalPos = finalRanking.findIndex(r => r.isYou) + 1;

    return NextResponse.json({
      race: {
        id: race.id,
        startsAt: race.startsAt.toISOString(),
        endsAt: race.endsAt.toISOString(),
        status: race.status,
        timeLeftMs: race.endsAt.getTime() - Date.now(),
        missionElement: getMissionElement(race.id),
      },
      myScore: myEntry?.score || 0,
      myPosition: myFinalPos || entriesAbove + 1 || null,
      ranking: finalRanking,
    });
  } catch (error) {
    console.error('Race GET error:', error);
    return NextResponse.json({ error: 'Error loading race' }, { status: 500 });
  }
}
