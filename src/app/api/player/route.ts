import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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
        user: { select: { image: true } },
        sanctuary: true,
        spirits: {
          include: { spiritType: true },
          orderBy: { acquiredAt: 'desc' },
        },
        guild: { include: { guild: true } },
        blessings: {
          orderBy: { day: 'desc' },
          take: 1,
        },
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

    if (energyRegenerated > 0) {
      await db.playerProfile.update({
        where: { id: player.id },
        data: {
          energy: player.energy + energyRegenerated,
          energyRefillAt: new Date(now.getTime() - ((minutesPassed % 5) * 60000)),
        },
      });
      player.energy += energyRegenerated;
    }

    // Calculate collection power
    const POWER_MAP: Record<string, number> = {
      common: 10,
      uncommon: 25,
      rare: 60,
      epic: 150,
      legendary: 400
    };

    const totalPower = player.spirits.reduce((sum, s) => {
      const base = POWER_MAP[s.spiritType.rarity] || 0;
      // Power grows with level: +10% per level
      const levelBonus = 1 + (s.level - 1) * 0.1;
      return sum + Math.floor(base * levelBonus);
    }, 0);
    // Multiplier: 1.0 + 0.01 per 100 power
    const collectionMultiplier = 1.0 + (totalPower / 10000); 

    // Calculate sanctuary lumens per hour including placed spirits
    let sanctuaryLPH = player.sanctuary?.lumensPerHour || 0;
    if (player.sanctuary) {
      const placedDecorations = await db.sanctuaryDecoration.findMany({
        where: {
          sanctuaryId: player.sanctuary.id,
          type: 'spirit',
          spiritId: { not: null },
        },
      });
      const placedSpiritIds = placedDecorations.map(d => d.spiritId!);
      if (placedSpiritIds.length > 0) {
        const placedSpirits = await db.playerSpirit.findMany({
          where: { id: { in: placedSpiritIds } },
          include: { spiritType: true },
        });
        sanctuaryLPH += placedSpirits.reduce((sum, s) => sum + s.spiritType.lumensPerHour, 0);
      }
    }

    // Resilience check for 'avatar' field if Prisma client is stale
    let finalAvatar = (player as any).avatar;
    if (finalAvatar === undefined) {
      try {
        const rawData: any[] = await db.$queryRawUnsafe(`SELECT "avatar" FROM "player_profiles" WHERE "userId" = $1`, userId);
        if (rawData && rawData.length > 0) {
          finalAvatar = rawData[0].avatar;
        }
      } catch (e) {
        console.warn('Could not fetch avatar via raw SQL fallback');
      }
    }

    return NextResponse.json({
      ...player,
      avatar: finalAvatar || (player as any).user?.image || null,
      totalPower,
      collectionMultiplier,
      sanctuary: player.sanctuary ? {
        ...player.sanctuary,
        lumensPerHour: sanctuaryLPH,
      } : null,
      spirits: player.spirits, // Keep response small for normal fetch
    });
  } catch (error) {
    console.error('Player fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { displayName, language, avatar } = body;
    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (language) updateData.language = language;
    if (avatar) updateData.avatar = avatar;

    let player;
    try {
      player = await db.playerProfile.update({
        where: { userId },
        data: updateData,
      });
    } catch (prismaError) {
      // Fallback for Windows EPERM / Stale Client issues: use raw SQL
      console.warn('Prisma update failed, attempting raw SQL fallback:', prismaError);
      
      const setClauses: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (displayName) {
        setClauses.push(`"displayName" = $${i++}`);
        values.push(displayName);
      }
      if (language) {
        setClauses.push(`"language" = $${i++}`);
        values.push(language);
      }
      if (avatar) {
        setClauses.push(`"avatar" = $${i++}`);
        values.push(avatar);
      }
      
      if (setClauses.length > 0) {
        values.push(userId);
        const query = `UPDATE "player_profiles" SET ${setClauses.join(', ')} WHERE "userId" = $${i}`;
        await db.$executeRawUnsafe(query, ...values);
      }
      
      player = await db.playerProfile.findUnique({ where: { userId } });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Player update error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
