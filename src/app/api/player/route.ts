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
        sanctuary: true,
        spirits: {
          include: { spiritType: true },
          take: 20,
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
    const energyRegenerated = Math.min(
      Math.floor(minutesPassed / 5), // 1 energy every 5 minutes
      player.maxEnergy - player.energy
    );

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

    return NextResponse.json({
      ...player,
      sanctuary: player.sanctuary ? {
        ...player.sanctuary,
        lumensPerHour: sanctuaryLPH,
      } : null,
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
    const { displayName, language } = body;

    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (language) updateData.language = language;

    const player = await db.playerProfile.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Player update error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
