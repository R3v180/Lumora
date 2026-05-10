import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });
    
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const gameSession = await db.gameSession.findFirst({
      where: { playerId: player.id, type: 'dream_spin' }
    });

    if (!gameSession) {
      return NextResponse.json({ grid: null, availableNudges: 0, canHold: false, holds: [false, false, false, false, false] });
    }

    return NextResponse.json(gameSession.data);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
