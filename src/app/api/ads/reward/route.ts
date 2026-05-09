import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { rewardType } = await request.json(); // 'energy' or 'free_spin'

    const player = await db.playerProfile.findUnique({
      where: { userId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (rewardType === 'energy') {
      const REWARD_AMOUNT = 25;
      const updatedPlayer = await db.playerProfile.update({
        where: { id: player.id },
        data: {
          energy: Math.min(player.maxEnergy, player.energy + REWARD_AMOUNT),
        },
      });

      return NextResponse.json({
        success: true,
        newEnergy: updatedPlayer.energy,
        maxEnergy: updatedPlayer.maxEnergy,
      });
    }

    if (rewardType === 'free_spin') {
      // In a real implementation we would increment a 'freeSpins' counter
      // But for prototype, we can just grant energy equivalent to one spin
      const SPIN_COST = 5;
      const updatedPlayer = await db.playerProfile.update({
        where: { id: player.id },
        data: {
          energy: Math.min(player.maxEnergy, player.energy + SPIN_COST),
        },
      });

      return NextResponse.json({
        success: true,
        newEnergy: updatedPlayer.energy,
        maxEnergy: updatedPlayer.maxEnergy,
      });
    }

    return NextResponse.json({ error: 'Tipo de recompensa no válido' }, { status: 400 });
  } catch (error) {
    console.error('Ad reward error:', error);
    return NextResponse.json({ error: 'Error al procesar recompensa' }, { status: 500 });
  }
}
