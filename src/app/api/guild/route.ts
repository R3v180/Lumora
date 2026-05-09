import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/guild - Get current guild info or search guilds
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: {
        guild: {
          include: {
            guild: {
              include: {
                members: {
                  include: {
                    player: {
                      select: {
                        id: true,
                        displayName: true,
                        level: true,
                        sanctuaryLevel: true,
                        lumens: true,
                        user: { select: { image: true } },
                      },
                    },
                  },
                  orderBy: { joinedAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const searchQuery = request.nextUrl.searchParams.get('search');

    // Search guilds if query provided
    if (searchQuery) {
      const guilds = await db.guild.findMany({
        where: {
          name: { contains: searchQuery, mode: 'insensitive' },
        },
        include: {
          members: {
            select: { id: true, role: true },
          },
        },
        take: 20,
        orderBy: { level: 'desc' },
      });

      return NextResponse.json({
        guilds: guilds.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          emblem: g.emblem,
          level: g.level,
          memberCount: g.members.length,
          maxMembers: g.maxMembers,
          ownerId: g.ownerId,
          canJoin: g.members.length < g.maxMembers,
        })),
      });
    }

    // If player is in a guild, return full guild info
    if (player.guild) {
      const guild = player.guild.guild;
      const memberRole = player.guild.role;

      return NextResponse.json({
        inGuild: true,
        role: memberRole,
        guild: {
          id: guild.id,
          name: guild.name,
          description: guild.description,
          emblem: guild.emblem,
          level: guild.level,
          experience: guild.experience,
          maxMembers: guild.maxMembers,
          treasury: guild.treasury,
          ownerId: guild.ownerId,
          memberCount: guild.members.length,
          members: guild.members.map((m) => ({
            id: m.id,
            role: m.role,
            joinedAt: m.joinedAt,
            player: m.player,
          })),
        },
      });
    }

    // Not in a guild - return recommended guilds
    const recommendedGuilds = await db.guild.findMany({
      include: {
        members: { select: { id: true } },
      },
      orderBy: { level: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      inGuild: false,
      recommendedGuilds: recommendedGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        emblem: g.emblem,
        level: g.level,
        memberCount: g.members.length,
        maxMembers: g.maxMembers,
        canJoin: g.members.length < g.maxMembers,
      })),
    });
  } catch (error) {
    console.error('Guild fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener gremio' },
      { status: 500 }
    );
  }
}

// POST /api/guild - Create, Join, Leave guild
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, name, description, emblem, guildId } = body;

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { guild: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // === CREATE GUILD ===
    if (action === 'create') {
      if (!name || name.trim().length < 3 || name.trim().length > 20) {
        return NextResponse.json(
          { error: 'El nombre debe tener entre 3 y 20 caracteres' },
          { status: 400 }
        );
      }

      if (player.guild) {
        return NextResponse.json(
          { error: 'Ya estás en un gremio. Sal primero del actual.' },
          { status: 400 }
        );
      }

      // Check if guild name is taken
      const existing = await db.guild.findUnique({
        where: { name: name.trim() },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Este nombre de gremio ya está en uso' },
          { status: 400 }
        );
      }

      // Create guild and add player as owner
      const guild = await db.$transaction(async (tx) => {
        const newGuild = await tx.guild.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            emblem: emblem || null,
            ownerId: player.id,
          },
        });

        await tx.guildMember.create({
          data: {
            guildId: newGuild.id,
            playerId: player.id,
            role: 'owner',
          },
        });

        return newGuild;
      });

      return NextResponse.json({
        success: true,
        guild: {
          id: guild.id,
          name: guild.name,
          description: guild.description,
          emblem: guild.emblem,
          level: guild.level,
          maxMembers: guild.maxMembers,
          role: 'owner',
        },
      });
    }

    // === JOIN GUILD ===
    if (action === 'join') {
      if (!guildId) {
        return NextResponse.json(
          { error: 'Se requiere guildId' },
          { status: 400 }
        );
      }

      if (player.guild) {
        return NextResponse.json(
          { error: 'Ya estás en un gremio. Sal primero del actual.' },
          { status: 400 }
        );
      }

      const guild = await db.guild.findUnique({
        where: { id: guildId },
        include: { members: true },
      });

      if (!guild) {
        return NextResponse.json(
          { error: 'Gremio no encontrado' },
          { status: 404 }
        );
      }

      if (guild.members.length >= guild.maxMembers) {
        return NextResponse.json(
          { error: 'El gremio está lleno' },
          { status: 400 }
        );
      }

      // Check if already a member (shouldn't happen, but just in case)
      const existingMember = guild.members.find(
        (m) => m.playerId === player.id
      );
      if (existingMember) {
        return NextResponse.json(
          { error: 'Ya eres miembro de este gremio' },
          { status: 400 }
        );
      }

      await db.guildMember.create({
        data: {
          guildId: guild.id,
          playerId: player.id,
          role: 'member',
        },
      });

      return NextResponse.json({
        success: true,
        guild: {
          id: guild.id,
          name: guild.name,
          role: 'member',
        },
      });
    }

    // === LEAVE GUILD ===
    if (action === 'leave') {
      if (!player.guild) {
        return NextResponse.json(
          { error: 'No estás en un gremio' },
          { status: 400 }
        );
      }

      const guild = await db.guild.findUnique({
        where: { id: player.guild.guildId },
        include: { members: true },
      });

      if (!guild) {
        return NextResponse.json(
          { error: 'Gremio no encontrado' },
          { status: 404 }
        );
      }

      // If owner is leaving, transfer ownership or disband
      if (player.guild.role === 'owner') {
        const otherMembers = guild.members.filter(
          (m) => m.playerId !== player.id
        );

        if (otherMembers.length > 0) {
          // Transfer ownership to the longest-standing member
          const newOwner = otherMembers.sort(
            (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()
          )[0];

          await db.$transaction([
            db.guildMember.delete({ where: { id: player.guild!.id } }),
            db.guildMember.update({
              where: { id: newOwner.id },
              data: { role: 'owner' },
            }),
            db.guild.update({
              where: { id: guild.id },
              data: { ownerId: newOwner.playerId },
            }),
          ]);
        } else {
          // Disband guild (no other members)
          await db.$transaction([
            db.guildMember.delete({ where: { id: player.guild!.id } }),
            db.guild.delete({ where: { id: guild.id } }),
          ]);
        }
      } else {
        // Regular member or officer leaves
        await db.guildMember.delete({ where: { id: player.guild.id } });
      }

      return NextResponse.json({ success: true });
    }

    // === KICK MEMBER (owner/officer only) ===
    if (action === 'kick') {
      const { targetPlayerId } = body;

      if (!targetPlayerId) {
        return NextResponse.json(
          { error: 'Se requiere targetPlayerId' },
          { status: 400 }
        );
      }

      if (!player.guild || (player.guild.role !== 'owner' && player.guild.role !== 'officer')) {
        return NextResponse.json(
          { error: 'No tienes permisos para expulsar miembros' },
          { status: 403 }
        );
      }

      const targetMember = await db.guildMember.findFirst({
        where: {
          guildId: player.guild.guildId,
          playerId: targetPlayerId,
        },
      });

      if (!targetMember) {
        return NextResponse.json(
          { error: 'Miembro no encontrado en el gremio' },
          { status: 404 }
        );
      }

      // Can't kick the owner
      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'No puedes expulsar al líder del gremio' },
          { status: 403 }
        );
      }

      // Officer can't kick other officers
      if (player.guild.role === 'officer' && targetMember.role === 'officer') {
        return NextResponse.json(
          { error: 'No puedes expulsar a otros oficiales' },
          { status: 403 }
        );
      }

      await db.guildMember.delete({ where: { id: targetMember.id } });

      return NextResponse.json({ success: true });
    }

    // === PROMOTE/DEMOTE MEMBER ===
    if (action === 'promote' || action === 'demote') {
      const { targetPlayerId } = body;

      if (!targetPlayerId) {
        return NextResponse.json(
          { error: 'Se requiere targetPlayerId' },
          { status: 400 }
        );
      }

      if (!player.guild || player.guild.role !== 'owner') {
        return NextResponse.json(
          { error: 'Solo el líder puede promover/degradar miembros' },
          { status: 403 }
        );
      }

      const targetMember = await db.guildMember.findFirst({
        where: {
          guildId: player.guild.guildId,
          playerId: targetPlayerId,
        },
      });

      if (!targetMember) {
        return NextResponse.json(
          { error: 'Miembro no encontrado en el gremio' },
          { status: 404 }
        );
      }

      if (targetMember.role === 'owner') {
        return NextResponse.json(
          { error: 'No puedes cambiar el rol del líder' },
          { status: 400 }
        );
      }

      const newRole = action === 'promote' ? 'officer' : 'member';
      await db.guildMember.update({
        where: { id: targetMember.id },
        data: { role: newRole },
      });

      return NextResponse.json({ success: true, newRole });
    }

    // === UPDATE GUILD INFO ===
    if (action === 'update') {
      if (!player.guild || (player.guild.role !== 'owner' && player.guild.role !== 'officer')) {
        return NextResponse.json(
          { error: 'No tienes permisos para editar el gremio' },
          { status: 403 }
        );
      }

      const updateData: any = {};
      if (name !== undefined) {
        const trimmed = name?.trim();
        if (trimmed.length >= 3 && trimmed.length <= 20) {
          updateData.name = trimmed;
        }
      }
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }
      if (emblem !== undefined) {
        updateData.emblem = emblem;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No hay datos para actualizar' },
          { status: 400 }
        );
      }

      await db.guild.update({
        where: { id: player.guild.guildId },
        data: updateData,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Guild action error:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción de gremio' },
      { status: 500 }
    );
  }
}
