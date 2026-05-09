import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Tree level formula: each level requires level * 10 total spins (TESTING MODE)
function spinsForLevel(level: number): number {
  return level * 10;
}

// Calculate total spins needed to reach a given level from level 1
function totalSpinsForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += spinsForLevel(i);
  }
  return total;
}

// Get buffs based on tree level
interface TreeBuff {
  lumensMultiplier: number;
  energyRegenBonus: number;
  rareSpiritBonus: number;
  bonusGameChance: number;
}

function getBuffsForLevel(level: number): TreeBuff {
  if (level >= 21) {
    return {
      lumensMultiplier: 1.2,
      energyRegenBonus: 3,
      rareSpiritBonus: 0.1,
      bonusGameChance: 0.05,
    };
  } else if (level >= 16) {
    return {
      lumensMultiplier: 1.15,
      energyRegenBonus: 2,
      rareSpiritBonus: 0.05,
      bonusGameChance: 0,
    };
  } else if (level >= 11) {
    return {
      lumensMultiplier: 1.1,
      energyRegenBonus: 1,
      rareSpiritBonus: 0,
      bonusGameChance: 0,
    };
  } else if (level >= 6) {
    return {
      lumensMultiplier: 1.05,
      energyRegenBonus: 0,
      rareSpiritBonus: 0,
      bonusGameChance: 0,
    };
  }
  return {
    lumensMultiplier: 1,
    energyRegenBonus: 0,
    rareSpiritBonus: 0,
    bonusGameChance: 0,
  };
}

type ElementKey = 'fire' | 'water' | 'dream' | 'nature' | 'star';

function getDominantElement(state: {
  totalFire: number;
  totalWater: number;
  totalDream: number;
  totalNature: number;
  totalStar: number;
}): ElementKey {
  const elements: { key: ElementKey; value: number }[] = [
    { key: 'fire', value: state.totalFire },
    { key: 'water', value: state.totalWater },
    { key: 'dream', value: state.totalDream },
    { key: 'nature', value: state.totalNature },
    { key: 'star', value: state.totalStar },
  ];
  elements.sort((a, b) => b.value - a.value);
  return elements[0].key;
}

// GET - Returns detailed world tree info
export async function GET() {
  try {
    let worldState = await db.worldState.findUnique({
      where: { id: 'lumora_world' },
    });

    if (!worldState) {
      worldState = await db.worldState.create({
        data: { id: 'lumora_world' },
      });
    }

    const level = worldState.treeLevel;
    const buffs = getBuffsForLevel(level);
    const dominantElement = getDominantElement(worldState);

    // Calculate XP progress
    // XP = total spins accumulated toward tree progression
    // Each level requires level * 10000 spins
    const currentLevelSpins = totalSpinsForLevel(level);
    const nextLevelSpins = totalSpinsForLevel(level + 1);
    const spinsInCurrentLevel = worldState.totalSpins - currentLevelSpins;
    const spinsNeededForNext = spinsForLevel(level);
    const progressPercent = Math.min(
      100,
      Math.round((spinsInCurrentLevel / spinsNeededForNext) * 100)
    );
    const spinsRemaining = Math.max(0, spinsNeededForNext - spinsInCurrentLevel);

    // Check for level up
    let updatedLevel = level;
    if (worldState.totalSpins >= nextLevelSpins) {
      // Recalculate proper level
      let testLevel = level;
      while (worldState.totalSpins >= totalSpinsForLevel(testLevel + 1)) {
        testLevel++;
      }
      if (testLevel > level) {
        updatedLevel = testLevel;
        await db.worldState.update({
          where: { id: 'lumora_world' },
          data: { treeLevel: testLevel },
        });
      }
    }

    const finalLevel = updatedLevel > level ? updatedLevel : level;
    const finalBuffs = getBuffsForLevel(finalLevel);

    // Recalculate with updated level
    const finalCurrentLevelSpins = totalSpinsForLevel(finalLevel);
    const finalSpinsNeededForNext = spinsForLevel(finalLevel);
    const finalSpinsInCurrentLevel = worldState.totalSpins - finalCurrentLevelSpins;
    const finalProgressPercent = Math.min(
      100,
      Math.round((finalSpinsInCurrentLevel / finalSpinsNeededForNext) * 100)
    );
    const finalSpinsRemaining = Math.max(0, finalSpinsNeededForNext - finalSpinsInCurrentLevel);

    // Build milestones (calculate milestone levels that have been reached)
    const milestones: { level: number; reached: boolean }[] = [];
    const milestoneLevels = [5, 6, 10, 11, 15, 16, 20, 21];
    for (const ml of milestoneLevels) {
      if (ml <= finalLevel) {
        milestones.push({ level: ml, reached: true });
      } else {
        milestones.push({ level: ml, reached: false });
      }
    }

    // Build active buff descriptions
    const activeBuffs: { type: string; value: number; label: string }[] = [];
    if (finalBuffs.lumensMultiplier > 1) {
      activeBuffs.push({
        type: 'lumensBonus',
        value: Math.round((finalBuffs.lumensMultiplier - 1) * 100),
        label: `+${Math.round((finalBuffs.lumensMultiplier - 1) * 100)}% Lumens`,
      });
    }
    if (finalBuffs.energyRegenBonus > 0) {
      activeBuffs.push({
        type: 'energyRegen',
        value: finalBuffs.energyRegenBonus,
        label: `+${finalBuffs.energyRegenBonus} Energy Regen`,
      });
    }
    if (finalBuffs.rareSpiritBonus > 0) {
      activeBuffs.push({
        type: 'rareSpiritBonus',
        value: Math.round(finalBuffs.rareSpiritBonus * 100),
        label: `+${Math.round(finalBuffs.rareSpiritBonus * 100)}% Rare Spirits`,
      });
    }
    if (finalBuffs.bonusGameChance > 0) {
      activeBuffs.push({
        type: 'bonusChance',
        value: Math.round(finalBuffs.bonusGameChance * 100),
        label: `+${Math.round(finalBuffs.bonusGameChance * 100)}% Bonus Game`,
      });
    }

    return NextResponse.json({
      treeLevel: finalLevel,
      progress: {
        current: finalSpinsInCurrentLevel,
        needed: finalSpinsNeededForNext,
        percent: finalProgressPercent,
        spinsRemaining: finalSpinsRemaining,
      },
      totalSpins: worldState.totalSpins,
      elements: {
        fire: worldState.totalFire,
        water: worldState.totalWater,
        dream: worldState.totalDream,
        nature: worldState.totalNature,
        star: worldState.totalStar,
      },
      dominantElement,
      milestones,
      buffs: finalBuffs,
      activeBuffs,
      totalPlayers: worldState.totalPlayers,
      communityGoal: finalSpinsRemaining,
    });
  } catch (error) {
    console.error('Failed to fetch world tree info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world tree info' },
      { status: 500 }
    );
  }
}

// POST - Contribute to world tree or claim buff
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, element, amount } = body;

    if (action === 'contribute') {
      // Validate element
      const validElements: ElementKey[] = ['fire', 'water', 'dream', 'nature', 'star'];
      if (!element || !validElements.includes(element)) {
        return NextResponse.json(
          { error: 'Invalid element. Must be fire, water, dream, nature, or star' },
          { status: 400 }
        );
      }

      // Validate amount
      const contributionAmount = parseInt(amount, 10);
      if (isNaN(contributionAmount) || contributionAmount < 1) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }

      // Get player profile and sanctuary
      const player = await db.playerProfile.findUnique({
        where: { userId },
        include: { sanctuary: true }
      });

      if (!player || !player.sanctuary) {
        return NextResponse.json(
          { error: 'Perfil o Santuario no encontrado' },
          { status: 404 }
        );
      }

      // Map simple element name to sanctuary field name
      const fieldMap: Record<string, string> = {
        fire: 'globalFire',
        water: 'globalWater',
        dream: 'globalDream',
        nature: 'globalNature',
        star: 'globalStar'
      };

      const sanctuaryField = fieldMap[element] as keyof typeof player.sanctuary;
      const currentPoints = player.sanctuary[sanctuaryField] as number;

      // Check if player has enough element points
      if (currentPoints < contributionAmount) {
        return NextResponse.json(
          { error: `Puntos de ${element} insuficientes`, points: currentPoints },
          { status: 400 }
        );
      }

      // REWARD CALCULATION: 10 Lumens per element point
      const lumensReward = contributionAmount * 10;
      const expReward = Math.floor(contributionAmount * 2);

      // Update in transaction
      const worldField = `total${element.charAt(0).toUpperCase() + element.slice(1)}` as
        | 'totalFire'
        | 'totalWater'
        | 'totalDream'
        | 'totalNature'
        | 'totalStar';

      await db.$transaction(async (tx) => {
        // Deduct element points and give rewards
        await tx.sanctuary.update({
          where: { id: player.sanctuary!.id },
          data: {
            [fieldMap[element]]: { decrement: contributionAmount }
          }
        });

        await tx.playerProfile.update({
          where: { id: player.id },
          data: {
            lumens: { increment: lumensReward },
            experience: { increment: expReward }
          }
        });

        // Add to world element total
        await tx.worldState.upsert({
          where: { id: 'lumora_world' },
          update: {
            [worldField]: { increment: contributionAmount },
          },
          create: {
            id: 'lumora_world',
            [worldField]: contributionAmount,
          },
        });

        // Log transaction
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'contribution_reward',
            amount: lumensReward,
            currency: 'lumens',
            metadata: {
              element,
              pointsSpent: contributionAmount,
              source: 'world_tree_altar',
            },
          },
        });
      });

      // Get updated world state
      const updatedWorld = await db.worldState.findUnique({
        where: { id: 'lumora_world' },
      });

      const newDominant = updatedWorld ? getDominantElement(updatedWorld) : element;

      return NextResponse.json({
        success: true,
        contributed: {
          element,
          amount: contributionAmount,
        },
        newLumens: player.lumens - contributionAmount,
        dominantElement: newDominant,
        elements: updatedWorld
          ? {
              fire: updatedWorld.totalFire,
              water: updatedWorld.totalWater,
              dream: updatedWorld.totalDream,
              nature: updatedWorld.totalNature,
              star: updatedWorld.totalStar,
            }
          : null,
      });
    } else if (action === 'claimBuff') {
      // No-op for now, buffs are passive
      const worldState = await db.worldState.findUnique({
        where: { id: 'lumora_world' },
      });

      if (!worldState) {
        return NextResponse.json(
          { error: 'World state not found' },
          { status: 404 }
        );
      }

      const buffs = getBuffsForLevel(worldState.treeLevel);

      return NextResponse.json({
        buffs,
        treeLevel: worldState.treeLevel,
        message: 'Buffs are passive and automatically applied',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "contribute" or "claimBuff"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('World tree action error:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción del Árbol del Mundo' },
      { status: 500 }
    );
  }
}
