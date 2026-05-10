import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  getBuffsForLevel, 
  getDominantElement, 
  getDominantAura,
  spinsForLevel, 
  totalSpinsForLevel,
  ElementKey
} from '@/lib/worldTree';

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
    const finalDominant = dominantElement;

    // Recalculate with updated level
    const finalCurrentLevelSpins = totalSpinsForLevel(finalLevel);
    const finalSpinsNeededForNext = spinsForLevel(finalLevel);
    const finalSpinsInCurrentLevel = worldState.totalSpins - finalCurrentLevelSpins;
    const finalProgressPercent = Math.min(
      100,
      Math.round((finalSpinsInCurrentLevel / finalSpinsNeededForNext) * 100)
    );
    const finalSpinsRemaining = Math.max(0, finalSpinsNeededForNext - finalSpinsInCurrentLevel);

    const milestones: { level: number; reached: boolean }[] = [];
    const milestoneLevels = [5, 6, 10, 11, 15, 16, 20, 21];
    for (const ml of milestoneLevels) {
      milestones.push({ level: ml, reached: ml <= finalLevel });
    }

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

    // Add Dominant Aura Buff
    const dominantAura = getDominantAura(finalDominant, finalLevel);
    if (dominantAura) {
      activeBuffs.push(dominantAura);
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
        include: { 
          sanctuary: true,
          guild: true
        }
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

        // GUILD XP REWARD
        if (player.guild) {
           const guildXpReward = Math.floor(contributionAmount / 2);
           const guild = await tx.guild.findUnique({
              where: { id: player.guild.guildId }
           });
           
           if (guild) {
              let newLevel = guild.level;
              let newExperience = guild.experience + guildXpReward;
              const xpToNext = guild.level * 2500;

              if (newExperience >= xpToNext) {
                 newLevel += 1;
                 newExperience -= xpToNext;
              }

              await tx.guild.update({
                 where: { id: guild.id },
                 data: {
                    experience: newExperience,
                    level: newLevel
                 }
              });
           }
        }

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
