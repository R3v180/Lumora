import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// === DATABASE-BACKED BONUS SESSIONS ===

interface BonusPod {
  type: 'lumens' | 'energy' | 'spirit' | 'extraPick' | 'collectAll';
  amount?: number;
  spiritElement?: string;
  spiritRarity?: string;
  spiritTypeId?: string;
  spiritName?: string;
  spiritNameEn?: string;
}

interface BonusSessionData {
  pods: BonusPod[];
  revealedPods: number[]; // Array instead of Set for JSON compatibility
  remainingPicks: number;
  totalPicksAllowed: number;
  bonusCount: number;
}

// === REWARD GENERATION ===

function generatePods(playerLevel: number, bonusCount: number): BonusPod[] {
  const pods: BonusPod[] = [];
  const ELEMENTS = ['fire', 'water', 'dream', 'nature', 'star'];
  const SPIRIT_RARITIES = ['common', 'uncommon'];

  // Generate 9 pods with weighted rewards
  for (let i = 0; i < 9; i++) {
    const roll = Math.random();

    if (roll < 0.60) {
      // Lumens (60%): 50-500 based on player level
      const minLumens = 50 + playerLevel * 5;
      const maxLumens = 200 + playerLevel * 30;
      const amount = Math.floor(Math.random() * (maxLumens - minLumens + 1)) + minLumens;
      pods.push({ type: 'lumens', amount });
    } else if (roll < 0.80) {
      // Energy (20%): 10-50
      const amount = Math.floor(Math.random() * 41) + 10;
      pods.push({ type: 'energy', amount });
    } else if (roll < 0.90) {
      // Spirit (10%): random element, common/uncommon rarity
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const rarity = SPIRIT_RARITIES[Math.floor(Math.random() * SPIRIT_RARITIES.length)];
      pods.push({ type: 'spirit', spiritElement: element, spiritRarity: rarity });
    } else if (roll < 0.95) {
      // Extra Pick (5%)
      pods.push({ type: 'extraPick' });
    } else {
      // Collect All Remaining (5%)
      pods.push({ type: 'collectAll' });
    }
  }

  return pods;
}

// === ACTIONS ===

async function handleStart(userId: string, bonusCount: number) {
  const player = await db.playerProfile.findUnique({
    where: { userId },
  });

  if (!player) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  const pods = generatePods(player.level, bonusCount);
  const totalPicksAllowed = Math.min(3 + (bonusCount - 3), 6); // 3 base + 1 per extra bonus symbol, max 6

  const sessionData: BonusSessionData = {
    pods,
    revealedPods: [],
    remainingPicks: totalPicksAllowed,
    totalPicksAllowed,
    bonusCount,
  };

  const session = await db.gameSession.create({
    data: {
      playerId: player.id,
      type: 'BONUS_CHEST',
      status: 'active',
      data: sessionData as any,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    podCount: 9,
    totalPicksAllowed,
    remainingPicks: totalPicksAllowed,
  });
}

async function handlePick(userId: string, sessionId: string, podIndex: number) {
  const session = await db.gameSession.findUnique({
    where: { id: sessionId }
  });

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Sesión de bonus no encontrada o ya completada' }, { status: 404 });
  }

  if (session.expiresAt < new Date()) {
    await db.gameSession.update({ where: { id: sessionId }, data: { status: 'expired' } });
    return NextResponse.json({ error: 'Sesión de bonus expirada' }, { status: 410 });
  }

  // Validate player
  const player = await db.playerProfile.findUnique({
    where: { userId },
  });

  if (!player || player.id !== session.playerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sessionData = session.data as unknown as BonusSessionData;
  const revealedPodsSet = new Set(sessionData.revealedPods);

  // Validate pod index
  if (podIndex < 0 || podIndex >= 9) {
    return NextResponse.json({ error: 'Índice de pod inválido' }, { status: 400 });
  }

  // Check if already revealed
  if (revealedPodsSet.has(podIndex)) {
    return NextResponse.json({ error: 'Este pod ya fue revelado' }, { status: 400 });
  }

  // Check picks remaining
  if (sessionData.remainingPicks <= 0) {
    return NextResponse.json({ error: 'No quedan elecciones' }, { status: 400 });
  }

  const pod = sessionData.pods[podIndex];
  revealedPodsSet.add(podIndex);
  sessionData.remainingPicks--;

  const rewardDetails: Record<string, any> = {
    type: pod.type,
    podIndex,
  };

  // Award the reward via Prisma transaction
  await db.$transaction(async (tx) => {
    if (pod.type === 'lumens' && pod.amount) {
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { lumens: { increment: pod.amount } },
      });
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'reward',
          amount: pod.amount,
          currency: 'lumens',
          metadata: { source: 'bonus', podType: 'lumens' },
        },
      });
      rewardDetails.amount = pod.amount;
    } else if (pod.type === 'energy' && pod.amount) {
      const newEnergy = Math.min(player.energy + pod.amount, player.maxEnergy);
      await tx.playerProfile.update({
        where: { id: player.id },
        data: { energy: newEnergy },
      });
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'reward',
          amount: pod.amount,
          currency: 'energy',
          metadata: { source: 'bonus', podType: 'energy' },
        },
      });
      rewardDetails.amount = pod.amount;
    } else if (pod.type === 'spirit' && pod.spiritElement && pod.spiritRarity) {
      // Find the spirit type
      const spiritType = await tx.spiritType.findFirst({
        where: {
          element: pod.spiritElement,
          rarity: pod.spiritRarity,
        },
        orderBy: { basePower: 'asc' },
      });

      if (spiritType) {
        await tx.playerSpirit.create({
          data: {
            playerId: player.id,
            spiritTypeId: spiritType.id,
            level: 1,
          },
        });
        rewardDetails.spiritTypeId = spiritType.id;
        rewardDetails.spiritElement = pod.spiritElement;
        rewardDetails.spiritRarity = pod.spiritRarity;
        rewardDetails.spiritName = spiritType.name;
        rewardDetails.spiritNameEn = spiritType.nameEn;
        pod.spiritTypeId = spiritType.id;
        pod.spiritName = spiritType.name;
        pod.spiritNameEn = spiritType.nameEn;
      }
    } else if (pod.type === 'extraPick') {
      sessionData.remainingPicks++;
      sessionData.totalPicksAllowed++;
      rewardDetails.newRemainingPicks = sessionData.remainingPicks;
    } else if (pod.type === 'collectAll') {
      // Reveal and award all remaining unrevealed pods
      const remainingIndices: number[] = [];
      for (let i = 0; i < 9; i++) {
        if (!revealedPodsSet.has(i)) {
          remainingIndices.push(i);
        }
      }

      let totalLumens = 0;
      let totalEnergy = 0;
      const spiritsWon: Record<string, any>[] = [];

      for (const idx of remainingIndices) {
        revealedPodsSet.add(idx);
        const rPod = sessionData.pods[idx];

        if (rPod.type === 'lumens' && rPod.amount) {
          totalLumens += rPod.amount;
        } else if (rPod.type === 'energy' && rPod.amount) {
          totalEnergy += rPod.amount;
        } else if (rPod.type === 'spirit' && rPod.spiritElement && rPod.spiritRarity) {
          const spiritType = await tx.spiritType.findFirst({
            where: {
              element: rPod.spiritElement,
              rarity: rPod.spiritRarity,
            },
            orderBy: { basePower: 'asc' },
          });

          if (spiritType) {
            await tx.playerSpirit.create({
              data: {
                playerId: player.id,
                spiritTypeId: spiritType.id,
                level: 1,
              },
            });
            spiritsWon.push({
              index: idx,
              spiritTypeId: spiritType.id,
              spiritElement: rPod.spiritElement,
              spiritRarity: rPod.spiritRarity,
              spiritName: spiritType.name,
              spiritNameEn: spiritType.nameEn,
            });
            rPod.spiritTypeId = spiritType.id;
            rPod.spiritName = spiritType.name;
            rPod.spiritNameEn = spiritType.nameEn;
          }
        }
      }

      // Award lumens
      if (totalLumens > 0) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { lumens: { increment: totalLumens } },
        });
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'reward',
            amount: totalLumens,
            currency: 'lumens',
            metadata: { source: 'bonus', podType: 'collectAll_lumens' },
          },
        });
      }

      // Award energy
      if (totalEnergy > 0) {
        const newEnergy = Math.min(player.energy + totalEnergy, player.maxEnergy);
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { energy: newEnergy },
        });
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'reward',
            amount: totalEnergy,
            currency: 'energy',
            metadata: { source: 'bonus', podType: 'collectAll_energy' },
          },
        });
      }

      // Set remaining picks to 0 since all pods are revealed
      sessionData.remainingPicks = 0;

      rewardDetails.collectedAll = true;
      rewardDetails.collectedIndices = remainingIndices;
      rewardDetails.totalLumens = totalLumens;
      rewardDetails.totalEnergy = totalEnergy;
      rewardDetails.spiritsWon = spiritsWon;
    }

    // Award XP for bonus pick (2 XP per pick)
    await tx.playerProfile.update({
      where: { id: player.id },
      data: { experience: { increment: 2 } },
    });

    // Update session data in DB
    sessionData.revealedPods = Array.from(revealedPodsSet);
    await tx.gameSession.update({
      where: { id: session.id },
      data: { data: sessionData as any }
    });
  });

  // Get updated player state
  const updatedPlayer = await db.playerProfile.findUnique({
    where: { id: player.id },
  });

  return NextResponse.json({
    reward: rewardDetails,
    remainingPicks: sessionData.remainingPicks,
    revealedCount: revealedPodsSet.size,
    player: updatedPlayer ? {
      lumens: updatedPlayer.lumens,
      energy: updatedPlayer.energy,
      maxEnergy: updatedPlayer.maxEnergy,
      level: updatedPlayer.level,
      experience: updatedPlayer.experience,
    } : undefined,
  });
}

async function handleFinish(userId: string, sessionId: string) {
  const session = await db.gameSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    return NextResponse.json({ error: 'Sesión de bonus no encontrada' }, { status: 404 });
  }

  const player = await db.playerProfile.findUnique({
    where: { userId },
  });

  if (!player || player.id !== session.playerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sessionData = session.data as unknown as BonusSessionData;

  // Calculate total rewards from the revealed pods
  let totalLumens = 0;
  let totalEnergy = 0;
  const spiritsWon: Record<string, any>[] = [];

  for (const idx of sessionData.revealedPods) {
    const pod = sessionData.pods[idx];
    if (pod.type === 'lumens' && pod.amount) totalLumens += pod.amount;
    else if (pod.type === 'energy' && pod.amount) totalEnergy += pod.amount;
    else if (pod.type === 'spirit' && pod.spiritTypeId) {
      spiritsWon.push({
        spiritTypeId: pod.spiritTypeId,
        element: pod.spiritElement,
        rarity: pod.spiritRarity,
        name: pod.spiritName,
        nameEn: pod.spiritNameEn,
      });
    }
  }

  // Mark session as completed
  await db.gameSession.update({
    where: { id: sessionId },
    data: { status: 'completed' }
  });

  // Get updated player data
  const updatedPlayer = await db.playerProfile.findUnique({
    where: { id: player.id },
  });

  return NextResponse.json({
    totalLumens,
    totalEnergy,
    spiritsWon,
    totalPicks: sessionData.revealedPods.length,
    player: updatedPlayer ? {
      lumens: updatedPlayer.lumens,
      energy: updatedPlayer.energy,
      maxEnergy: updatedPlayer.maxEnergy,
      level: updatedPlayer.level,
      experience: updatedPlayer.experience,
    } : undefined,
  });
}

// === ROUTE HANDLER ===

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, sessionId, podIndex, bonusCount } = body;

    switch (action) {
      case 'start':
        return handleStart(userId, bonusCount || 3);
      case 'pick':
        if (!sessionId || podIndex === undefined) {
          return NextResponse.json(
            { error: 'sessionId y podIndex son requeridos' },
            { status: 400 }
          );
        }
        return handlePick(userId, sessionId, podIndex);
      case 'finish':
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId es requerido' },
            { status: 400 }
          );
        }
        return handleFinish(userId, sessionId);
      default:
        return NextResponse.json(
          { error: 'Acción no válida. Usa: start, pick, finish' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bonus API error:', error);
    return NextResponse.json(
      { error: 'Error en el juego de bonus' },
      { status: 500 }
    );
  }
}
