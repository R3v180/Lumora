import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/search?q=displayName - Search players by name
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'La búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const results = await db.playerProfile.findMany({
      where: {
        displayName: { contains: query.trim(), mode: 'insensitive' },
        id: { not: player.id }, // Exclude self
      },
      select: {
        id: true,
        displayName: true,
        level: true,
        sanctuaryLevel: true,
        user: { select: { image: true } },
        _count: { select: { spirits: true } },
      },
      take: 15,
      orderBy: { level: 'desc' },
    });

    // Check friendship status for each result
    const resultsWithStatus = await Promise.all(
      results.map(async (r) => {
        const friendship = await db.friendship.findFirst({
          where: {
            OR: [
              { player1Id: player.id, player2Id: r.id },
              { player1Id: r.id, player2Id: player.id },
            ],
          },
          select: { id: true, status: true },
        });

        return {
          id: r.id,
          displayName: r.displayName,
          level: r.level,
          sanctuaryLevel: r.sanctuaryLevel,
          avatar: r.user?.image || null,
          spiritCount: r._count.spirits,
          friendshipStatus: friendship?.status || null,
          friendshipId: friendship?.id || null,
        };
      })
    );

    return NextResponse.json({ results: resultsWithStatus });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Error al buscar jugadores' },
      { status: 500 }
    );
  }
}
