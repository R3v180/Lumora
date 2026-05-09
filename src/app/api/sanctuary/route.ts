import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/sanctuary - Get player's sanctuary with placed items and spirits
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
        sanctuary: {
          include: {
            decorations: true,
          },
        },
        spirits: {
          include: { spiritType: true },
          orderBy: { acquiredAt: 'desc' },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (!player.sanctuary) {
      return NextResponse.json({ error: 'Santuario no encontrado' }, { status: 404 });
    }

    const sanctuary = player.sanctuary;

    // Calculate idle Lumens earned since last collection
    const now = new Date();
    const lastCollect = new Date(sanctuary.lastCollectAt);
    const hoursPassed = Math.max(0, (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60));
    const idleLumens = Math.floor(hoursPassed * sanctuary.lumensPerHour);
    // Cap at 8 hours offline
    const cappedIdleLumens = Math.min(idleLumens, sanctuary.lumensPerHour * 8);

    // Calculate total Lumens per hour from placed spirits
    const placedSpiritIds = sanctuary.decorations
      .filter(d => d.type === 'spirit' && d.spiritId)
      .map(d => d.spiritId!);

    const placedSpirits = player.spirits.filter(s =>
      placedSpiritIds.includes(s.id)
    );

    const spiritLumensPerHour = placedSpirits.reduce(
      (sum, s) => sum + s.spiritType.lumensPerHour,
      0
    );

    // Separate placed and unplaced spirits
    const placedSpiritSet = new Set(placedSpiritIds);
    const unplacedSpirits = player.spirits.filter(s => !placedSpiritSet.has(s.id));

    return NextResponse.json({
      id: sanctuary.id,
      name: sanctuary.name,
      layout: sanctuary.layout,
      lumensPerHour: sanctuary.lumensPerHour + spiritLumensPerHour,
      baseLumensPerHour: sanctuary.lumensPerHour,
      spiritLumensPerHour,
      idleLumens: cappedIdleLumens,
      hoursSinceCollection: Math.round(hoursPassed * 100) / 100,
      lastCollectAt: sanctuary.lastCollectAt,
      elements: {
        water: sanctuary.globalWater,
        fire: sanctuary.globalFire,
        nature: sanctuary.globalNature,
        dream: sanctuary.globalDream,
        star: sanctuary.globalStar,
      },
      placedItems: sanctuary.decorations.map(d => ({
        id: d.id,
        type: d.type,
        spiritId: d.spiritId,
        positionX: d.positionX,
        positionY: d.positionY,
        level: d.level,
      })),
      placedSpirits: placedSpirits.map(s => ({
        id: s.id,
        level: s.level,
        spiritType: {
          id: s.spiritType.id,
          name: s.spiritType.name,
          nameEn: s.spiritType.nameEn,
          element: s.spiritType.element,
          rarity: s.spiritType.rarity,
          basePower: s.spiritType.basePower,
          lumensPerHour: s.spiritType.lumensPerHour,
        },
        placedPosition: sanctuary.decorations.find(d => d.spiritId === s.id),
      })),
      unplacedSpirits: unplacedSpirits.map(s => ({
        id: s.id,
        level: s.level,
        spiritType: {
          id: s.spiritType.id,
          name: s.spiritType.name,
          nameEn: s.spiritType.nameEn,
          element: s.spiritType.element,
          rarity: s.spiritType.rarity,
          basePower: s.spiritType.basePower,
          lumensPerHour: s.spiritType.lumensPerHour,
        },
      })),
      totalSpirits: player.spirits.length,
      sanctuaryLevel: player.sanctuaryLevel,
      maxPlacedSpirits: player.sanctuaryLevel * 3 + 2,
      currentPlacedCount: sanctuary.decorations.filter(d => d.type === 'spirit').length,
    });
  } catch (error) {
    console.error('Sanctuary fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener santuario' },
      { status: 500 }
    );
  }
}

// POST /api/sanctuary - Place or remove an item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action } = body; // 'place', 'remove', 'collect', 'rename'

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { sanctuary: true, spirits: { include: { spiritType: true } } },
    });

    if (!player || !player.sanctuary) {
      return NextResponse.json({ error: 'Santuario no encontrado' }, { status: 404 });
    }

    // === COLLECT IDLE LUMENS ===
    if (action === 'collect') {
      const now = new Date();
      const lastCollect = new Date(player.sanctuary.lastCollectAt);
      const hoursPassed = Math.max(0, (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60));

      // Calculate total Lumens per hour (base + placed spirits)
      const placedSpiritIds = (await db.sanctuaryDecoration.findMany({
        where: { sanctuaryId: player.sanctuary.id, type: 'spirit', spiritId: { not: null } },
      })).map(d => d.spiritId!);

      const placedSpirits = player.spirits.filter(s => placedSpiritIds.includes(s.id));
      const spiritLumensPerHour = placedSpirits.reduce(
        (sum, s) => sum + s.spiritType.lumensPerHour, 0
      );

      const totalLumensPerHour = player.sanctuary.lumensPerHour + spiritLumensPerHour;
      const idleLumens = Math.min(
        Math.floor(hoursPassed * totalLumensPerHour),
        totalLumensPerHour * 8 // Cap at 8 hours
      );

      if (idleLumens <= 0) {
        return NextResponse.json({
          collected: 0,
          message: 'No hay Lumens para recolectar aún',
          nextLumenIn: Math.ceil(3600 / totalLumensPerHour), // seconds until next lumen
        });
      }

      // Update player lumens and collection time
      await db.$transaction([
        db.playerProfile.update({
          where: { id: player.id },
          data: { lumens: player.lumens + idleLumens },
        }),
        db.sanctuary.update({
          where: { id: player.sanctuary.id },
          data: { lastCollectAt: now },
        }),
        db.transaction.create({
          data: {
            playerId: player.id,
            type: 'daily',
            amount: idleLumens,
            currency: 'lumens',
            metadata: { source: 'sanctuary_idle', hoursPassed: Math.round(hoursPassed * 100) / 100 },
          },
        }),
      ]);

      return NextResponse.json({
        collected: idleLumens,
        totalLumens: player.lumens + idleLumens,
        hoursCollected: Math.round(hoursPassed * 100) / 100,
        lumensPerHour: totalLumensPerHour,
      });
    }

    // === PLACE A SPIRIT ===
    if (action === 'place') {
      const { spiritId, positionX, positionY } = body;

      if (!spiritId || positionX === undefined || positionY === undefined) {
        return NextResponse.json(
          { error: 'Se requiere spiritId, positionX y positionY' },
          { status: 400 }
        );
      }

      // Validate position is within grid (8x8)
      if (positionX < 0 || positionX >= 8 || positionY < 0 || positionY >= 8) {
        return NextResponse.json(
          { error: 'Posición fuera del santuario (0-7)' },
          { status: 400 }
        );
      }

      // Verify spirit belongs to player and is not already placed
      const spirit = player.spirits.find(s => s.id === spiritId);
      if (!spirit) {
        return NextResponse.json(
          { error: 'Espíritu no encontrado' },
          { status: 400 }
        );
      }

      // Check if spirit is already placed
      const existingPlacement = await db.sanctuaryDecoration.findFirst({
        where: { sanctuaryId: player.sanctuary.id, spiritId },
      });
      if (existingPlacement) {
        return NextResponse.json(
          { error: 'Este espíritu ya está colocado' },
          { status: 400 }
        );
      }

      // Calculate max placed spirits based on sanctuary level
      // Formula: level * 3 + 2 (gives 5 at lv1, 8 at lv2, 11 at lv3, etc.)
      const maxPlacedSpirits = player.sanctuaryLevel * 3 + 2;

      // Count currently placed spirits
      const currentPlacedCount = await db.sanctuaryDecoration.count({
        where: { sanctuaryId: player.sanctuary.id, type: 'spirit' },
      });

      if (currentPlacedCount >= maxPlacedSpirits) {
        return NextResponse.json(
          { error: 'sanctuary_full', message: `Máximo ${maxPlacedSpirits} espíritus colocados (Nivel ${player.sanctuaryLevel})` },
          { status: 400 }
        );
      }

      // Check if position is occupied
      const occupiedPosition = await db.sanctuaryDecoration.findFirst({
        where: {
          sanctuaryId: player.sanctuary.id,
          positionX,
          positionY,
        },
      });
      if (occupiedPosition) {
        return NextResponse.json(
          { error: 'Posición ya ocupada' },
          { status: 400 }
        );
      }

      // Place the spirit
      const decoration = await db.sanctuaryDecoration.create({
        data: {
          sanctuaryId: player.sanctuary.id,
          type: 'spirit',
          spiritId,
          positionX,
          positionY,
          level: 1,
        },
      });

      // Mark spirit as placed
      await db.playerSpirit.update({
        where: { id: spiritId },
        data: { isPlaced: true, placedX: positionX, placedY: positionY },
      });

      // Recalculate Lumens per hour
      const allPlacedSpiritIds = (await db.sanctuaryDecoration.findMany({
        where: { sanctuaryId: player.sanctuary.id, type: 'spirit', spiritId: { not: null } },
      })).map(d => d.spiritId!);

      const allPlacedSpirits = await db.playerSpirit.findMany({
        where: { id: { in: allPlacedSpiritIds } },
        include: { spiritType: true },
      });

      const newSpiritLPH = allPlacedSpirits.reduce((sum, s) => sum + s.spiritType.lumensPerHour, 0);

      return NextResponse.json({
        success: true,
        placed: {
          id: decoration.id,
          type: decoration.type,
          spiritId: decoration.spiritId,
          positionX: decoration.positionX,
          positionY: decoration.positionY,
        },
        lumensPerHour: player.sanctuary.lumensPerHour + newSpiritLPH,
        spiritName: spirit.spiritType.name,
        element: spirit.spiritType.element,
      });
    }

    // === REMOVE A SPIRIT ===
    if (action === 'remove') {
      const { spiritId } = body;

      if (!spiritId) {
        return NextResponse.json(
          { error: 'Se requiere spiritId' },
          { status: 400 }
        );
      }

      const placement = await db.sanctuaryDecoration.findFirst({
        where: { sanctuaryId: player.sanctuary.id, spiritId },
      });

      if (!placement) {
        return NextResponse.json(
          { error: 'Espíritu no está colocado en el santuario' },
          { status: 400 }
        );
      }

      await db.$transaction([
        db.sanctuaryDecoration.delete({ where: { id: placement.id } }),
        db.playerSpirit.update({
          where: { id: spiritId },
          data: { isPlaced: false, placedX: null, placedY: null },
        }),
      ]);

      return NextResponse.json({
        success: true,
        removed: spiritId,
      });
    }

    // === RENAME SANCTUARY ===
    if (action === 'rename') {
      const { name } = body;
      if (!name || name.trim().length < 2 || name.trim().length > 30) {
        return NextResponse.json(
          { error: 'El nombre debe tener entre 2 y 30 caracteres' },
          { status: 400 }
        );
      }

      await db.sanctuary.update({
        where: { id: player.sanctuary.id },
        data: { name: name.trim() },
      });

      return NextResponse.json({
        success: true,
        name: name.trim(),
      });
    }

    // === AUTO-PLACE ===
    if (action === 'auto_place') {
      const maxPlacedSpirits = player.sanctuaryLevel * 3 + 2;
      const decorations = await db.sanctuaryDecoration.findMany({
        where: { sanctuaryId: player.sanctuary.id },
      });
      const currentPlacedCount = decorations.filter(d => d.type === 'spirit').length;

      if (currentPlacedCount >= maxPlacedSpirits) {
        return NextResponse.json({ error: 'Santuario lleno' }, { status: 400 });
      }

      const placedSpiritIds = new Set(decorations.filter(d => d.spiritId).map(d => d.spiritId!));
      let unplacedSpirits = player.spirits
        .filter(s => !placedSpiritIds.has(s.id))
        .sort((a, b) => b.spiritType.lumensPerHour - a.spiritType.lumensPerHour);

      if (unplacedSpirits.length === 0) {
        return NextResponse.json({ error: 'No tienes espíritus para colocar' }, { status: 400 });
      }

      // Build grid occupancy map
      const occupied = new Set<string>();
      decorations.forEach(d => occupied.add(`${d.positionX},${d.positionY}`));

      // Function to get terrain (same as client)
      const getTerrain = (x: number, y: number, level: number) => {
        const distFromCenter = Math.sqrt(Math.pow(x - 3.5, 2) + Math.pow(y - 3.5, 2));
        if (distFromCenter > 4.5 - Math.min(level * 0.2, 1.5)) return 'water';
        return 'grass';
      };

      const spots: {x: number, y: number}[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (!occupied.has(`${x},${y}`) && getTerrain(x, y, player.sanctuaryLevel) !== 'water') {
            spots.push({x, y});
          }
        }
      }

      let placedCount = 0;

      // Collect placements to execute
      const placements: { spiritId: string; x: number; y: number }[] = [];
      for (const spirit of unplacedSpirits) {
        if (currentPlacedCount + placedCount >= maxPlacedSpirits) break;
        if (spots.length === 0) break;

        const spot = spots.shift()!;
        placements.push({ spiritId: spirit.id, x: spot.x, y: spot.y });
        placedCount++;
      }

      if (placedCount > 0) {
        await db.$transaction(async (tx) => {
          for (const p of placements) {
            await tx.sanctuaryDecoration.create({
              data: { sanctuaryId: player.sanctuary!.id, type: 'spirit', spiritId: p.spiritId, positionX: p.x, positionY: p.y, level: 1 }
            });
            await tx.playerSpirit.update({
              where: { id: p.spiritId },
              data: { isPlaced: true, placedX: p.x, placedY: p.y }
            });
          }
        });
      }

      return NextResponse.json({ success: true, placedCount });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Sanctuary action error:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción del santuario' },
      { status: 500 }
    );
  }
}
