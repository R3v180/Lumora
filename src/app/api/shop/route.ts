import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/shop - List all active shop items grouped by category
export async function GET() {
  try {
    const items = await db.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    // Inject virtual energy potion if not already in DB
    const hasEnergyPotion = items.some(i => (i.content as any)?.energy);
    if (!hasEnergyPotion) {
      if (!grouped['boost']) grouped['boost'] = [];
      grouped['boost'].unshift({
        id: 'virtual_energy_potion',
        name: 'Poción Menor de Energía',
        nameEn: 'Minor Energy Potion',
        description: 'Restaura 10 de energía (2 giros extra)',
        descEn: 'Restores 10 energy (2 extra spins)',
        category: 'boost',
        price: 2000,
        currency: 'lumens',
        content: { energy: 10 },
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    return NextResponse.json({
      categories: Object.entries(grouped).map(([key, items]) => ({
        key,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          nameEn: item.nameEn,
          description: item.description,
          descEn: item.descEn,
          category: item.category,
          price: item.price,
          currency: item.currency,
          content: item.content,
          imageUrl: item.imageUrl,
        })),
      })),
      allItems: items.map((item) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        description: item.description,
        descEn: item.descEn,
        category: item.category,
        price: item.price,
        currency: item.currency,
        content: item.content,
        imageUrl: item.imageUrl,
      })),
    });
  } catch (error) {
    console.error('Shop fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener tienda' },
      { status: 500 }
    );
  }
}

// POST /api/shop - Purchase an item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Se requiere itemId' },
        { status: 400 }
      );
    }

    const player = await db.playerProfile.findUnique({
      where: { userId },
      include: { sanctuary: true, spirits: { include: { spiritType: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Handle virtual items (energy potion)
    if (itemId === 'virtual_energy_potion') {
      if (player.lumens < 2000) {
        return NextResponse.json({ error: 'Lumens insuficientes', required: 2000, current: player.lumens }, { status: 400 });
      }
      await db.$transaction([
        db.playerProfile.update({ where: { id: player.id }, data: { lumens: { decrement: 2000 }, energy: { increment: 10 } } }),
        db.transaction.create({ data: { playerId: player.id, type: 'purchase', amount: -2000, currency: 'lumens', metadata: { itemName: 'Poción Menor de Energía' } } }),
      ]);
      return NextResponse.json({ success: true, itemName: 'Poción Menor de Energía', rewards: ['+10 Energía'], newLumens: player.lumens - 2000 });
    }

    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      return NextResponse.json(
        { error: 'Item no disponible' },
        { status: 404 }
      );
    }

    // Check if player can afford it
    if (item.currency === 'lumens' && player.lumens < item.price) {
      return NextResponse.json(
        { error: 'Lumens insuficientes', required: item.price, current: player.lumens },
        { status: 400 }
      );
    }

    // Process the purchase in a transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct currency
      const updateData: any = {};
      if (item.currency === 'lumens') {
        updateData.lumens = player.lumens - item.price;
      }

      await tx.playerProfile.update({
        where: { id: player.id },
        data: updateData,
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          playerId: player.id,
          type: 'purchase',
          amount: -item.price,
          currency: item.currency,
          itemId: item.id,
          metadata: { itemName: item.name, content: item.content },
        },
      });

      // Process item content
      const content = item.content as any;
      const rewards: string[] = [];

      // Lumens packs
      if (content.lumens) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { lumens: { increment: content.lumens + (content.bonus || 0) } },
        });
        rewards.push(`${content.lumens + (content.bonus || 0)} Lumens`);
      }

      // Energy refill
      if (content.energyRefill) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { energy: player.maxEnergy },
        });
        rewards.push('Energía al máximo');
      }

      // Energy increment (potion)
      if (content.energy && !content.energyRefill) {
        await tx.playerProfile.update({
          where: { id: player.id },
          data: { energy: { increment: content.energy } },
        });
        rewards.push(`+${content.energy} Energía`);
      }

      // Spirit bundles
      if (content.spirits && content.element) {
        const spiritTypes = await tx.spiritType.findMany({
          where: { element: content.element },
          orderBy: { rarity: 'asc' },
          take: content.spirits,
        });

        for (const st of spiritTypes) {
          await tx.playerSpirit.create({
            data: {
              playerId: player.id,
              spiritTypeId: st.id,
              level: 1,
            },
          });
          rewards.push(`Espíritu: ${st.name}`);
        }
      }

      // Decoration items (add to inventory)
      if (content.type && ['fountain', 'crystal', 'lamp', 'tree', 'flower_bed'].includes(content.type)) {
        await tx.inventory.upsert({
          where: {
            playerId_itemType_itemId: {
              playerId: player.id,
              itemType: 'decoration',
              itemId: content.type,
            },
          },
          update: { quantity: { increment: 1 } },
          create: {
            playerId: player.id,
            itemType: 'decoration',
            itemId: content.type,
            quantity: 1,
          },
        });
        rewards.push(`Decoración: ${item.name}`);
      }

      // Season pass
      if (content.type === 'season_pass') {
        await tx.inventory.upsert({
          where: {
            playerId_itemType_itemId: {
              playerId: player.id,
              itemType: 'pass',
              itemId: content.season || 'current',
            },
          },
          update: { quantity: 1 },
          create: {
            playerId: player.id,
            itemType: 'pass',
            itemId: content.season || 'current',
            quantity: 1,
          },
        });
        rewards.push('Pase de Temporada activado');
      }

      // Element bonus decorations
      if (content.elementBonus) {
        rewards.push(`Bono de elemento: ${content.elementBonus}`);
      }

      // Power/beauty bonus
      if (content.powerBonus) {
        rewards.push(`+${content.powerBonus} Poder Base`);
      }

      if (content.lumensBonus) {
        rewards.push(`+${content.lumensBonus} Lumens/h`);
      }

      return { rewards, newLumens: item.currency === 'lumens' ? player.lumens - item.price + (content.lumens || 0) + (content.bonus || 0) : player.lumens };
    });

    return NextResponse.json({
      success: true,
      itemName: item.name,
      rewards: result.rewards,
      newLumens: result.newLumens,
    });
  } catch (error) {
    console.error('Shop purchase error:', error);
    return NextResponse.json(
      { error: 'Error al procesar compra' },
      { status: 500 }
    );
  }
}
