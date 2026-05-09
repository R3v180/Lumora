import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const REFRESH_COST = 500;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Check if free refresh is available today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRefresh = await db.transaction.findFirst({
      where: {
        playerId: player.id,
        type: 'raid_refresh',
        createdAt: { gte: today }
      }
    });

    const isFree = !todayRefresh;
    
    if (!isFree && player.lumens < REFRESH_COST) {
      return NextResponse.json({ 
        error: 'Lumens insuficientes', 
        required: REFRESH_COST, 
        current: player.lumens 
      }, { status: 400 });
    }

    // Execute refresh
    const result = await db.$transaction(async (tx) => {
      if (!isFree) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { lumens: { decrement: REFRESH_COST } }
        });
      }

      // Log the refresh transaction
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'raid_refresh',
          amount: isFree ? 0 : -REFRESH_COST,
          currency: 'lumens',
          metadata: { free: isFree }
        }
      });

      return { 
        success: true, 
        isFree, 
        newLumens: isFree ? player.lumens : player.lumens - REFRESH_COST 
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Raid Refresh error:', error);
    return NextResponse.json({ error: 'Error al refrescar oponentes' }, { status: 500 });
  }
}
