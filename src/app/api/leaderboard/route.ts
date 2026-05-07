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
    let orderBy: any;
    let selectFields: any;

    switch (category) {
      case 'level':
        orderBy = { level: 'desc' as const };
        selectFields = {
          id: true,
          displayName: true,
          level: true,
          experience: true,
          sanctuaryLevel: true,
          user: { select: { image: true } },
        };
        break;
      case 'spirits':
        orderBy = { spirits: { _count: 'desc' as const } };
        selectFields = {
          id: true,
          displayName: true,
          level: true,
          sanctuaryLevel: true,
          spirits: { select: { id: true } },
          user: { select: { image: true } },
        };
        break;
      case 'sanctuary':
        orderBy = { sanctuaryLevel: 'desc' as const };
        selectFields = {
          id: true,
          displayName: true,
          level: true,
          sanctuaryLevel: true,
          lumens: true,
          user: { select: { image: true } },
        };
        break;
      case 'lumens':
      default:
        orderBy = { lumens: 'desc' as const };
        selectFields = {
          id: true,
          displayName: true,
          level: true,
          lumens: true,
          sanctuaryLevel: true,
          user: { select: { image: true } },
        };
        break;
    }

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
    let myRank = null;
    if (currentPlayerId) {
      let rankQuery: any;
      const currentPlayer = await db.playerProfile.findUnique({
        where: { id: currentPlayerId },
        select: selectFields,
      });

      if (currentPlayer) {
        switch (category) {
          case 'level':
            rankQuery = await db.playerProfile.count({
              where: {
                level: { gt: currentPlayer.level },
                displayName: { not: '' },
              },
            });
            break;
          case 'spirits':
            rankQuery = await db.playerProfile.count({
              where: {
                spirits: { some: {} },
                displayName: { not: '' },
                id: { not: currentPlayerId },
              },
            });
            // More accurate: count players with more spirits
            const mySpiritCount = currentPlayer.spirits?.length || 0;
            const playersWithMore = await db.$queryRaw`
              SELECT COUNT(*) as count FROM player_profiles pp
              LEFT JOIN player_spirits ps ON pp.id = ps."playerId"
              WHERE pp."displayName" != ''
              GROUP BY pp.id
              HAVING COUNT(ps.id) > ${mySpiritCount}
            `;
            rankQuery = Number((playersWithMore as any[])?.length || 0);
            break;
          case 'sanctuary':
            rankQuery = await db.playerProfile.count({
              where: {
                sanctuaryLevel: { gt: currentPlayer.sanctuaryLevel },
                displayName: { not: '' },
              },
            });
            break;
          default:
            rankQuery = await db.playerProfile.count({
              where: {
                lumens: { gt: currentPlayer.lumens },
                displayName: { not: '' },
              },
            });
            break;
        }
        myRank = rankQuery + 1;
      }
    }

    // Format the leaderboard entries
    const entries = players.map((p, i) => ({
      rank: skip + i + 1,
      id: p.id,
      displayName: p.displayName,
      level: p.level,
      sanctuaryLevel: p.sanctuaryLevel,
      lumens: (p as any).lumens || 0,
      spiritCount: (p as any).spirits?.length || 0,
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
