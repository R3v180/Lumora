import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const ARENA_ENERGY_COST = 15;
const K_FACTOR = 32; // ELO K-factor

const ELEMENT_ADVANTAGE: Record<string, string> = {
  fire: 'nature',
  nature: 'water',
  water: 'fire',
  dream: 'star',
  star: 'dream',
};

function calculateElo(ratingA: number, ratingB: number, aWins: boolean): { newA: number; newB: number; change: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const scoreA = aWins ? 1 : 0;
  const change = Math.round(K_FACTOR * (scoreA - expectedA));

  return {
    newA: Math.max(0, ratingA + change),
    newB: Math.max(0, ratingB - change),
    change: Math.abs(change),
  };
}

// GET: Player arena info, defense team, opponents, ranking
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: {
        spirits: { include: { spiritType: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Find 3 opponents near ELO
    const opponents = await db.playerProfile.findMany({
      where: {
        id: { not: player.id },
        arenaDefenseTeam: { not: '[]' },
        arenaRating: {
          gte: player.arenaRating - 200,
          lte: player.arenaRating + 200,
        },
      },
      select: {
        id: true,
        displayName: true,
        level: true,
        arenaRating: true,
        arenaDefenseTeam: true,
      },
      take: 3,
      orderBy: { arenaRating: 'desc' },
    });

    // Get defense team spirit details
    const defenseIds = (player.arenaDefenseTeam as string[]) || [];
    const defenseSpirits = player.spirits
      .filter((s) => defenseIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        name: s.spiritType.name,
        element: s.spiritType.element,
        rarity: s.spiritType.rarity,
        level: s.level,
        power: s.spiritType.basePower * s.level,
      }));

    // Top 10 arena ranking
    const ranking = await db.playerProfile.findMany({
      select: {
        id: true,
        displayName: true,
        level: true,
        arenaRating: true,
      },
      orderBy: { arenaRating: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      rating: player.arenaRating,
      defenseTeam: defenseSpirits,
      defenseIds,
      opponents: opponents.map((o) => ({
        id: o.id,
        displayName: o.displayName,
        level: o.level,
        rating: o.arenaRating,
      })),
      ranking: ranking.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        displayName: r.displayName,
        level: r.level,
        rating: r.arenaRating,
        isYou: r.id === player.id,
      })),
      spirits: player.spirits.map((s) => ({
        id: s.id,
        name: s.spiritType.name,
        element: s.spiritType.element,
        rarity: s.spiritType.rarity,
        level: s.level,
        power: s.spiritType.basePower * s.level,
      })),
    });
  } catch (error) {
    console.error('Arena GET error:', error);
    return NextResponse.json({ error: 'Error loading arena' }, { status: 500 });
  }
}

// POST: Set defense or attack
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action } = body;

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: {
        spirits: { include: { spiritType: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // SET DEFENSE
    if (action === 'setDefense') {
      const { spiritIds } = body;
      if (!Array.isArray(spiritIds) || spiritIds.length !== 3) {
        return NextResponse.json({ error: 'Selecciona 3 espíritus' }, { status: 400 });
      }

      const valid = spiritIds.every((id: string) => player.spirits.some((s) => s.id === id));
      if (!valid) {
        return NextResponse.json({ error: 'Espíritus no válidos' }, { status: 400 });
      }

      await db.playerProfile.update({
        where: { id: player.id },
        data: { arenaDefenseTeam: spiritIds },
      });

      return NextResponse.json({ success: true });
    }

    // ATTACK
    if (action === 'attack') {
      const { opponentId } = body;

      if (!opponentId) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
      }

      if (player.energy < ARENA_ENERGY_COST) {
        return NextResponse.json({ error: 'Energía insuficiente' }, { status: 400 });
      }

      const opponent = await db.playerProfile.findUnique({
        where: { id: opponentId },
        include: {
          spirits: { include: { spiritType: true } },
        },
      });

      if (!opponent) {
        return NextResponse.json({ error: 'Oponente no encontrado' }, { status: 404 });
      }

      // Get defender spirits
      const defenseIds = (opponent.arenaDefenseTeam as string[]) || [];
      const defenseSpirits = opponent.spirits.filter((s) => defenseIds.includes(s.id));

      // Generate 3 random spins
      const ELEMENTS = ['fire', 'water', 'nature', 'dream', 'star'];
      const attackSpins = Array.from({ length: 3 }, () => ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]);

      // Calculate power with elemental advantages positionally
      let attackPower = 0;
      let defensePower = 0;

      for (let i = 0; i < 3; i++) {
        const attackElement = attackSpins[i];
        const defenseSpirit = defenseSpirits[i];
        
        let aPower = player.level * 250;
        let dPower = defenseSpirit ? (defenseSpirit.spiritType.basePower * defenseSpirit.level) : (opponent.level * 200);
        const defenseElement = defenseSpirit ? defenseSpirit.spiritType.element : 'fire';

        if (ELEMENT_ADVANTAGE[attackElement] === defenseElement) {
          aPower *= 1.5;
        } else if (ELEMENT_ADVANTAGE[defenseElement] === attackElement) {
          dPower *= 1.5;
        } else if (attackElement === 'star') {
          aPower *= 1.2;
        }

        attackPower += aPower;
        defensePower += dPower;
      }

      // Add RNG variance ±10%
      attackPower = Math.floor(attackPower * (0.9 + Math.random() * 0.2));
      defensePower = Math.floor(defensePower * (0.9 + Math.random() * 0.2));

      const attackerWins = attackPower >= defensePower;
      const winnerId = attackerWins ? player.id : opponent.id;

      // Calculate ELO
      const elo = calculateElo(player.arenaRating, opponent.arenaRating, attackerWins);

      // Apply in transaction
      const result = await db.$transaction(async (tx) => {
        // Deduct energy
        await tx.playerProfile.update({
          where: { id: player.id },
          data: {
            energy: { decrement: ARENA_ENERGY_COST },
            arenaRating: elo.newA,
          },
        });

        // Update opponent rating
        await tx.playerProfile.update({
          where: { id: opponent.id },
          data: { arenaRating: elo.newB },
        });

        // Log match
        await tx.arenaMatch.create({
          data: {
            attackerId: player.id,
            defenderId: opponent.id,
            attackerSpirits: attackSpins,
            defenderSpirits: defenseIds,
            winnerId,
            ratingChange: elo.change,
          },
        });

        // Reward winner with lumens
        const lumensReward = attackerWins ? 50 + elo.change : 10;
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { lumens: { increment: lumensReward } },
        });

        return {
          victory: attackerWins,
          spins: attackSpins,
          attackPower,
          defensePower,
          ratingChange: attackerWins ? elo.change : -elo.change,
          newRating: elo.newA,
          lumensReward,
          newEnergy: player.energy - ARENA_ENERGY_COST,
          newLumens: player.lumens + lumensReward,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Arena POST error:', error);
    return NextResponse.json({ error: 'Error en arena' }, { status: 500 });
  }
}
