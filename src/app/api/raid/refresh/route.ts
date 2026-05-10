import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';

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

    // Check if free refresh is available today - raw SQL
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRefreshes = await db.$queryRawUnsafe(`
      SELECT id FROM transactions
      WHERE "playerId" = $1 AND type = 'raid_refresh' AND "createdAt" >= $2
      LIMIT 1
    `, player.id, today);

    const isFree = (todayRefreshes as any[]).length === 0;
    
    if (!isFree && player.lumens < REFRESH_COST) {
      return NextResponse.json({ 
        error: 'Lumens insuficientes', 
        required: REFRESH_COST, 
        current: player.lumens 
      }, { status: 400 });
    }

    // Execute refresh in transaction - raw SQL
    try {
      await db.$transaction(async (tx) => {
        if (!isFree) {
          await tx.$executeRawUnsafe(`
            UPDATE player_profiles SET lumens = lumens - $1 WHERE id = $2
          `, REFRESH_COST, player.id);
        }

        const now = new Date();
        // Log the refresh transaction
        await tx.$executeRawUnsafe(`
          INSERT INTO transactions (id, "playerId", type, amount, currency, metadata, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        `, 
          crypto.randomUUID(),
          player.id,
          'raid_refresh',
          isFree ? 0 : -REFRESH_COST,
          'lumens',
          JSON.stringify({ free: isFree }),
          now
        );
      });

      return NextResponse.json({ 
        success: true, 
        isFree, 
        newLumens: isFree ? player.lumens : player.lumens - REFRESH_COST 
      });
    } catch (txError) {
      console.error('Refresh Transaction error:', txError);
      return NextResponse.json({ error: 'Error en la transacción de refresco' }, { status: 500 });
    }

  } catch (error) {
    console.error('Raid Refresh error:', error);
    return NextResponse.json({ error: 'Error al refrescar oponentes' }, { status: 500 });
  }
}
