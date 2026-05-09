import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  executeSpin,
  ReelResult,
  ENERGY_COST,
} from '@/game/engine/spinEngine';
import { GameSymbol } from '@/game/engine/symbols';
import { updateChallengeProgress, updateAchievementProgress } from '@/lib/challenges';

// World Tree buff helpers
interface TreeBuff {
  lumensMultiplier: number;
  energyRegenBonus: number;
  rareSpiritBonus: number;
  bonusGameChance: number;
}

function getBuffsForLevel(level: number): TreeBuff {
  if (level >= 21) {
    return { lumensMultiplier: 1.2, energyRegenBonus: 3, rareSpiritBonus: 0.1, bonusGameChance: 0.05 };
  } else if (level >= 16) {
    return { lumensMultiplier: 1.15, energyRegenBonus: 2, rareSpiritBonus: 0.05, bonusGameChance: 0 };
  } else if (level >= 11) {
    return { lumensMultiplier: 1.1, energyRegenBonus: 1, rareSpiritBonus: 0, bonusGameChance: 0 };
  } else if (level >= 6) {
    return { lumensMultiplier: 1.05, energyRegenBonus: 0, rareSpiritBonus: 0, bonusGameChance: 0 };
  }
  return { lumensMultiplier: 1, energyRegenBonus: 0, rareSpiritBonus: 0, bonusGameChance: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { multiplier = 1 } = await request.json();
    const validatedMultiplier = [1, 3, 5, 10].includes(multiplier) ? multiplier : 1;

    console.log(`[SPIN DEBUG] Incoming Multiplier: ${multiplier}, Validated: ${validatedMultiplier}`);

    // Get player profile
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { 
        sanctuary: true, 
        guild: true,
        spirits: { include: { spiritType: true } }
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Calculate energy refill (Fixed Overfill Logic)
    const now = new Date();
    const refillAt = player.energyRefillAt;
    const minutesPassed = Math.floor((now.getTime() - refillAt.getTime()) / 60000);
    
    let energyRegenerated = 0;
    if (player.energy < player.maxEnergy) {
      energyRegenerated = Math.min(
        Math.floor(minutesPassed / 5),
        player.maxEnergy - player.energy
      );
    }

    const currentEnergy = player.energy + energyRegenerated;
    console.log(`[SPIN DEBUG] Current Energy (with regen): ${currentEnergy}`);

    // Get World Tree level for buffs
    let worldState = await db.worldState.findUnique({ where: { id: 'lumora_world' } });
    if (!worldState) {
      worldState = await db.worldState.create({ data: { id: 'lumora_world' } });
    }
    const treeBuffs = getBuffsForLevel(worldState.treeLevel);

    // Apply Multipliers
    const POWER_MAP: Record<string, number> = {
      common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400
    };
    const totalPower = player.spirits.reduce((sum, s) => sum + (POWER_MAP[s.spiritType.rarity] || 0), 0);
    const collectionMultiplier = 1.0 + (totalPower / 10000); 

    // Check if enough energy with MULTIPLIER
    const baseEnergyCost = ENERGY_COST; // Fix at 5 base
    const effectiveEnergyCost = baseEnergyCost * validatedMultiplier;

    console.log(`[SPIN DEBUG] Base Cost: ${baseEnergyCost}, Effective Cost: ${effectiveEnergyCost}`);

    if (currentEnergy < effectiveEnergyCost) {
      console.log(`[SPIN DEBUG] FAILED: Not enough energy. Needs ${effectiveEnergyCost}, has ${currentEnergy}`);
      return NextResponse.json(
        {
          error: 'Energía insuficiente',
          energy: currentEnergy,
          maxEnergy: player.maxEnergy, 
          multiplier: validatedMultiplier,
          cost: effectiveEnergyCost
        },
        { status: 400 }
      );
    }

    const spinResult = executeSpin();

    // Final multiplier that affects EVERYTHING
    const totalMultiplier = collectionMultiplier * treeBuffs.lumensMultiplier * validatedMultiplier;

    // Apply Multiplier to payout
    const buffedPayout = Math.floor(spinResult.totalPayout * totalMultiplier);

    // 2. Rare spirit chance bonus...
    if (treeBuffs.rareSpiritBonus > 0 && spinResult.spiritsWon.length > 0) {
      for (const reward of spinResult.spiritsWon) {
        if (Math.random() < treeBuffs.rareSpiritBonus) {
          const rarityChain: Record<string, string> = {
            common: 'uncommon', uncommon: 'rare', rare: 'epic', epic: 'legendary',
          };
          const boosted = rarityChain[reward.rarity];
          if (boosted) reward.rarity = boosted;
        }
      }
    }

    // 3. Bonus game chance bonus...
    if (treeBuffs.bonusGameChance > 0 && !spinResult.bonusTriggered) {
      if (Math.random() < treeBuffs.bonusGameChance) {
        spinResult.bonusTriggered = true;
        spinResult.bonusCount = Math.max(spinResult.bonusCount, 3);
      }
    }

    // Serialize grid for storage
    const serializedGrid = spinResult.grid.map((col) => col.map((sym) => sym.id));

    // Final Stats
    const energyCost = effectiveEnergyCost;
    const newEnergy = currentEnergy - energyCost;
    const newLumens = player.lumens + buffedPayout;
    const xpGain = Math.floor((3 + Math.floor(spinResult.totalPayout / 10)) * validatedMultiplier);

    // Determine spirits to add to player collection
    const spiritRewards = spinResult.spiritsWon;

    // Update challenge progress
    await updateChallengeProgress(player.id, 'spins', 1);
    if (spiritRewards.length > 0) {
      await updateChallengeProgress(player.id, 'spirits', spiritRewards.length);
    }
    const elementalTotal = Object.values(spinResult.elementContributions).reduce((a, b) => a + b, 0);
    if (elementalTotal > 0) {
      await updateChallengeProgress(player.id, 'world_contribution', Math.floor(elementalTotal * validatedMultiplier / 2));
    }

    // Update player data in a transaction
    const updatedPlayer = await db.$transaction(async (tx) => {
      // Update energy and lumens
      const updated = await tx.playerProfile.update({
        where: { id: player.id },
        data: {
          energy: newEnergy,
          energyRefillAt: energyRegenerated > 0
            ? new Date(now.getTime() - ((minutesPassed % 5) * 60000))
            : player.energyRefillAt,
          lumens: newLumens,
          experience: player.experience + xpGain,
        },
      });
      // ... (level up, spirits, etc.)
      
      // Update won spirits to player collection
      for (const reward of spiritRewards) {
        const spiritType = await tx.spiritType.findFirst({
          where: { element: reward.element, rarity: reward.rarity },
          orderBy: { basePower: 'asc' },
        });

        if (spiritType) {
          await tx.playerSpirit.create({
            data: {
              playerId: player.id,
              spiritTypeId: spiritType.id,
              level: 1,
              experience: 0,
            },
          });
        }
      }

      // 4. Award XP to spirits involved in the win
      if (spinResult.wins.length > 0) {
        const winningElements = [...new Set(spinResult.wins.map(w => w.symbol.element))];
        const spiritXpGain = Math.floor(buffedPayout / 5) + 5;

        const playerSpirits = await tx.playerSpirit.findMany({
          where: { 
            playerId: player.id,
            spiritType: { element: { in: winningElements } }
          },
        });

        await Promise.all(playerSpirits.map(spirit => {
          let newSpExp = spirit.experience + spiritXpGain;
          let newSpLevel = spirit.level;
          let expNeeded = newSpLevel * 50;
          while (newSpExp >= expNeeded && newSpLevel < 100) {
            newSpExp -= expNeeded;
            newSpLevel++;
            expNeeded = newSpLevel * 50;
          }

          return tx.playerSpirit.update({
            where: { id: spirit.id },
            data: { experience: newSpExp, level: newSpLevel }
          });
        }));
      }

      // Sanctuary updates...
      if (player.sanctuary && buffedPayout > 0) {
        const elementUpdates: any = {};
        for (const [element, count] of Object.entries(spinResult.elementContributions)) {
          if (count > 0) {
            const field = `global${element.charAt(0).toUpperCase() + element.slice(1)}` as any;
            elementUpdates[field] = { increment: Math.floor(count * validatedMultiplier / 2) };
          }
        }
        if (Object.keys(elementUpdates).length > 0) {
          await tx.sanctuary.update({
            where: { id: player.sanctuary.id },
            data: elementUpdates,
          });
        }
      }

      // Update world state
      await tx.worldState.upsert({
        where: { id: 'lumora_world' },
        update: { totalSpins: { increment: validatedMultiplier } },
        create: { id: 'lumora_world', totalSpins: validatedMultiplier },
      });

      // ... (world element updates, logging, etc.)

      return { updated, chestDrop: null, totalPower, collectionMultiplier };
    });

    // Return full spin result
    return NextResponse.json({
      grid: spinResult.grid.map((col) =>
        col.map((sym) => ({
          id: sym.id,
          name: sym.name,
          element: sym.element,
          rarity: sym.rarity,
          symbolType: sym.symbolType,
          emoji: sym.emoji,
          color: sym.color,
          glowColor: sym.glowColor,
        }))
      ),
      wins: spinResult.wins.map((w) => ({
        symbolId: w.symbol.id,
        symbolName: w.symbol.name,
        symbolEmoji: w.symbol.emoji,
        element: w.symbol.element,
        positions: w.positions,
        count: w.count,
        payout: Math.floor(w.payout * totalMultiplier), // Multiplied payout per line
        isWild: w.isWild,
      })),
      totalPayout: buffedPayout, // Multiplied total payout
      isBigWin: buffedPayout >= 500 * validatedMultiplier,
      isMegaWin: buffedPayout >= 2000 * validatedMultiplier,
      spiritsWon: spiritRewards,
      elementContributions: spinResult.elementContributions,
      bonusTriggered: spinResult.bonusTriggered,
      bonusCount: spinResult.bonusCount,
      player: { lumens: newLumens, energy: newEnergy, maxEnergy: player.maxEnergy, totalPower, collectionMultiplier, level: updatedPlayer.updated.level, experience: updatedPlayer.updated.experience, },
      buffedPayout,
    });
  } catch (error) {
    console.error('Spin error:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar giro' },
      { status: 500 }
    );
  }
}
