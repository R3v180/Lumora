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
import { updateChallengeProgress } from '@/lib/challenges';

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

    // Calculate energy refill
    const now = new Date();
    const minutesPassed = Math.floor(
      (now.getTime() - player.energyRefillAt.getTime()) / 60000
    );
    const energyRegenerated = Math.min(
      Math.floor(minutesPassed / 5),
      player.maxEnergy - player.energy
    );

    const currentEnergy = player.energy + energyRegenerated;

    // Get World Tree level for buffs (used for energy check and spin buffs)
    let worldState = await db.worldState.findUnique({ where: { id: 'lumora_world' } });
    if (!worldState) {
      worldState = await db.worldState.create({ data: { id: 'lumora_world' } });
    }
    const treeBuffs = getBuffsForLevel(worldState.treeLevel);

    // Apply Multipliers
    // 1. Collection Multiplier
    const POWER_MAP: Record<string, number> = {
      common: 10,
      uncommon: 25,
      rare: 60,
      epic: 150,
      legendary: 400
    };
    const totalPower = player.spirits.reduce((sum, s) => sum + (POWER_MAP[s.spiritType.rarity] || 0), 0);
    const collectionMultiplier = 1.0 + (totalPower / 10000); 

    // Check if enough energy (accounting for tree buff energy regen discount)
    const effectiveEnergyCost = Math.max(0, ENERGY_COST - treeBuffs.energyRegenBonus);
    if (currentEnergy < effectiveEnergyCost) {
      return NextResponse.json(
        {
          error: 'Energía insuficiente',
          energy: currentEnergy,
          maxEnergy: player.maxEnergy, 
          totalPower, 
          collectionMultiplier,
          nextRefillMinutes: 5 - (minutesPassed % 5),
        },
        { status: 400 }
      );
    }

    const spinResult = executeSpin();

    // 1. Apply Collection Multiplier to payout
    const basePayout = spinResult.totalPayout;
    const buffedPayout = Math.floor(basePayout * collectionMultiplier * treeBuffs.lumensMultiplier);

    // 2. Energy regen bonus: effectively give back some energy
    const energyDiscount = treeBuffs.energyRegenBonus;

    // 3. Rare spirit chance bonus: re-roll spirit rewards with boosted rarity if bonus applies
    if (treeBuffs.rareSpiritBonus > 0 && spinResult.spiritsWon.length > 0) {
      for (const reward of spinResult.spiritsWon) {
        if (Math.random() < treeBuffs.rareSpiritBonus) {
          // Boost rarity by one tier
          const rarityChain: Record<string, string> = {
            common: 'uncommon',
            uncommon: 'rare',
            rare: 'epic',
            epic: 'legendary',
          };
          const boosted = rarityChain[reward.rarity];
          if (boosted) {
            reward.rarity = boosted;
          }
        }
      }
    }

    // 4. Bonus game chance bonus
    if (treeBuffs.bonusGameChance > 0 && !spinResult.bonusTriggered) {
      if (Math.random() < treeBuffs.bonusGameChance) {
        spinResult.bonusTriggered = true;
        spinResult.bonusCount = Math.max(spinResult.bonusCount, 3);
      }
    }

    // Serialize grid for storage (store symbol IDs)
    const serializedGrid = spinResult.grid.map((col) =>
      col.map((sym) => sym.id)
    );

    // Calculate new energy (with World Tree energy regen bonus)
    const energyCost = Math.max(0, ENERGY_COST - energyDiscount);
    const newEnergy = currentEnergy - energyCost;

    // Calculate new lumens (with World Tree lumens multiplier)
    const newLumens = player.lumens + buffedPayout;

    // Calculate experience (1 XP per spin + bonus for wins, using buffed payout)
    const xpGain = 1 + Math.floor(buffedPayout / 10);

    // Determine spirits to add to player collection
    const spiritRewards = spinResult.spiritsWon;

    // Check for active guild war
    let warContribution: {
      warId: string;
      guildSide: 'attacker' | 'defender';
      contributed: number;
    } | null = null;

    if (player.guild && spinResult.totalPayout > 0) {
      const activeWar = await db.guildWar.findFirst({
        where: {
          status: 'active',
          OR: [
            { attackerGuildId: player.guild.guildId },
            { defenderGuildId: player.guild.guildId },
          ],
        },
      });

      if (activeWar) {
        const isAttacker = activeWar.attackerGuildId === player.guild.guildId;
        warContribution = {
          warId: activeWar.id,
          guildSide: isAttacker ? 'attacker' : 'defender',
          contributed: spinResult.totalPayout,
        };
      }
    }

    // Update challenge progress
    await updateChallengeProgress(player.id, 'spin_combo', 1);
    if (spiritRewards.length > 0) {
      await updateChallengeProgress(player.id, 'collect_spirit', spiritRewards.length);
    }
    const elementalTotal = Object.values(spinResult.elementContributions).reduce((a, b) => a + b, 0);
    if (elementalTotal > 0) {
      await updateChallengeProgress(player.id, 'world_contribution', Math.floor(elementalTotal / 2));
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
      // Check for level up
      const expForLevel = updated.level * 100;
      if (updated.experience >= expForLevel) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: {
            level: updated.level + 1,
            experience: updated.experience - expForLevel,
            maxEnergy: updated.maxEnergy + 5,
          },
        });
      }
      // Add won spirits to player collection
      for (const reward of spiritRewards) {
        // Find the matching SpiritType in the database
        const spiritType = await tx.spiritType.findFirst({
          where: {
            element: reward.element,
            rarity: reward.rarity,
          },
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
        // Find spirits of the same element as the winning symbols
        const winningElements = [...new Set(spinResult.wins.map(w => w.symbol.element))];
        
        // Award XP to all player spirits of those elements
        // Logic: Winning spirits get XP = (payout / 10) + 5
        const spiritXpGain = Math.floor(buffedPayout / 5) + 5;

        const playerSpirits = await tx.playerSpirit.findMany({
          where: { 
            playerId: player.id,
            spiritType: { element: { in: winningElements } }
          },
          include: { spiritType: true }
        });

        for (const spirit of playerSpirits) {
          let newSpExp = spirit.experience + spiritXpGain;
          let newSpLevel = spirit.level;
          
          // Simple level up formula: Level * 50 XP
          let expNeeded = newSpLevel * 50;
          while (newSpExp >= expNeeded && newSpLevel < 100) {
            newSpExp -= expNeeded;
            newSpLevel++;
            expNeeded = newSpLevel * 50;
          }

          await tx.playerSpirit.update({
            where: { id: spirit.id },
            data: {
              experience: newSpExp,
              level: newSpLevel
            }
          });
        }
      }

      // Update sanctuary element contributions
      if (player.sanctuary && spinResult.totalPayout > 0) {
        const elementUpdates: any = {};
        for (const [element, count] of Object.entries(
          spinResult.elementContributions
        )) {
          if (count > 0) {
            const field = `global${
              element.charAt(0).toUpperCase() + element.slice(1)
            }` as keyof typeof elementUpdates;
            elementUpdates[field] = { increment: Math.floor(count / 2) };
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
        update: {
          totalSpins: { increment: 1 },
        },
        create: {
          id: 'lumora_world',
          totalSpins: 1,
        },
      });

      // Update world element contributions
      const worldElementUpdates: any = {};
      for (const [element, count] of Object.entries(
        spinResult.elementContributions
      )) {
        if (count >= 3) {
          const field = `total${
            element.charAt(0).toUpperCase() + element.slice(1)
          }` as string;
          worldElementUpdates[field] = { increment: Math.floor(count / 3) };
        }
      }

      if (Object.keys(worldElementUpdates).length > 0) {
        await tx.worldState.update({
          where: { id: 'lumora_world' },
          data: worldElementUpdates,
        });
      }

      // Log the spin
      await tx.spinLog.create({
        data: {
          playerId: player.id,
          symbols: serializedGrid,
          combination: spinResult.wins.length > 0
            ? spinResult.wins.map(w => `${w.symbol.id}×${w.count}`).join(',')
            : null,
          winAmount: spinResult.totalPayout,
          spiritsWon: spiritRewards.map(r => r.spiritTypeId),
          element: spinResult.wins.length > 0
            ? spinResult.wins[0].symbol.element
            : null,
        },
      });

      // Create transaction record for lumens
      if (spinResult.totalPayout > 0) {
        await tx.transaction.create({
          data: {
            playerId: player.id,
            type: 'reward',
            amount: spinResult.totalPayout,
            currency: 'lumens',
            metadata: {
              source: 'spin',
              wins: spinResult.wins.length,
            },
          },
        });
      }

      // Guild war contribution: add lumens won to war score
      if (warContribution) {
        await tx.guildWar.update({
          where: { id: warContribution.warId },
          data: {
            attackerScore: warContribution.guildSide === 'attacker'
              ? { increment: warContribution.contributed }
              : undefined,
            defenderScore: warContribution.guildSide === 'defender'
              ? { increment: warContribution.contributed }
              : undefined,
          },
        });
      }

      // Spin Race: add payout to active race score
      if (spinResult.totalPayout > 0) {
        const activeRace = await tx.spinRace.findFirst({
          where: { status: 'active', endsAt: { gt: new Date() } },
        });
        if (activeRace) {
          await tx.spinRaceEntry.upsert({
            where: {
              raceId_playerId: { raceId: activeRace.id, playerId: player.id },
            },
            create: {
              raceId: activeRace.id,
              playerId: player.id,
              score: spinResult.totalPayout,
            },
            update: {
              score: { increment: spinResult.totalPayout },
            },
          });
        }
      }

      // Chest drop on wins (1% chance)
      let chestDrop: { rarity: string } | null = null;
      if (spinResult.totalPayout > 0 && Math.random() < 0.01) {
        const chestRarity = Math.random() < 0.2 ? 'rare' : 'common';
        await (tx as any).playerChest.create({
          data: {
            playerId: player.id,
            type: 'spin',
            rarity: chestRarity,
            unlocksAt: new Date(Date.now() + (chestRarity === 'rare' ? 4 : 1) * 60 * 60 * 1000),
          },
        });
        chestDrop = { rarity: chestRarity };
      }

      return { updated, chestDrop, totalPower, collectionMultiplier };
    });

    // Return full spin result
    return NextResponse.json({
      // The grid with full symbol data for the frontend
      grid: spinResult.grid.map((col) =>
        col.map((sym) => ({
          id: sym.id,
          name: sym.name,
          nameEn: sym.nameEn,
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
        payout: w.payout,
        isWild: w.isWild,
      })),
      totalPayout: spinResult.totalPayout,
      isBigWin: spinResult.isBigWin,
      isMegaWin: spinResult.isMegaWin,
      spiritsWon: spiritRewards,
      elementContributions: spinResult.elementContributions,
      // Bonus trigger info
      bonusTriggered: spinResult.bonusTriggered,
      bonusCount: spinResult.bonusCount,
      // Updated player state
      player: { lumens: newLumens, energy: newEnergy, maxEnergy: player.maxEnergy, totalPower, collectionMultiplier, level: updatedPlayer.updated.level, experience: updatedPlayer.updated.experience, },
      chestDrop: updatedPlayer.chestDrop,
      // Guild war contribution info
      warContribution: warContribution ? {
        contributed: warContribution.contributed,
        side: warContribution.guildSide,
      } : null,
      // World Tree buff info
      worldBuff: treeBuffs.lumensMultiplier > 1 ? {
        lumensMultiplier: treeBuffs.lumensMultiplier,
        energyRegenBonus: treeBuffs.energyRegenBonus,
        rareSpiritBonus: treeBuffs.rareSpiritBonus,
        bonusGameChance: treeBuffs.bonusGameChance,
        source: `World Tree Lv.${worldState.treeLevel}`,
      } : null,
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
