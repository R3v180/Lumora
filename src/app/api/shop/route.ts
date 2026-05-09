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

    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      const allItems = await db.shopItem.findMany({ select: { id: true, isActive: true } });
      console.log('DEBUG SHOP 404:', { requested: itemId, dbItems: allItems });
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

      // Shield items
      if (content.type === 'shield' && content.hours) {
        if (player.sanctuary) {
          const currentShield = player.sanctuary.shieldUntil && player.sanctuary.shieldUntil > new Date()
            ? player.sanctuary.shieldUntil
            : new Date();
          
          await tx.sanctuary.update({
            where: { id: player.sanctuary.id },
            data: {
              shieldUntil: new Date(currentShield.getTime() + content.hours * 60 * 60 * 1000),
            },
          });
          rewards.push(`Escudo activado: +${content.hours}h`);
        } else {
          throw new Error('No tienes santuario para proteger');
        }
      }

      // Fetch final stats to return
      const finalPlayer = await tx.playerProfile.findUnique({
        where: { id: player.id },
        select: { lumens: true, energy: true }
      });

      return { 
        rewards, 
        newLumens: finalPlayer?.lumens || 0,
        newEnergy: finalPlayer?.energy || 0
      };
    });

    return NextResponse.json({
      success: true,
      itemName: item.name,
      rewards: result.rewards,
      newLumens: result.newLumens,
      newEnergy: result.newEnergy,
    });
  } catch (error) {
    console.error('Shop purchase error:', error);
    return NextResponse.json(
      { error: 'Error al procesar compra' },
      { status: 500 }
    );
  }
}
