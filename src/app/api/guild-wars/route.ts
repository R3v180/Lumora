import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const WAR_DECLARE_COST = 5000;
const WAR_DURATION_HOURS = 24;
const WAR_START_DELAY_HOURS = 1;
const WINNER_BONUS_LUMENS = 1000;
const WINNER_RETURN_MULTIPLIER = 2;
const LOSER_RETURN_MULTIPLIER = 0.5;

const RESOLUTION_BUFFER_MS = 10_000; // 10-second buffer to avoid edge-case timing

// Helper: resolve any ended wars for a guild
async function resolveEndedWars(guildId: string) {
  const now = new Date();
  const bufferTime = new Date(now.getTime() - RESOLUTION_BUFFER_MS);

  // Find ended wars for this guild (both upcoming→active and active→completed)
  const endedWars = await db.guildWar.findMany({
    where: {
      OR: [
        { status: 'upcoming', startsAt: { lte: bufferTime } },
        { status: 'active', endsAt: { lte: bufferTime } },
      ],
      AND: [
        {
          OR: [
            { attackerGuildId: guildId },
            { defenderGuildId: guildId },
          ],
        }
      ]
    },
    include: {
      attacker: { select: { id: true, name: true, emblem: true, treasury: true, experience: true, level: true } },
      defender: { select: { id: true, name: true, emblem: true, treasury: true, experience: true, level: true } },
    },
  });

  for (const war of endedWars) {
    try {
      if (war.status === 'active') {
        // Active war has ended — resolve it with rewards
        let winnerId: string | null = null;

        if (war.attackerScore > war.defenderScore) {
          winnerId = war.attackerGuildId;
        } else if (war.defenderScore > war.attackerScore) {
          winnerId = war.defenderGuildId;
        }
        // draw: winnerId stays null

        // Calculate rewards
        const attackerIsWinner = winnerId === war.attackerGuildId;
        const defenderIsWinner = winnerId === war.defenderGuildId;

        const attackerReward = attackerIsWinner
          ? Math.floor(war.attackerScore * WINNER_RETURN_MULTIPLIER) + WINNER_BONUS_LUMENS
          : Math.floor(war.attackerScore * LOSER_RETURN_MULTIPLIER);

        const defenderReward = defenderIsWinner
          ? Math.floor(war.defenderScore * WINNER_RETURN_MULTIPLIER) + WINNER_BONUS_LUMENS
          : Math.floor(war.defenderScore * LOSER_RETURN_MULTIPLIER);

        const attackerXpGain = attackerIsWinner ? 500 : 100;
        const defenderXpGain = defenderIsWinner ? 500 : 100;

        await db.$transaction(async (tx) => {
          // Attempt atomic update to lock/resolve the war
          const updatedWar = await tx.guildWar.updateMany({
            where: { 
              id: war.id,
              status: 'active'
            },
            data: {
              status: 'completed',
              winnerId,
            },
          });

          // If no rows were updated, another process already resolved it.
          if (updatedWar.count === 0) {
            return;
          }

          // Reward attacker guild
          await tx.guild.update({
            where: { id: war.attackerGuildId },
            data: {
              treasury: { increment: attackerReward },
              experience: { increment: attackerXpGain },
            },
          });

          // Reward defender guild
          await tx.guild.update({
            where: { id: war.defenderGuildId },
            data: {
              treasury: { increment: defenderReward },
              experience: { increment: defenderXpGain },
            },
          });
        });
      } else if (war.status === 'upcoming') {
        // Upcoming war should start — transition to active
        await db.guildWar.updateMany({
          where: { 
            id: war.id,
            status: 'upcoming'
          },
          data: { status: 'active' },
        });
      }
    } catch (err) {
      console.error('Error resolving war:', war.id, err);
    }
  }
}

// GET /api/guild-wars - Get guild war info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { guild: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Not in a guild
    if (!player.guild) {
      return NextResponse.json({
        inGuild: false,
        activeWar: null,
        upcomingWars: [],
        recentWars: [],
      });
    }

    const guildId = player.guild.guildId;

    // Resolve any ended wars first
    await resolveEndedWars(guildId);

    const now = new Date();

    // Get active war
    const activeWar = await db.guildWar.findFirst({
      where: {
        status: 'active',
        OR: [
          { attackerGuildId: guildId },
          { defenderGuildId: guildId },
        ],
      },
      include: {
        attacker: {
          select: {
            id: true,
            name: true,
            emblem: true,
            level: true,
            members: { select: { playerId: true } },
          },
        },
        defender: {
          select: {
            id: true,
            name: true,
            emblem: true,
            level: true,
            members: { select: { playerId: true } },
          },
        },
      },
    });

    // Get upcoming wars
    const upcomingWars = await db.guildWar.findMany({
      where: {
        status: 'upcoming',
        OR: [
          { attackerGuildId: guildId },
          { defenderGuildId: guildId },
        ],
      },
      include: {
        attacker: { select: { id: true, name: true, emblem: true, level: true } },
        defender: { select: { id: true, name: true, emblem: true, level: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    // Get recent completed wars (last 5)
    const recentWars = await db.guildWar.findMany({
      where: {
        status: 'completed',
        OR: [
          { attackerGuildId: guildId },
          { defenderGuildId: guildId },
        ],
      },
      include: {
        attacker: { select: { id: true, name: true, emblem: true } },
        defender: { select: { id: true, name: true, emblem: true } },
      },
      orderBy: { endsAt: 'desc' },
      take: 5,
    });

    // Build response
    let activeWarResponse: Record<string, any> | null = null;
    let topContributors: any[] = [];
    let playerContribution = 0;

    if (activeWar) {
      const attackerMemberIds = activeWar.attacker.members.map(m => m.playerId);
      const defenderMemberIds = activeWar.defender.members.map(m => m.playerId);
      const allMemberIds = [...attackerMemberIds, ...defenderMemberIds];

      // Get top contributors from SpinLog during war period
      const contributorData = await db.spinLog.groupBy({
        by: ['playerId'],
        where: {
          playerId: { in: allMemberIds },
          createdAt: {
            gte: activeWar.startsAt,
            lte: activeWar.endsAt,
          },
          winAmount: { gt: 0 },
        },
        _sum: {
          winAmount: true,
        },
        orderBy: {
          _sum: {
            winAmount: 'desc',
          },
        },
        take: 10,
      });

      // Get player display names for contributors
      const contributorIds = contributorData.map(c => c.playerId);
      const contributors = await db.playerProfile.findMany({
        where: { id: { in: contributorIds } },
        select: { id: true, displayName: true, level: true },
      });

      const contributorMap = new Map(contributors.map(c => [c.id, c]));

      topContributors = contributorData.map((c, idx) => {
        const playerInfo = contributorMap.get(c.playerId);
        const isAttacker = attackerMemberIds.includes(c.playerId);
        return {
          rank: idx + 1,
          playerId: c.playerId,
          displayName: playerInfo?.displayName || '???',
          level: playerInfo?.level || 1,
          contribution: c._sum.winAmount || 0,
          side: isAttacker ? 'attacker' : 'defender',
        };
      });

      // Get current player's contribution
      const myContrib = await db.spinLog.aggregate({
        where: {
          playerId: player.id,
          createdAt: {
            gte: activeWar.startsAt,
            lte: activeWar.endsAt,
          },
          winAmount: { gt: 0 },
        },
        _sum: {
          winAmount: true,
        },
      });
      playerContribution = myContrib._sum.winAmount || 0;

      const isAttacker = activeWar.attackerGuildId === guildId;
      const timeRemaining = Math.max(0, activeWar.endsAt.getTime() - now.getTime());

      activeWarResponse = {
        id: activeWar.id,
        attackerGuild: {
          id: activeWar.attacker.id,
          name: activeWar.attacker.name,
          emblem: activeWar.attacker.emblem,
          level: activeWar.attacker.level,
          score: activeWar.attackerScore,
          participantCount: activeWar.attacker.members.length,
        },
        defenderGuild: {
          id: activeWar.defender.id,
          name: activeWar.defender.name,
          emblem: activeWar.defender.emblem,
          level: activeWar.defender.level,
          score: activeWar.defenderScore,
          participantCount: activeWar.defender.members.length,
        },
        isAttacker,
        timeRemaining,
        startedAt: activeWar.startsAt,
        endsAt: activeWar.endsAt,
      };
    }

    return NextResponse.json({
      inGuild: true,
      guildId,
      role: player.guild.role,
      activeWar: activeWarResponse,
      topContributors,
      playerContribution,
      upcomingWars: upcomingWars.map(w => ({
        id: w.id,
        attackerGuild: {
          id: w.attacker.id,
          name: w.attacker.name,
          emblem: w.attacker.emblem,
          level: w.attacker.level,
        },
        defenderGuild: {
          id: w.defender.id,
          name: w.defender.name,
          emblem: w.defender.emblem,
          level: w.defender.level,
        },
        startsAt: w.startsAt,
        endsAt: w.endsAt,
        timeUntilStart: Math.max(0, new Date(w.startsAt).getTime() - now.getTime()),
      })),
      recentWars: recentWars.map(w => {
        const isAttackerSide = w.attackerGuildId === guildId;
        const won = w.winnerId === guildId;
        const draw = w.winnerId === null;
        return {
          id: w.id,
          attackerGuild: {
            id: w.attacker.id,
            name: w.attacker.name,
            emblem: w.attacker.emblem,
          },
          defenderGuild: {
            id: w.defender.id,
            name: w.defender.name,
            emblem: w.defender.emblem,
          },
          attackerScore: w.attackerScore,
          defenderScore: w.defenderScore,
          winnerId: w.winnerId,
          result: draw ? 'draw' : won ? 'victory' : 'defeat',
          endedAt: w.endsAt,
        };
      }),
    });
  } catch (error) {
    console.error('Guild wars fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener guerras de gremio' },
      { status: 500 }
    );
  }
}

// POST /api/guild-wars - Guild war actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, targetGuildId, spiritId, spiritIds } = body;

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { guild: { include: { guild: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (!player.guild) {
      return NextResponse.json({ error: 'No estás en un gremio' }, { status: 400 });
    }

    const guildId = player.guild.guildId;
    const role = player.guild.role;

    // === DECLARE WAR ===
    if (action === 'declare') {
      // Only owner/officer can declare
      if (role !== 'owner' && role !== 'officer') {
        return NextResponse.json(
          { error: 'Solo el líder u oficial puede declarar guerra' },
          { status: 403 }
        );
      }

      if (!targetGuildId) {
        return NextResponse.json(
          { error: 'Debes seleccionar un gremio objetivo' },
          { status: 400 }
        );
      }

      // Can't declare war on your own guild
      if (targetGuildId === guildId) {
        return NextResponse.json(
          { error: 'No puedes declarar guerra a tu propio gremio' },
          { status: 400 }
        );
      }

      // Check if guild already has an active or upcoming war
      const existingWar = await db.guildWar.findFirst({
        where: {
          status: { in: ['upcoming', 'active'] },
          OR: [
            { attackerGuildId: guildId },
            { defenderGuildId: guildId },
            { attackerGuildId: targetGuildId },
            { defenderGuildId: targetGuildId },
          ],
        },
      });

      if (existingWar) {
        return NextResponse.json(
          { error: 'Ya hay una guerra activa o próxima para uno de los gremios' },
          { status: 400 }
        );
      }

      // Check if target guild exists
      const targetGuild = await db.guild.findUnique({
        where: { id: targetGuildId },
      });

      if (!targetGuild) {
        return NextResponse.json(
          { error: 'Gremio objetivo no encontrado' },
          { status: 404 }
        );
      }

      // Check treasury
      const guild = player.guild.guild;
      if (guild.treasury < WAR_DECLARE_COST) {
        return NextResponse.json(
          { error: `El tesoro del gremio necesita al menos ${WAR_DECLARE_COST} Lumens` },
          { status: 400 }
        );
      }

      const now = new Date();
      const startsAt = new Date(now.getTime() + WAR_START_DELAY_HOURS * 60 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + WAR_DURATION_HOURS * 60 * 60 * 1000);

      const war = await db.$transaction(async (tx) => {
        // Deduct from treasury
        await tx.guild.update({
          where: { id: guildId },
          data: { treasury: { decrement: WAR_DECLARE_COST } },
        });

        // Create war
        const newWar = await tx.guildWar.create({
          data: {
            attackerGuildId: guildId,
            defenderGuildId: targetGuildId,
            attackerScore: 0,
            defenderScore: 0,
            status: 'upcoming',
            startsAt,
            endsAt,
          },
        });

        return newWar;
      });

      return NextResponse.json({
        success: true,
        war: {
          id: war.id,
          attackerGuildId: guildId,
          defenderGuildId: targetGuildId,
          status: war.status,
          startsAt: war.startsAt,
          endsAt: war.endsAt,
        },
      });
    }

    // === CONTRIBUTE (sacrifice spirits for war points) ===
    if (action === 'contribute') {
      // Must have an active war
      const activeWar = await db.guildWar.findFirst({
        where: {
          status: 'active',
          OR: [
            { attackerGuildId: guildId },
            { defenderGuildId: guildId },
          ],
        },
      });

      if (!activeWar) {
        return NextResponse.json(
          { error: 'No hay guerra activa' },
          { status: 400 }
        );
      }

      // Player can sacrifice a spirit for war points
      // Player can sacrifice a spirit for war points
      const idsToProcess = spiritIds || (spiritId ? [spiritId] : []);
      if (idsToProcess.length === 0) {
        return NextResponse.json(
          { error: 'Debes seleccionar al menos un espíritu para sacrificar' },
          { status: 400 }
        );
      }

      const spirits = await db.playerSpirit.findMany({
        where: {
          id: { in: idsToProcess },
          playerId: player.id,
        },
        include: { spiritType: true },
      });

      if (spirits.length === 0) {
        return NextResponse.json(
          { error: 'Espíritus no encontrados o no te pertenecen' },
          { status: 404 }
        );
      }

      // Calculate war points based on spirit rarity and level
      const rarityMultiplier: Record<string, number> = {
        common: 10,
        uncommon: 25,
        rare: 50,
        epic: 100,
        legendary: 250,
      };

      let totalWarPoints = 0;
      for (const spirit of spirits) {
        totalWarPoints += (rarityMultiplier[spirit.spiritType.rarity] || 10) * spirit.level;
      }

      const isAttacker = activeWar.attackerGuildId === guildId;

      await db.$transaction(async (tx) => {
        // Remove the spirits
        await tx.playerSpirit.deleteMany({ where: { id: { in: spirits.map(s => s.id) } } });

        // Add to war score
        await tx.guildWar.update({
          where: { id: activeWar.id },
          data: {
            attackerScore: isAttacker ? { increment: totalWarPoints } : undefined,
            defenderScore: !isAttacker ? { increment: totalWarPoints } : undefined,
          },
        });

        // Log transactions
        for (const spirit of spirits) {
          const spiritPoints = (rarityMultiplier[spirit.spiritType.rarity] || 10) * spirit.level;
          await tx.transaction.create({
            data: {
              playerId: player.id,
              type: 'war_contribution',
              amount: spiritPoints,
              currency: 'war_points',
              metadata: {
                warId: activeWar.id,
                spiritId: spirit.id,
                spiritType: spirit.spiritType.name,
                rarity: spirit.spiritType.rarity,
                level: spirit.level,
              },
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        warPoints: totalWarPoints,
        spiritCount: spirits.length,
      });
    }

    // === SURRENDER ===
    if (action === 'surrender') {
      // Only owner can surrender
      if (role !== 'owner') {
        return NextResponse.json(
          { error: 'Solo el líder puede rendirse' },
          { status: 403 }
        );
      }

      const activeWar = await db.guildWar.findFirst({
        where: {
          status: 'active',
          OR: [
            { attackerGuildId: guildId },
            { defenderGuildId: guildId },
          ],
        },
      });

      if (!activeWar) {
        return NextResponse.json(
          { error: 'No hay guerra activa' },
          { status: 400 }
        );
      }

      // Winner is the other guild
      const winnerId = activeWar.attackerGuildId === guildId
        ? activeWar.defenderGuildId
        : activeWar.attackerGuildId;

      // Calculate rewards
      const isAttacker = activeWar.attackerGuildId === guildId;
      const attackerReward = !isAttacker
        ? Math.floor(activeWar.attackerScore * WINNER_RETURN_MULTIPLIER) + WINNER_BONUS_LUMENS
        : Math.floor(activeWar.attackerScore * LOSER_RETURN_MULTIPLIER);

      const defenderReward = isAttacker
        ? Math.floor(activeWar.defenderScore * WINNER_RETURN_MULTIPLIER) + WINNER_BONUS_LUMENS
        : Math.floor(activeWar.defenderScore * LOSER_RETURN_MULTIPLIER);

      await db.$transaction(async (tx) => {
        await tx.guildWar.update({
          where: { id: activeWar.id },
          data: {
            status: 'completed',
            winnerId,
          },
        });

        // Reward attacker
        await tx.guild.update({
          where: { id: activeWar.attackerGuildId },
          data: {
            treasury: { increment: attackerReward },
            experience: { increment: !isAttacker ? 500 : 100 },
          },
        });

        // Reward defender
        await tx.guild.update({
          where: { id: activeWar.defenderGuildId },
          data: {
            treasury: { increment: defenderReward },
            experience: { increment: isAttacker ? 500 : 100 },
          },
        });
      });

      return NextResponse.json({
        success: true,
        result: 'surrender',
        winnerId,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Guild war action error:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción de guerra' },
      { status: 500 }
    );
  }
}
