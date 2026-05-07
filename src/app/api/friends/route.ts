import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/friends - List friends and pending requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const player = await db.playerProfile.findUnique({ where: { userId } });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Get all friendships where player is either side
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { player1Id: player.id },
          { player2Id: player.id },
        ],
      },
      include: {
        player1: {
          select: {
            id: true,
            displayName: true,
            level: true,
            sanctuaryLevel: true,
            lumens: true,
            user: { select: { image: true } },
          },
        },
        player2: {
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
      orderBy: { updatedAt: 'desc' },
    });

    const friends: any[] = [];
    const pendingSent: any[] = [];
    const pendingReceived: any[] = [];

    for (const f of friendships) {
      const isPlayer1 = f.player1Id === player.id;
      const otherPlayer = isPlayer1 ? f.player2 : f.player1;

      const friendData = {
        friendshipId: f.id,
        id: otherPlayer.id,
        displayName: otherPlayer.displayName,
        level: otherPlayer.level,
        sanctuaryLevel: otherPlayer.sanctuaryLevel,
        lumens: otherPlayer.lumens,
        avatar: otherPlayer.user?.image || null,
        status: f.status,
        createdAt: f.createdAt,
      };

      if (f.status === 'accepted') {
        friends.push(friendData);
      } else if (f.status === 'pending') {
        // If player1 sent the request, it's a sent request
        if (isPlayer1) {
          pendingSent.push(friendData);
        } else {
          pendingReceived.push(friendData);
        }
      }
    }

    return NextResponse.json({
      friends,
      pendingSent,
      pendingReceived,
      totalFriends: friends.length,
    });
  } catch (error) {
    console.error('Friends fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener amigos' },
      { status: 500 }
    );
  }
}

// POST /api/friends - Send/Accept/Reject/Remove friend request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, targetPlayerId, friendshipId } = body;

    const player = await db.playerProfile.findUnique({ where: { userId } });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // === SEND FRIEND REQUEST ===
    if (action === 'send') {
      if (!targetPlayerId) {
        return NextResponse.json(
          { error: 'Se requiere targetPlayerId' },
          { status: 400 }
        );
      }

      if (targetPlayerId === player.id) {
        return NextResponse.json(
          { error: 'No puedes enviarte solicitud a ti mismo' },
          { status: 400 }
        );
      }

      // Check if target player exists
      const targetPlayer = await db.playerProfile.findUnique({
        where: { id: targetPlayerId },
      });

      if (!targetPlayer) {
        return NextResponse.json(
          { error: 'Jugador no encontrado' },
          { status: 404 }
        );
      }

      // Check if friendship already exists
      const existing = await db.friendship.findFirst({
        where: {
          OR: [
            { player1Id: player.id, player2Id: targetPlayerId },
            { player1Id: targetPlayerId, player2Id: player.id },
          ],
        },
      });

      if (existing) {
        if (existing.status === 'accepted') {
          return NextResponse.json(
            { error: 'Ya son amigos' },
            { status: 400 }
          );
        }
        if (existing.status === 'pending') {
          return NextResponse.json(
            { error: 'Ya existe una solicitud pendiente' },
            { status: 400 }
          );
        }
        if (existing.status === 'blocked') {
          return NextResponse.json(
            { error: 'No puedes enviar solicitud a este jugador' },
            { status: 400 }
          );
        }
      }

      // Create friendship request (player1 is always the sender)
      const friendship = await db.friendship.create({
        data: {
          player1Id: player.id,
          player2Id: targetPlayerId,
          status: 'pending',
        },
        include: {
          player2: {
            select: {
              id: true,
              displayName: true,
              level: true,
              sanctuaryLevel: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        friendship: {
          id: friendship.id,
          targetPlayer: friendship.player2,
          status: friendship.status,
        },
      });
    }

    // === ACCEPT FRIEND REQUEST ===
    if (action === 'accept') {
      if (!friendshipId) {
        return NextResponse.json(
          { error: 'Se requiere friendshipId' },
          { status: 400 }
        );
      }

      const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return NextResponse.json(
          { error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      // Only the receiver (player2) can accept
      if (friendship.player2Id !== player.id) {
        return NextResponse.json(
          { error: 'No puedes aceptar esta solicitud' },
          { status: 403 }
        );
      }

      if (friendship.status !== 'pending') {
        return NextResponse.json(
          { error: 'La solicitud ya no está pendiente' },
          { status: 400 }
        );
      }

      const updated = await db.friendship.update({
        where: { id: friendshipId },
        data: { status: 'accepted' },
        include: {
          player1: {
            select: {
              id: true,
              displayName: true,
              level: true,
              sanctuaryLevel: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        friend: updated.player1,
      });
    }

    // === REJECT FRIEND REQUEST ===
    if (action === 'reject') {
      if (!friendshipId) {
        return NextResponse.json(
          { error: 'Se requiere friendshipId' },
          { status: 400 }
        );
      }

      const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return NextResponse.json(
          { error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      // Only the receiver can reject
      if (friendship.player2Id !== player.id) {
        return NextResponse.json(
          { error: 'No puedes rechazar esta solicitud' },
          { status: 403 }
        );
      }

      await db.friendship.delete({ where: { id: friendshipId } });

      return NextResponse.json({ success: true });
    }

    // === REMOVE FRIEND ===
    if (action === 'remove') {
      if (!friendshipId) {
        return NextResponse.json(
          { error: 'Se requiere friendshipId' },
          { status: 400 }
        );
      }

      const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return NextResponse.json(
          { error: 'Amistad no encontrada' },
          { status: 404 }
        );
      }

      if (
        friendship.player1Id !== player.id &&
        friendship.player2Id !== player.id
      ) {
        return NextResponse.json(
          { error: 'No puedes eliminar esta amistad' },
          { status: 403 }
        );
      }

      await db.friendship.delete({ where: { id: friendshipId } });

      return NextResponse.json({ success: true });
    }

    // === CANCEL SENT REQUEST ===
    if (action === 'cancel') {
      if (!friendshipId) {
        return NextResponse.json(
          { error: 'Se requiere friendshipId' },
          { status: 400 }
        );
      }

      const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
      });

      if (!friendship) {
        return NextResponse.json(
          { error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      // Only the sender (player1) can cancel
      if (friendship.player1Id !== player.id) {
        return NextResponse.json(
          { error: 'No puedes cancelar esta solicitud' },
          { status: 403 }
        );
      }

      await db.friendship.delete({ where: { id: friendshipId } });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Friends action error:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción de amistad' },
      { status: 500 }
    );
  }
}
