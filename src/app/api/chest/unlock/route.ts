import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { chestId } = await req.json();

    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const chest = await db.playerChest.findUnique({ where: { id: chestId } });
    if (!chest || chest.playerId !== player.id || chest.status !== 'locked' || chest.isOpened) {
      return NextResponse.json({ error: 'Cofre no disponible para desbloquear' }, { status: 400 });
    }

    const now = new Date();
    
    // Get World Tree Dominant Aura (Dream reduces chest time)
    let finalDurationMs = chest.durationMs;
    const worldState = await db.worldState.findUnique({ where: { id: 'lumora_world' } });
    if (worldState) {
      const { getDominantElement, getDominantAura } = await import('@/lib/worldTree');
      const dominant = getDominantElement(worldState);
      const dominantAura = getDominantAura(dominant, worldState.treeLevel);
      
      if (dominantAura && dominantAura.type === 'chestTimeReduction') {
        finalDurationMs = Math.floor(finalDurationMs * (1 - dominantAura.value));
      }
    }

    const unlocksAt = new Date(now.getTime() + finalDurationMs);

    await db.playerChest.update({
      where: { id: chest.id },
      data: {
        status: 'unlocking',
        startedUnlockAt: now,
        unlocksAt: unlocksAt
      },
    });

    return NextResponse.json({
      success: true,
      status: 'unlocking',
      unlocksAt: unlocksAt.toISOString()
    });
  } catch (error) {
    console.error('Chest unlock error:', error);
    return NextResponse.json({ error: 'Error al iniciar desbloqueo' }, { status: 500 });
  }
}
