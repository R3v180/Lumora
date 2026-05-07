import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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
    const achievements = await db.achievement.findMany({
      include: {
        playerAchievements: {
          where: { playerId: player.id },
        },
      },
      orderBy: [{ category: 'asc' }, { requirement: 'asc' }],
    });

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

    return NextResponse.json({
      achievements: result,
      categories: Object.entries(grouped).map(([key, items]) => ({
        key,
        items,
        completed: items.filter((i) => i.completed).length,
        total: items.length,
      })),
      totalCompleted,
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
