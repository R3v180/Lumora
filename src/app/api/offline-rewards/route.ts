import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MAX_OFFLINE_HOURS = 8;
const ENERGY_PER_HOUR = 12;
const MIN_HOURS_TO_CLAIM = 0.1; // 6 minutes

interface OfflineRewardsCalculation {
  hoursOffline: number;
  lumensEarned: number;
  energyRecovered: number;
  canClaim: boolean;
  maxHours: number;
}

async function calculateOfflineRewards(playerId: string): Promise<OfflineRewardsCalculation | null> {
  const sanctuary = await db.sanctuary.findUnique({
    where: { playerId },
  });

  if (!sanctuary) {
    return null;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - sanctuary.lastCollectAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Cap at max offline hours
  const hoursOffline = Math.min(elapsedHours, MAX_OFFLINE_HOURS);

  // Calculate lumens earned
  const lumensEarned = Math.floor(sanctuary.lumensPerHour * hoursOffline);

  // Calculate energy recovered
  const player = await db.playerProfile.findUnique({
    where: { id: playerId },
    select: { energy: true, maxEnergy: true },
  });

  if (!player) {
    return null;
  }

  const energyRecovered = Math.min(
    Math.floor(hoursOffline * ENERGY_PER_HOUR),
    player.maxEnergy - player.energy
  );

  const canClaim = hoursOffline >= MIN_HOURS_TO_CLAIM && (lumensEarned > 0 || energyRecovered > 0);

  return {
    hoursOffline: Math.round(hoursOffline * 100) / 100,
    lumensEarned: Math.max(lumensEarned, 0),
    energyRecovered: Math.max(energyRecovered, 0),
    canClaim,
    maxHours: MAX_OFFLINE_HOURS,
  };
}

export async function GET() {
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

    const result = await calculateOfflineRewards(player.id);

    if (!result) {
      return NextResponse.json({ error: 'Santuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Offline rewards GET error:', error);
    return NextResponse.json(
      { error: 'Error al calcular recompensas offline' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { sanctuary: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (!player.sanctuary) {
      return NextResponse.json({ error: 'Santuario no encontrado' }, { status: 404 });
    }

    const result = await calculateOfflineRewards(player.id);

    if (!result) {
      return NextResponse.json({ error: 'Santuario no encontrado' }, { status: 404 });
    }

    if (!result.canClaim) {
      return NextResponse.json({
        success: false,
        message: 'No hay recompensas disponibles aún',
        ...result,
      }, { status: 400 });
    }

    // Claim the rewards in a transaction
    const updatedPlayer = await db.$transaction(async (tx) => {
      // Add lumens to player profile
      const updated = await tx.playerProfile.update({
        where: { id: player.id },
        data: {
          lumens: player.lumens + result.lumensEarned,
          energy: player.energy + result.energyRecovered,
        },
      });

      // Update sanctuary lastCollectAt to now
      await tx.sanctuary.update({
        where: { id: player.sanctuary!.id },
        data: {
          lastCollectAt: new Date(),
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'daily',
          amount: result.lumensEarned,
          currency: 'lumens',
          metadata: {
            source: 'offline',
            hours: result.hoursOffline,
            energyRecovered: result.energyRecovered,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      lumensEarned: result.lumensEarned,
      energyRecovered: result.energyRecovered,
      player: {
        lumens: updatedPlayer.lumens,
        energy: updatedPlayer.energy,
        maxEnergy: updatedPlayer.maxEnergy,
      },
    });
  } catch (error) {
    console.error('Offline rewards POST error:', error);
    return NextResponse.json(
      { error: 'Error al reclamar recompensas offline' },
      { status: 500 }
    );
  }
}
