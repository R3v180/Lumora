import { db } from '@/lib/db';

/**
 * Updates player progress for a specific daily challenge type.
 * @param playerId The player's ID
 * @param challengeType The type of challenge to update (e.g., 'spin_combo', 'merge_spirits')
 * @param amount The amount to increment the progress by (default: 1)
 */
export async function updateChallengeProgress(playerId: string, challengeType: string, amount: number = 1) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the challenge for today
    const challenge = await db.dailyChallenge.findFirst({
      where: {
        challengeType,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!challenge) return;

    // Get or create player challenge
    const playerChallenge = await db.playerDailyChallenge.upsert({
      where: {
        playerId_challengeId: {
          playerId,
          challengeId: challenge.id,
        },
      },
      update: {
        progress: { increment: amount },
      },
      create: {
        playerId,
        challengeId: challenge.id,
        progress: amount,
      },
    });

    // Check for completion
    if (!playerChallenge.completed && playerChallenge.progress + amount >= challenge.requirement) {
      // Re-verify actual current progress since increment just happened in DB
      const current = await db.playerDailyChallenge.findUnique({
        where: { id: playerChallenge.id }
      });
      
      if (current && current.progress >= challenge.requirement) {
        await db.playerDailyChallenge.update({
          where: { id: playerChallenge.id },
          data: { completed: true },
        });
      }
    }
  } catch (error) {
    console.error(`Error updating challenge progress (${challengeType}):`, error);
  }
}

/**
 * Updates player progress for a specific achievement category.
 * @param playerId The player's ID
 * @param category The achievement category (e.g., 'collection', 'combat')
 * @param amount The amount to set the progress to (absolute value)
 */
export async function updateAchievementProgress(playerId: string, category: string, amount: number) {
  try {
    // Find all achievements in this category
    const achievements = await db.achievement.findMany({
      where: { category }
    });

    for (const ach of achievements) {
      // Upsert progress
      const playerAch = await db.playerAchievement.upsert({
        where: {
          playerId_achievementId: {
            playerId,
            achievementId: ach.id,
          },
        },
        update: {
          progress: amount, // For achievements we often set absolute value (like "have 5 spirits")
        },
        create: {
          playerId,
          achievementId: ach.id,
          progress: amount,
        },
      });

      // Check for completion
      if (!playerAch.completed && amount >= ach.requirement) {
        await db.playerAchievement.update({
          where: { id: playerAch.id },
          data: { 
            completed: true,
            completedAt: new Date()
          },
        });
      }
    }
  } catch (error) {
    console.error(`Error updating achievement progress (${category}):`, error);
  }
}
