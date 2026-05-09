import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/leaderboard - Global rankings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Leaderboard is public but we show player's rank if logged in
    let currentPlayerId: string | null = null;

    if (session?.user) {
      const userId = (session.user as any).id;
      const player = await db.playerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      currentPlayerId = player?.id || null;
    }

    const category = request.nextUrl.searchParams.get('category') || 'lumens';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Determine sort field based on category
    const orderBy: any =
      category === 'level' ? { level: 'desc' as const }
      : category === 'spirits' ? { spirits: { _count: 'desc' as const } }
      : category === 'sanctuary' ? { sanctuaryLevel: 'desc' as const }
      : { lumens: 'desc' as const };

    // Common base select (always safe to access)
    const selectFields = {
      id: true,
      displayName: true,
      level: true,
      lumens: true,
      sanctuaryLevel: true,
      spirits: category === 'spirits' ? { select: { id: true } } : undefined,
      experience: category === 'level' ? true : undefined,
      user: { select: { image: true } },
    } as const;

    // Get top players
    const players = await db.playerProfile.findMany({
      where: { displayName: { not: '' } },
      select: selectFields,
      orderBy,
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await db.playerProfile.count({
      where: { displayName: { not: '' } },
    });

    // Get current player's rank
    let myRank: number | null = null;
    if (currentPlayerId) {
      const currentPlayer = await db.playerProfile.findUnique({
        where: { id: currentPlayerId },
        select: {
          id: true,
          level: true,
          lumens: true,
          sanctuaryLevel: true,
          _count: { select: { spirits: true } },
        },
      });

      if (currentPlayer) {
        let rankCount = 0;
        if (category === 'level') {
          rankCount = await db.playerProfile.count({
            where: { level: { gt: currentPlayer.level }, displayName: { not: '' } },
          });
        } else if (category === 'spirits') {
          const mySpiritCount = currentPlayer._count.spirits;
          const playersWithMore = await db.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(DISTINCT pp.id)::bigint as count
            FROM "PlayerProfile" pp
            LEFT JOIN "PlayerSpirit" ps ON pp.id = ps."playerId"
            WHERE pp."displayName" != ''
            GROUP BY pp.id
            HAVING COUNT(ps.id) > ${mySpiritCount}
          `;
          rankCount = Number(playersWithMore[0]?.count ?? 0);
        } else if (category === 'sanctuary') {
          rankCount = await db.playerProfile.count({
            where: { sanctuaryLevel: { gt: currentPlayer.sanctuaryLevel }, displayName: { not: '' } },
          });
        } else {
          rankCount = await db.playerProfile.count({
            where: { lumens: { gt: currentPlayer.lumens }, displayName: { not: '' } },
          });
        }
        myRank = rankCount + 1;
      }
    }

    // Format the leaderboard entries
    const entries = (players as any[]).map((p, i) => ({
      rank: skip + i + 1,
      id: p.id,
      displayName: p.displayName,
      level: p.level,
      sanctuaryLevel: p.sanctuaryLevel,
      lumens: p.lumens || 0,
      spiritCount: p.spirits?.length || 0,
      avatar: p.user?.image || null,
      isMe: p.id === currentPlayerId,
    }));

    return NextResponse.json({
      category,
      entries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      myRank,
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener clasificación' },
      { status: 500 }
    );
  }
}
