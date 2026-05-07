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
      include: { sanctuary: true },
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

    // Check if enough energy
    if (currentEnergy < ENERGY_COST) {
      return NextResponse.json(
        {
          error: 'Energía insuficiente',
          energy: currentEnergy,
          maxEnergy: player.maxEnergy,
          nextRefillMinutes: 5 - (minutesPassed % 5),
        },
        { status: 400 }
      );
    }

    // Execute spin
    const spinResult: ReelResult = executeSpin();

    // Serialize grid for storage (store symbol IDs)
    const serializedGrid = spinResult.grid.map((col) =>
      col.map((sym) => sym.id)
    );

    // Calculate new energy
    const newEnergy = currentEnergy - ENERGY_COST;

    // Calculate new lumens
    const newLumens = player.lumens + spinResult.totalPayout;

    // Calculate experience (1 XP per spin + bonus for wins)
    const xpGain = 1 + Math.floor(spinResult.totalPayout / 10);

    // Determine spirits to add to player collection
    const spiritRewards = spinResult.spiritsWon;

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
            },
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

      return updated;
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
      // Updated player state
      player: {
        lumens: newLumens,
        energy: newEnergy,
        maxEnergy: player.maxEnergy,
        level: updatedPlayer.level,
        experience: updatedPlayer.experience,
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
