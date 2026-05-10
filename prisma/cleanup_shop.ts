import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const officialIds = ['shop_energy_small', 'shop_energy_medium', 'shop_energy_refill'];
  
  // Disable any energy item that is not official
  const result = await prisma.shopItem.updateMany({
    where: {
      category: { in: ['energy', 'boost'] },
      id: { notIn: officialIds }

    },
    data: { isActive: false }
  });

  console.log(`✅ Desactivados ${result.count} ítems de energía duplicados.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
