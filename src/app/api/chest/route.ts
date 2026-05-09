import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const chests = await db.playerChest.findMany({
      where: { playerId: player.id, isOpened: false },
      orderBy: { unlocksAt: 'asc' },
    });

    return NextResponse.json({ chests });
  } catch (error) {
    console.error('Chest fetch error:', error);
    return NextResponse.json({ error: 'Error al obtener cofres' }, { status: 500 });
  }
}
