import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_DAMAGE_RANGE = [5000, 25000];
const BOT_RACE_SCORE_RANGE = [100, 500];

export async function POST() {
  try {
    // Get all bots (users with 'bot_' in id or email)
    const bots = await db.playerProfile.findMany({
      where: { userId: { startsWith: 'bot_' } },
      take: 10, // Simulate 10 bots at a time
      orderBy: { lastLoginAt: 'asc' }, // Get the least recently active ones
    });

    if (bots.length === 0) {
      return NextResponse.json({ message: 'No bots found' }, { status: 404 });
    }

    const now = new Date();
    
    // Simulate Boss Damage
    const activeBoss = await db.worldBoss.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (activeBoss) {
      for (const bot of bots) {
        if (Math.random() > 0.5) { // 50% chance to attack boss
          const damage = Math.floor(Math.random() * (BOT_DAMAGE_RANGE[1] - BOT_DAMAGE_RANGE[0]) + BOT_DAMAGE_RANGE[0]);
          
          await db.bossDamageLog.create({
            data: { bossId: activeBoss.id, playerId: bot.id, damage, spiritsUsed: ['fire', 'water', 'star'] }
          });
          
          await db.worldBoss.update({
            where: { id: activeBoss.id },
            data: { currentHp: { decrement: damage } }
          });
        }
      }
    }

    // Simulate Race Participation
    const activeRace = await db.spinRace.findFirst({
      where: { status: 'active', endsAt: { gt: now } },
      orderBy: { startsAt: 'desc' }
    });

    if (activeRace) {
      for (const bot of bots) {
        if (Math.random() > 0.3) { // 70% chance to race
          const score = Math.floor(Math.random() * (BOT_RACE_SCORE_RANGE[1] - BOT_RACE_SCORE_RANGE[0]) + BOT_RACE_SCORE_RANGE[0]);
          await db.spinRaceEntry.upsert({
            where: { raceId_playerId: { raceId: activeRace.id, playerId: bot.id } },
            create: { raceId: activeRace.id, playerId: bot.id, score },
            update: { score: { increment: score } }
          });
        }
      }
    }

    // Simulate Arena Match against random players
    const humanPlayers = await db.playerProfile.findMany({
      where: { NOT: { userId: { startsWith: 'bot_' } } },
      take: 5
    });

    for (const bot of bots) {
      if (Math.random() > 0.7 && humanPlayers.length > 0) { // 30% chance to attack a human in arena
        const target = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
        const botWins = Math.random() > 0.5;
        const ratingChange = 15;

        await db.arenaMatch.create({
          data: {
            attackerId: bot.id,
            defenderId: target.id,
            attackerSpirits: bot.arenaDefenseTeam || [],
            defenderSpirits: target.arenaDefenseTeam || [],
            winnerId: botWins ? bot.id : target.id,
            ratingChange,
          }
        });

        // Update ratings
        await db.playerProfile.update({
          where: { id: bot.id },
          data: { arenaRating: { [botWins ? 'increment' : 'decrement']: ratingChange } }
        });

        await db.playerProfile.update({
          where: { id: target.id },
          data: { arenaRating: { [botWins ? 'decrement' : 'increment']: ratingChange } }
        });
      }

      // Update bot login time
      await db.playerProfile.update({
        where: { id: bot.id },
        data: { lastLoginAt: now }
      });
    }

    return NextResponse.json({ message: 'Bot activity simulated successfully', botsSimulated: bots.length });
  } catch (error) {
    console.error('Error simulating bot activity:', error);
    return NextResponse.json({ error: 'Failed to simulate activity' }, { status: 500 });
  }
}
