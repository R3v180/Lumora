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
    const { chestId, useLumens } = await req.json();

    const player = await db.playerProfile.findUnique({ where: { userId } });
    if (!player) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const chest = await db.playerChest.findUnique({ where: { id: chestId } });
    if (!chest || chest.playerId !== player.id || chest.isOpened) {
      return NextResponse.json({ error: 'Cofre inválido o ya abierto' }, { status: 400 });
    }

    const now = new Date();
    const unlocksAt = new Date(chest.unlocksAt);
    let cost = 0;

    // Logic for costs:
    // If state is ready (time elapsed), cost is 0.
    // If state is unlocking or locked, cost depends on time remaining.
    if (now < unlocksAt) {
      if (!useLumens) {
        return NextResponse.json({ error: 'El cofre aún está bloqueado. Usa Lumens para abrirlo ya.' }, { status: 400 });
      }
      
      // Cost calculation: max 500 lumens for full duration, minimum 0.
      const totalDuration = chest.durationMs;
      const elapsed = chest.startedUnlockAt ? (now.getTime() - new Date(chest.startedUnlockAt).getTime()) : 0;
      const remaining = Math.max(0, totalDuration - elapsed);
      
      cost = Math.ceil((remaining / totalDuration) * 500);

      if (player.lumens < cost) {
        return NextResponse.json({ error: 'Lumens insuficientes para apertura instantánea.' }, { status: 400 });
      }
    }

    // Determine rewards based on rarity
    let rewardLumens = 0;
    let rewardEnergy = 0;

    switch (chest.rarity) {
      case 'legendary':
        rewardLumens = 5000 + Math.floor(Math.random() * 5000);
        rewardEnergy = 50 + Math.floor(Math.random() * 50);
        break;
      case 'epic':
        rewardLumens = 2000 + Math.floor(Math.random() * 2000);
        rewardEnergy = 25 + Math.floor(Math.random() * 25);
        break;
      case 'rare':
        rewardLumens = 1000 + Math.floor(Math.random() * 1000);
        rewardEnergy = 10 + Math.floor(Math.random() * 15);
        break;
      default:
        rewardLumens = 200 + Math.floor(Math.random() * 300);
        rewardEnergy = 5 + Math.floor(Math.random() * 5);
        break;
    }

    // Update in transaction
    await db.$transaction([
      db.playerChest.update({
        where: { id: chest.id },
        data: { isOpened: true, status: 'opened' },
      }),
      db.playerProfile.update({
        where: { id: player.id },
        data: {
          lumens: { increment: rewardLumens - cost },
          energy: { increment: rewardEnergy },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      cost,
      rewards: {
        lumens: rewardLumens,
        energy: rewardEnergy,
      },
      newLumens: player.lumens + rewardLumens - cost,
      newEnergy: player.energy + rewardEnergy,
    });
  } catch (error) {
    console.error('Chest open error:', error);
    return NextResponse.json({ error: 'Error al abrir cofre' }, { status: 500 });
  }
}
