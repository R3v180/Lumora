import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// === IN-MEMORY BONUS SESSIONS (5-minute expiry) ===

interface BonusPod {
  type: 'lumens' | 'energy' | 'spirit' | 'extraPick' | 'collectAll';
  amount?: number;
  spiritElement?: string;
  spiritRarity?: string;
  spiritTypeId?: string;
  spiritName?: string;
  spiritNameEn?: string;
}

interface BonusSession {
  id: string;
  playerId: string;
  pods: BonusPod[];
  revealedPods: Set<number>;
  remainingPicks: number;
  totalPicksAllowed: number;
  createdAt: number;
  bonusCount: number;
}

const sessions = new Map<string, BonusSession>();

// Clean up expired sessions every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > 5 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60_000);

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

  const sessionId = `bonus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pods = generatePods(player.level, bonusCount);
  const totalPicksAllowed = Math.min(3 + (bonusCount - 3), 6); // 3 base + 1 per extra bonus symbol, max 6

  const session: BonusSession = {
    id: sessionId,
    playerId: player.id,
    pods,
    revealedPods: new Set(),
    remainingPicks: totalPicksAllowed,
    totalPicksAllowed,
    createdAt: Date.now(),
    bonusCount,
  };

  sessions.set(sessionId, session);

  return NextResponse.json({
    sessionId,
    podCount: 9,
    totalPicksAllowed,
    remainingPicks: totalPicksAllowed,
  });
}

async function handlePick(userId: string, sessionId: string, podIndex: number) {
  const session = sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Sesión de bonus no encontrada o expirada' }, { status: 404 });
  }

  const now = Date.now();
  if (now - session.createdAt > 5 * 60 * 1000) {
    sessions.delete(sessionId);
    return NextResponse.json({ error: 'Sesión de bonus expirada' }, { status: 410 });
  }

  // Validate player
  const player = await db.playerProfile.findUnique({
    where: { userId },
  });

  if (!player || player.id !== session.playerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Validate pod index
  if (podIndex < 0 || podIndex >= 9) {
    return NextResponse.json({ error: 'Índice de pod inválido' }, { status: 400 });
  }

  // Check if already revealed
  if (session.revealedPods.has(podIndex)) {
    return NextResponse.json({ error: 'Este pod ya fue revelado' }, { status: 400 });
  }

  // Check picks remaining
  if (session.remainingPicks <= 0) {
    return NextResponse.json({ error: 'No quedan elecciones' }, { status: 400 });
  }

  const pod = session.pods[podIndex];
  session.revealedPods.add(podIndex);
  session.remainingPicks--;

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
      session.remainingPicks++;
      session.totalPicksAllowed++;
      rewardDetails.newRemainingPicks = session.remainingPicks;
    } else if (pod.type === 'collectAll') {
      // Reveal and award all remaining unrevealed pods
      const remainingIndices: number[] = [];
      for (let i = 0; i < 9; i++) {
        if (!session.revealedPods.has(i)) {
          remainingIndices.push(i);
        }
      }

      let totalLumens = 0;
      let totalEnergy = 0;
      const spiritsWon: Record<string, any>[] = [];

      for (const idx of remainingIndices) {
        session.revealedPods.add(idx);
        const rPod = session.pods[idx];

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
        // Extra pick and collectAll within collectAll are ignored (rare edge case)
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
      session.remainingPicks = 0;

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
  });

  // Get updated player state
  const updatedPlayer = await db.playerProfile.findUnique({
    where: { id: player.id },
  });

  return NextResponse.json({
    reward: rewardDetails,
    remainingPicks: session.remainingPicks,
    revealedCount: session.revealedPods.size,
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
  const session = sessions.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Sesión de bonus no encontrada' }, { status: 404 });
  }

  const player = await db.playerProfile.findUnique({
    where: { userId },
  });

  if (!player || player.id !== session.playerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Calculate total rewards
  let totalLumens = 0;
  let totalEnergy = 0;
  const spiritsWon: Record<string, any>[] = [];

  for (const idx of session.revealedPods) {
    const pod = session.pods[idx];
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

  // Clean up session
  sessions.delete(sessionId);

  // Get updated player data
  const updatedPlayer = await db.playerProfile.findUnique({
    where: { id: player.id },
  });

  return NextResponse.json({
    totalLumens,
    totalEnergy,
    spiritsWon,
    totalPicks: session.revealedPods.size,
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
