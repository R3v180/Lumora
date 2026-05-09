const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Force activating energy items...');
  const items = [
    { id: 'shop_energy_small', name: 'Poción de Energía (P)', price: 75, content: { energy: 25 } },
    { id: 'shop_energy_medium', name: 'Elixir de Energía (M)', price: 150, content: { energy: 60 } },
    { id: 'shop_energy_refill', name: 'Esencia de Energía (G)', price: 250, content: { energyRefill: true } },
  ];

  for (const item of items) {
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: { isActive: true, price: item.price, content: item.content, name: item.name },
      create: {
        id: item.id,
        name: item.name,
        nameEn: item.name,
        description: 'Refill energy',
        descEn: 'Refill energy',
        category: 'boost',
        price: item.price,
        currency: 'lumens',
        content: item.content,
        isActive: true
      }
    });
  }
  console.log('✅ Energy items force activated');
}

main().catch(console.error).finally(() => prisma.$disconnect());
