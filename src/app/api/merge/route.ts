import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateChallengeProgress } from '@/lib/challenges';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { spiritTypeId, spiritIds } = body;

    if (!spiritTypeId || !spiritIds || spiritIds.length !== 3) {
      return NextResponse.json(
        { error: 'Se necesitan 3 espíritus idénticos para fusionar' },
        { status: 400 }
      );
    }

    // Get player
    const player = await db.playerProfile.findUnique({
      where: { userId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Verify all 3 spirits belong to the player and are the same type
    const spirits = await db.playerSpirit.findMany({
      where: {
        id: { in: spiritIds },
        playerId: player.id,
        spiritTypeId,
      },
      include: { spiritType: true },
    });

    if (spirits.length !== 3) {
      return NextResponse.json(
        { error: 'Espíritus inválidos para fusionar' },
        { status: 400 }
      );
    }

    const currentSpiritType = spirits[0].spiritType;
    const currentRarity = currentSpiritType.rarity;

    // Find evolved form
    const evolvedSpirit = await db.spiritType.findFirst({
      where: {
        element: currentSpiritType.element,
        rarity: getNextRarity(currentRarity),
      },
      orderBy: { basePower: 'asc' },
    });

    if (!evolvedSpirit) {
      return NextResponse.json(
        { error: 'Este espíritu ya está en su forma máxima' },
        { status: 400 }
      );
    }

    // Update challenge progress
    await updateChallengeProgress(player.id, 'merge_spirits', 1);

    // Execute merge in transaction
    const result = await db.$transaction(async (tx) => {
      // Remove the 3 source spirits
      await tx.playerSpirit.deleteMany({
        where: {
          id: { in: spiritIds },
          playerId: player.id,
        },
      });

      // Create the evolved spirit
      // We carry over some experience from the source spirits (average / 2)
      const avgExp = Math.floor(spirits.reduce((s, sp) => s + sp.experience, 0) / 3);
      
      const newSpirit = await tx.playerSpirit.create({
        data: {
          playerId: player.id,
          spiritTypeId: evolvedSpirit.id,
          level: 1,
          experience: Math.floor(avgExp / 2),
        },
        include: { spiritType: true },
      });

      // Award some experience
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { experience: player.experience + 25 },
      });

      // Log transaction
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'reward',
          amount: 0,
          currency: 'lumens',
          metadata: {
            source: 'merge',
            from: currentSpiritType.name,
            to: evolvedSpirit.name,
          },
        },
      });

      return newSpirit;
    });

    return NextResponse.json({
      success: true,
      evolvedSpirit: {
        id: result.id,
        name: result.spiritType.name,
        nameEn: result.spiritType.nameEn,
        element: result.spiritType.element,
        rarity: result.spiritType.rarity,
        basePower: result.spiritType.basePower,
      },
      message: `¡${currentSpiritType.name} evolucionó a ${result.spiritType.name}!`,
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json(
      { error: 'Error al fusionar espíritus' },
      { status: 500 }
    );
  }
}

function getNextRarity(rarity: string): string {
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const idx = order.indexOf(rarity);
  return idx < order.length - 1 ? order[idx + 1] : 'legendary';
}
