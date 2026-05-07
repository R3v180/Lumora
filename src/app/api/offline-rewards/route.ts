import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const MAX_OFFLINE_HOURS = 8;
const ENERGY_PER_5MIN = 1; // 1 energy per 5 minutes
const MIN_OFFLINE_MINUTES = 5; // Minimum 5 minutes offline to earn rewards
const LUMORA_GIFT_THRESHOLD_HOURS = 4; // 4+ hours offline triggers Lumora's Gift

interface LumoraGift {
  type: 'spirit' | 'lumens';
  spiritTypeId?: string;
  spiritName?: string;
  spiritNameEn?: string;
  spiritElement?: string;
  spiritRarity?: string;
  lumensAmount?: number;
}

interface OfflineRewardsCalculation {
  hoursOffline: number;
  minutesOffline: number;
  lumensEarned: number;
  energyRecovered: number;
  lumoraGift: LumoraGift | null;
  canClaim: boolean;
  maxHours: number;
  totalLumensPerHour: number;
}

async function calculateOfflineRewards(playerId: string): Promise<OfflineRewardsCalculation | null> {
  const player = await db.playerProfile.findUnique({
    where: { id: playerId },
    select: {
      energy: true,
      maxEnergy: true,
      lastLoginAt: true,
    },
  });

  if (!player) {
    return null;
  }

  const sanctuary = await db.sanctuary.findUnique({
    where: { playerId },
    include: {
      decorations: {
        where: { type: 'spirit', spiritId: { not: null } },
      },
    },
  });

  if (!sanctuary) {
    return null;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - player.lastLoginAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Not enough time offline
  if (elapsedMinutes < MIN_OFFLINE_MINUTES) {
    return {
      hoursOffline: 0,
      minutesOffline: Math.floor(elapsedMinutes),
      lumensEarned: 0,
      energyRecovered: 0,
      lumoraGift: null,
      canClaim: false,
      maxHours: MAX_OFFLINE_HOURS,
      totalLumensPerHour: sanctuary.lumensPerHour,
    };
  }

  // Cap at max offline hours
  const hoursOffline = Math.min(elapsedHours, MAX_OFFLINE_HOURS);
  const minutesOffline = Math.floor(elapsedMinutes);

  // Calculate total Lumens per hour (base + placed spirits)
  const placedSpiritIds = sanctuary.decorations.map(d => d.spiritId!);
  let spiritLumensPerHour = 0;

  if (placedSpiritIds.length > 0) {
    const placedSpirits = await db.playerSpirit.findMany({
      where: { id: { in: placedSpiritIds } },
      include: { spiritType: true },
    });
    spiritLumensPerHour = placedSpirits.reduce(
      (sum, s) => sum + s.spiritType.lumensPerHour,
      0
    );
  }

  const totalLumensPerHour = sanctuary.lumensPerHour + spiritLumensPerHour;

  // Calculate lumens earned
  const lumensEarned = Math.floor(totalLumensPerHour * hoursOffline);

  // Calculate energy recovered (1 energy per 5 minutes, capped at maxEnergy - currentEnergy)
  const energyRecovered = Math.min(
    Math.floor(minutesOffline / 5) * ENERGY_PER_5MIN,
    player.maxEnergy - player.energy
  );

  // Calculate Lumora's Gift (if offline > 4 hours)
  let lumoraGift: LumoraGift | null = null;
  if (elapsedHours >= LUMORA_GIFT_THRESHOLD_HOURS) {
    // 40% chance of getting a spirit, 60% chance of extra lumens
    const spiritChance = Math.random();

    if (spiritChance < 0.4) {
      // Give a random spirit - prefer uncommon or rare
      const spiritTypes = await db.spiritType.findMany({
        where: {
          rarity: { in: ['uncommon', 'rare'] },
        },
      });

      if (spiritTypes.length > 0) {
        const randomSpirit = spiritTypes[Math.floor(Math.random() * spiritTypes.length)];
        lumoraGift = {
          type: 'spirit',
          spiritTypeId: randomSpirit.id,
          spiritName: randomSpirit.name,
          spiritNameEn: randomSpirit.nameEn,
          spiritElement: randomSpirit.element,
          spiritRarity: randomSpirit.rarity,
        };
      } else {
        // Fallback: give bonus lumens if no spirit types found
        lumoraGift = {
          type: 'lumens',
          lumensAmount: Math.floor(50 + Math.random() * 150),
        };
      }
    } else {
      // Give bonus lumens (50-200 based on hours offline)
      const bonusMultiplier = Math.min(hoursOffline / 4, 2);
      lumoraGift = {
        type: 'lumens',
        lumensAmount: Math.floor((50 + Math.random() * 100) * bonusMultiplier),
      };
    }
  }

  const canClaim = (lumensEarned > 0 || energyRecovered > 0 || lumoraGift !== null);

  return {
    hoursOffline: Math.round(hoursOffline * 100) / 100,
    minutesOffline,
    lumensEarned: Math.max(lumensEarned, 0),
    energyRecovered: Math.max(energyRecovered, 0),
    lumoraGift,
    canClaim,
    maxHours: MAX_OFFLINE_HOURS,
    totalLumensPerHour,
  };
}

// GET - Calculate and return offline rewards (does not claim)
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

    // If no rewards to claim, update lastLoginAt to prevent timer from growing indefinitely
    if (!result.canClaim) {
      await db.playerProfile.update({
        where: { id: player.id },
        data: { lastLoginAt: new Date() },
      });
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

// POST - Claim offline rewards
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

    // Calculate gift lumens amount
    const giftLumens = result.lumoraGift?.type === 'lumens'
      ? (result.lumoraGift.lumensAmount || 0)
      : 0;

    // Claim the rewards in a transaction
    const updatedPlayer = await db.$transaction(async (tx) => {
      // Add lumens and energy to player profile
      const updated = await tx.playerProfile.update({
        where: { id: player.id },
        data: {
          lumens: player.lumens + result.lumensEarned + giftLumens,
          energy: player.energy + result.energyRecovered,
          lastLoginAt: new Date(),
        },
      });

      // Update sanctuary lastCollectAt to now
      await tx.sanctuary.update({
        where: { id: player.sanctuary!.id },
        data: {
          lastCollectAt: new Date(),
        },
      });

      // Create transaction record for idle lumens
      if (result.lumensEarned > 0) {
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'daily',
            amount: result.lumensEarned,
            currency: 'lumens',
            metadata: {
              source: 'offline_idle',
              hours: result.hoursOffline,
            },
          },
        });
      }

      // Create transaction record for energy recovery
      if (result.energyRecovered > 0) {
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'reward',
            amount: result.energyRecovered,
            currency: 'energy',
            metadata: {
              source: 'offline_energy',
              hours: result.hoursOffline,
            },
          },
        });
      }

      // Handle Lumora's Gift
      if (result.lumoraGift) {
        if (result.lumoraGift.type === 'spirit' && result.lumoraGift.spiritTypeId) {
          // Create a new spirit for the player
          await tx.playerSpirit.create({
            data: {
              playerId: player.id,
              spiritTypeId: result.lumoraGift.spiritTypeId,
              level: 1,
            },
          });

          await tx.transaction.create({
            data: {
              playerId: player.id,
              type: 'reward',
              amount: 1,
              currency: 'lumens',
              metadata: {
                source: 'lumora_gift_spirit',
                spiritTypeId: result.lumoraGift.spiritTypeId,
                spiritName: result.lumoraGift.spiritName,
                hours: result.hoursOffline,
              },
            },
          });
        } else if (result.lumoraGift.type === 'lumens' && giftLumens > 0) {
          await tx.transaction.create({
            data: {
              playerId: player.id,
              type: 'reward',
              amount: giftLumens,
              currency: 'lumens',
              metadata: {
                source: 'lumora_gift_lumens',
                hours: result.hoursOffline,
              },
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      lumensEarned: result.lumensEarned,
      energyRecovered: result.energyRecovered,
      lumoraGift: result.lumoraGift,
      giftLumens,
      totalLumens: result.lumensEarned + giftLumens,
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
