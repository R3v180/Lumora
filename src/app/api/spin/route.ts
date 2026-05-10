import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  executeSpin,
  evaluateSpinResult,
  ReelResult,
  ENERGY_COST,
  applyNudge,
  generateReelGridWithHolds,
  detectWins,
  countElements,
  detectElementalSurges,
  detectBonusTrigger,
  determineSpiritRewards
} from '@/game/engine/spinEngine';
import { GameSymbol } from '@/game/engine/symbols';
import { updateChallengeProgress, updateAchievementProgress } from '@/lib/challenges';

import { 
  getBuffsForLevel, 
  getDominantElement, 
  getDominantAura 
} from '@/lib/worldTree';

function getMissionElement(raceId: string): string {
  const ELEMENTS = ['fire', 'water', 'nature', 'dream', 'star'];
  const charCodeSum = raceId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ELEMENTS[charCodeSum % ELEMENTS.length];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { multiplier = 1, action = 'spin', reelIndex = 0 } = await request.json();
    const validatedMultiplier = [1, 3, 5, 10].includes(multiplier) ? multiplier : 1;

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

    // Get World Tree level and Dominant Aura
    let worldState = await db.worldState.findUnique({ where: { id: 'lumora_world' } });
    if (!worldState) {
      worldState = await db.worldState.create({ data: { id: 'lumora_world' } });
    }
    const treeBuffs = getBuffsForLevel(worldState.treeLevel);
    const dominant = getDominantElement(worldState as any);
    const dominantAura = getDominantAura(dominant, worldState.treeLevel);

    // Apply Multipliers
    const POWER_MAP: Record<string, number> = {
      common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400
    };
    const totalPower = player.spirits.reduce((sum, s) => sum + (POWER_MAP[s.spiritType.rarity] || 0), 0);
    const collectionMultiplier = 1.0 + (totalPower / 10000); 

    // Check if enough energy
    const baseEnergyCost = ENERGY_COST; 
    const effectiveEnergyCost = baseEnergyCost * validatedMultiplier;

    if (currentEnergy < effectiveEnergyCost) {
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

    // 1. Get or Create GameSession
    let gameSession = await db.gameSession.findFirst({
      where: { playerId: player.id, type: 'dream_spin' }
    });

    if (!gameSession) {
      gameSession = await db.gameSession.create({
        data: {
          playerId: player.id,
          type: 'dream_spin',
          data: { grid: null, availableNudges: 0, canHold: false, holds: [false, false, false, false, false] },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }

    let sessionData = gameSession.data as any;
    let spinResult;


    if (action === 'nudge') {
      if (sessionData.availableNudges <= 0) {
        return NextResponse.json({ error: 'No tienes avances disponibles' }, { status: 400 });
      }
      const newGrid = applyNudge(sessionData.grid, reelIndex);
      spinResult = evaluateSpinResult(newGrid);
      sessionData.availableNudges--;
      sessionData.grid = newGrid;
      // After a nudge, we don't trigger NEW holds/nudges usually, 
      // but evaluateSpinResult will return them. We preserve session state or update?
      // Let's use the new ones from the engine.
      sessionData.availableNudges = spinResult.availableNudges;
      sessionData.canHold = spinResult.canHold;
    } else {
      const holds = action === 'spin_with_holds' ? sessionData.holds : [false, false, false, false, false];
      const newGrid = generateReelGridWithHolds(sessionData.grid, holds);
      spinResult = evaluateSpinResult(newGrid);
      sessionData.availableNudges = spinResult.availableNudges;
      sessionData.canHold = spinResult.canHold;
      sessionData.holds = [false, false, false, false, false];
      sessionData.grid = newGrid;
    }

    // Update Game Session
    await db.gameSession.update({
      where: { id: gameSession.id },
      data: { data: sessionData }
    });

    const totalMultiplier = collectionMultiplier * treeBuffs.lumensMultiplier * validatedMultiplier;
    const buffedPayout = Math.floor(spinResult.totalPayout * totalMultiplier);

    // Apply Water Aura (Luck: Rare Spirit & Bonus Game)
    let finalRareSpiritBonus = treeBuffs.rareSpiritBonus;
    let finalBonusGameChance = treeBuffs.bonusGameChance;
    
    if (dominantAura && dominantAura.type === 'rareSymbolChance') {
      finalRareSpiritBonus += dominantAura.value;
      finalBonusGameChance += (dominantAura.value / 2); // Half effect for bonus game
    }

    // Rare spirit chance bonus
    if (finalRareSpiritBonus > 0 && spinResult.spiritsWon.length > 0) {
      for (const reward of spinResult.spiritsWon) {
        if (Math.random() < finalRareSpiritBonus) {
          const rarityChain: Record<string, string> = {
            common: 'uncommon', uncommon: 'rare', rare: 'epic', epic: 'legendary',
          };
          const boosted = rarityChain[reward.rarity];
          if (boosted) reward.rarity = boosted;
        }
      }
    }

    // Bonus game chance bonus
    if (finalBonusGameChance > 0 && !spinResult.bonusTriggered) {
      if (Math.random() < finalBonusGameChance) {
        spinResult.bonusTriggered = true;
        spinResult.bonusCount = Math.max(spinResult.bonusCount, 3);
      }
    }

    const energyCost = effectiveEnergyCost;
    const newEnergy = currentEnergy - energyCost;
    const newLumens = player.lumens + buffedPayout;
    
    let xpGain = Math.floor((3 + Math.floor(spinResult.totalPayout / 10)) * validatedMultiplier);
    
    // Apply Star Aura (Experience)
    if (dominantAura && dominantAura.type === 'experienceGain') {
      xpGain = Math.floor(xpGain * (1 + dominantAura.value));
    }
    
    const spiritRewards = spinResult.spiritsWon;

    await updateChallengeProgress(player.id, 'spins', 1);
    if (spiritRewards.length > 0) {
      await updateChallengeProgress(player.id, 'spirits', spiritRewards.length);
    }
    const elementalTotal = Object.values(spinResult.elementContributions).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
    if (elementalTotal > 0) {
      await updateChallengeProgress(player.id, 'world_contribution', Math.floor(elementalTotal * validatedMultiplier / 2));
    }

    // 🏁 RACE PROGRESSION
    const activeRace = await db.spinRace.findFirst({
      where: { status: 'active', endsAt: { gt: new Date() } }
    });

    if (activeRace) {
      const missionElement = getMissionElement(activeRace.id);
      
      const points = (spinResult.elementContributions as any)[missionElement] || 0;
      if (points > 0) {
        const racePoints = Math.floor(points * validatedMultiplier);
        await db.spinRaceEntry.upsert({
          where: { raceId_playerId: { raceId: activeRace.id, playerId: player.id } },
          update: { score: { increment: racePoints } },
          create: { raceId: activeRace.id, playerId: player.id, score: racePoints }
        });
      }
    }

    const updatedPlayer = await db.$transaction(async (tx) => {
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

      if (buffedPayout >= 0) {
        const winningElements = [...new Set(spinResult.wins.map((w: any) => w.symbol.element))];
        const baseSpiritXp = (1 + Math.floor(buffedPayout / 10)) * validatedMultiplier;
        const spiritsToUpdate = await tx.playerSpirit.findMany({
          where: { 
            playerId: player.id,
            OR: [
              { isPlaced: true },
              { spiritType: { element: { in: winningElements as any } } } 
            ]
          },
          include: { spiritType: true }
        });

        await Promise.all(spiritsToUpdate.map(spirit => {
          const isWinner = winningElements.includes((spirit.spiritType as any)?.element || '');
          const finalXpGain = isWinner ? Math.floor(baseSpiritXp * 2) : baseSpiritXp;
          
          let adjustedXpGain = finalXpGain;
          if (dominantAura && dominantAura.type === 'experienceGain') {
            adjustedXpGain = Math.floor(adjustedXpGain * (1 + dominantAura.value));
          }
          
          let newSpExp = spirit.experience + adjustedXpGain;
          let newSpLevel = spirit.level;
          const XP_BASE: Record<string, number> = { common: 50, uncommon: 100, rare: 250, epic: 600, legendary: 1500 };
          const rarity = spirit.spiritType?.rarity || 'common';
          const xpBaseForLevel = XP_BASE[rarity] || 50;
          let expNeeded = newSpLevel * xpBaseForLevel;
          while (newSpExp >= expNeeded && newSpLevel < 100) {
            newSpExp -= expNeeded;
            newSpLevel++;
            expNeeded = newSpLevel * xpBaseForLevel;
          }
          return tx.playerSpirit.update({
            where: { id: spirit.id },
            data: { experience: newSpExp, level: newSpLevel }
          });
        }));
      }

      if (player.sanctuary && buffedPayout > 0) {
        const elementUpdates: any = {};
        for (const [element, countValue] of Object.entries(spinResult.elementContributions)) {
          const count = countValue as number;
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

      await tx.worldState.upsert({
        where: { id: 'lumora_world' },
        update: { totalSpins: { increment: validatedMultiplier } },
        create: { id: 'lumora_world', totalSpins: validatedMultiplier },
      });

      return { updated, totalPower, collectionMultiplier };
    });

    // Return full spin result with separated visual layers
    const missionElement = activeRace ? getMissionElement(activeRace.id) : 'dream';
    const missionPositions: [number, number][] = [];
    
    // Find positions of the mission element
    spinResult.grid.forEach((col, x) => {
      col.forEach((sym, y) => {
        if (sym.element === missionElement) missionPositions.push([x, y]);
      });
    });

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
        positions: w.positions,
        payout: Math.floor(w.payout * totalMultiplier),
      })),
      elementalSurges: spinResult.elementalSurges.map((s) => ({
        element: s.element,
        count: s.count,
        bonusLumens: s.bonusLumens,
        positions: s.positions,
      })),
      missionHighlights: {
        element: missionElement,
        positions: missionPositions,
        points: (spinResult.elementContributions as any)[missionElement] || 0
      },
      totalPayout: buffedPayout,
      isBigWin: buffedPayout >= 50 * validatedMultiplier, // Adjusted thresholds
      isMegaWin: buffedPayout >= 200 * validatedMultiplier,
      spiritsWon: spiritRewards,
      availableNudges: spinResult.availableNudges,
      canHold: spinResult.canHold,
      holdPositions: spinResult.holdPositions,
      player: { 
        lumens: newLumens, 
        energy: newEnergy, 
        maxEnergy: player.maxEnergy,
        level: updatedPlayer.updated.level, 
        experience: updatedPlayer.updated.experience 
      },
    });
  } catch (error) {
    console.error('Spin error:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar giro' },
      { status: 500 }
    );
  }
}
