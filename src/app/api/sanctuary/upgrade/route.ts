import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get Player
    const player = await db.playerProfile.findUnique({
      where: { userId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const currentLevel = player.sanctuaryLevel;
    const cost = currentLevel * 2000;

    if (player.lumens < cost) {
      return NextResponse.json({ error: 'No tienes suficientes Lumens' }, { status: 400 });
    }

    // Deduct lumens and increment level
    const updatedPlayer = await db.playerProfile.update({
      where: { id: player.id },
      data: {
        lumens: { decrement: cost },
        sanctuaryLevel: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      newLevel: updatedPlayer.sanctuaryLevel,
      newLumens: updatedPlayer.lumens,
    });
  } catch (error) {
    console.error('Sanctuary upgrade error:', error);
    return NextResponse.json(
      { error: 'Error al mejorar el Santuario' },
      { status: 500 }
    );
  }
}
