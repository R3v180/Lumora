import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAchievementProgress } from '@/lib/challenges';

// GET /api/achievements - Get all achievements with player progress
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

    // Get all achievements with player progress
    let achievements = await db.achievement.findMany({
      include: {
        playerAchievements: {
          where: { playerId: player.id },
        },
      },
      orderBy: [{ category: 'asc' }, { requirement: 'asc' }],
    });

    // --- RETROACTIVE SYNC ---
    // Check for "State" based achievements and auto-complete them
    const syncPromises = [];
    
    // 1. Social: Guild Founder/Member
    const guildMember = await db.guildMember.findFirst({ where: { playerId: player.id } });
    if (guildMember) {
      syncPromises.push(updateAchievementProgress(player.id, 'social', 1)); // At least 1 friend/social action
      if (guildMember.role === 'owner') {
        // Find "Founder" achievement and mark progress
      }
    }

    // 2. Exploration: Sanctuary Level
    if (player.sanctuaryLevel > 1) {
      syncPromises.push(updateAchievementProgress(player.id, 'exploration', player.sanctuaryLevel));
    }

    // 3. Collection: Total spirits
    const spiritCount = await db.playerSpirit.count({ where: { playerId: player.id } });
    if (spiritCount > 0) {
      syncPromises.push(updateAchievementProgress(player.id, 'collection', spiritCount));
    }

    if (syncPromises.length > 0) {
      await Promise.all(syncPromises);
      // Re-fetch to get updated progress
      achievements = await db.achievement.findMany({
        include: {
          playerAchievements: {
            where: { playerId: player.id },
          },
        },
        orderBy: [{ category: 'asc' }, { requirement: 'asc' }],
      });
    }

    const result = achievements.map((ach) => {
      const playerAch = ach.playerAchievements[0];
      return {
        id: ach.id,
        name: ach.name,
        nameEn: ach.nameEn,
        description: ach.description,
        descEn: ach.descEn,
        category: ach.category,
        requirement: ach.requirement,
        reward: ach.reward,
        iconUrl: ach.iconUrl,
        progress: playerAch?.progress || 0,
        completed: playerAch?.completed || false,
        completedAt: playerAch?.completedAt || null,
        claimed: playerAch?.claimed || false,
        claimedAt: playerAch?.claimedAt || null,
      };
    });

    // Group by category
    const grouped: Record<string, typeof result> = {};
    for (const ach of result) {
      if (!grouped[ach.category]) {
        grouped[ach.category] = [];
      }
      grouped[ach.category].push(ach);
    }

    const totalCompleted = result.filter((a) => a.completed).length;
    const totalClaimed = result.filter((a) => a.claimed).length;

    return NextResponse.json({
      achievements: result,
      categories: Object.entries(grouped).map(([key, items]) => ({
        key,
        items,
        completed: items.filter((i) => i.completed).length,
        claimed: items.filter((i) => i.claimed).length,
        total: items.length,
      })),
      totalCompleted,
      totalClaimed,
      totalAchievements: result.length,
    });
  } catch (error) {
    console.error('Achievements fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener logros' },
      { status: 500 }
    );
  }
}

// POST /api/achievements - Claim a completed achievement reward
export async function POST(request: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, achievementId } = body;

    if (action !== 'claim' || !achievementId) {
      return NextResponse.json(
        { error: 'Se requiere action=claim y achievementId' },
        { status: 400 }
      );
    }

    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const playerAchievement = await db.playerAchievement.findFirst({
      where: { playerId: player.id, achievementId },
      include: { achievement: true },
    });

    if (!playerAchievement) {
      return NextResponse.json(
        { error: 'Logro no encontrado' },
        { status: 404 }
      );
    }

    if (!playerAchievement.completed) {
      return NextResponse.json(
        { error: 'Logro no completado aún' },
        { status: 400 }
      );
    }

    if (playerAchievement.claimed) {
      return NextResponse.json(
        { error: 'Recompensa ya reclamada' },
        { status: 400 }
      );
    }

    // Claim reward
    const reward = playerAchievement.achievement.reward as any;

    await db.$transaction(async (tx) => {
      await tx.playerAchievement.update({
        where: { id: playerAchievement.id },
        data: { claimed: true, claimedAt: new Date() },
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
          type: 'achievement',
          amount: reward.lumens || 0,
          currency: 'lumens',
          metadata: {
            source: 'achievement_claim',
            achievementId,
            achievementName: playerAchievement.achievement.name,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error('Achievement claim error:', error);
    return NextResponse.json(
      { error: 'Error al reclamar logro' },
      { status: 500 }
    );
  }
}
