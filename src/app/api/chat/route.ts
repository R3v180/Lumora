import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// In-memory rate limiter: max 5 messages per 10 seconds per player
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(playerId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(playerId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(playerId, { count: 1, resetAt: now + 10000 });
    return false;
  }

  if (entry.count >= 5) {
    return true;
  }

  entry.count++;
  return false;
}

// GET /api/chat - Get chat messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const channel = request.nextUrl.searchParams.get('channel') || 'world';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100);
    const before = request.nextUrl.searchParams.get('before') || undefined;

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { guild: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (channel === 'guild') {
      if (!player.guild) {
        return NextResponse.json(
          { error: 'Debes estar en un gremio para chatear', messages: [] },
          { status: 200 }
        );
      }

      // Fix parameter indexing for raw SQL
      const params: any[] = [player.guild.guildId];
      let query = `
        SELECT 
          cm.id, cm.content, cm."messageType", cm."createdAt", cm."guildId",
          pp.id as "senderId", pp."displayName", pp.level, pp.avatar
        FROM chat_messages cm
        JOIN player_profiles pp ON cm."senderId" = pp.id
        WHERE cm."guildId" = $1 AND cm."messageType" = 'user'
      `;
      
      if (before) {
        params.push(new Date(before));
        query += ` AND cm."createdAt" < $${params.length}`;
      }
      
      params.push(limit);
      query += ` ORDER BY cm."createdAt" DESC LIMIT $${params.length}`;

      const messages = await db.$queryRawUnsafe(query, ...params);

      return NextResponse.json({
        messages: (messages as any[]).reverse().map((m: any) => ({
          id: m.id,
          content: m.content,
          messageType: m.messageType,
          createdAt: m.createdAt.toISOString ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
          sender: {
            id: m.senderId,
            displayName: m.displayName,
            level: m.level,
            avatar: m.avatar,
          },
        })),
      });
    }

    // World chat - fix parameter indexing
    const params: any[] = [];
    let query = `
      SELECT 
        cm.id, cm.content, cm."messageType", cm."createdAt", cm."guildId",
        pp.id as "senderId", pp."displayName", pp.level, pp.avatar
      FROM chat_messages cm
      JOIN player_profiles pp ON cm."senderId" = pp.id
      WHERE cm."guildId" IS NULL AND cm."messageType" = 'user'
    `;

    if (before) {
      params.push(new Date(before));
      query += ` AND cm."createdAt" < $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY cm."createdAt" DESC LIMIT $${params.length}`;

    const messages = await db.$queryRawUnsafe(query, ...params);

    return NextResponse.json({
      messages: (messages as any[]).reverse().map((m: any) => ({
        id: m.id,
        content: m.content,
        messageType: m.messageType,
        createdAt: m.createdAt.toISOString ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
        sender: {
          id: m.senderId,
          displayName: m.displayName,
          level: m.level,
          avatar: m.avatar,
        },
      })),
    });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Error al obtener mensajes', messages: [] },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { content, channel } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Mensaje demasiado largo (máximo 500 caracteres)' },
        { status: 400 }
      );
    }

    // Validate channel
    if (channel !== 'world' && channel !== 'guild') {
      return NextResponse.json(
        { error: 'Canal no válido' },
        { status: 400 }
      );
    }

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { guild: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Rate limit check
    if (isRateLimited(player.id)) {
      return NextResponse.json(
        { error: 'Demasiados mensajes, espera un momento' },
        { status: 429 }
      );
    }

    let guildId: string | null = null;

    // Guild chat validation
    if (channel === 'guild') {
      if (!player.guild) {
        return NextResponse.json(
          { error: 'Debes estar en un gremio para chatear' },
          { status: 403 }
        );
      }
      guildId = player.guild.guildId;
    }

    // Create the message
    const message = await (db.chatMessage as any).create({
      data: {
        senderId: player.id,
        guildId,
        content: content.trim(),
        messageType: 'user',
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            level: true,
            avatar: true,
          },
        },
      },
    });

    const responseData = {
      id: message.id,
      content: message.content,
      messageType: message.messageType,
      channel,
      guildId: message.guildId,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName,
        level: message.sender.level,
        avatar: message.sender.avatar,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
