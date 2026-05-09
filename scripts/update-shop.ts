import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating shop items...');

  // 1. Deactivate old items
  await prisma.shopItem.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  const shopItems = [
    // --- ENERGY CATEGORY ---
    {
      id: 'potion_minor',
      name: 'Pócima Menor de Energía',
      nameEn: 'Minor Energy Potion',
      description: 'Restaura 20 puntos de energía de forma inmediata.',
      descEn: 'Restores 20 energy points immediately.',
      category: 'energy',
      price: 1000,
      currency: 'lumens',
      content: { energy: 20 },
      imageUrl: '/assets/shop/potion_minor.png',
      isActive: true
    },
    {
      id: 'potion_medium',
      name: 'Elixir Medio de Energía',
      nameEn: 'Medium Energy Elixir',
      description: 'Restaura 50 puntos de energía para seguir jugando.',
      descEn: 'Restores 50 energy points to keep playing.',
      category: 'energy',
      price: 2200,
      currency: 'lumens',
      content: { energy: 50 },
      imageUrl: '/assets/shop/potion_medium.png',
      isActive: true
    },
    {
      id: 'potion_major',
      name: 'Esencia Mayor de Energía',
      nameEn: 'Major Energy Essence',
      description: 'Una potente esencia que restaura 100 puntos de energía.',
      descEn: 'A powerful essence that restores 100 energy points.',
      category: 'energy',
      price: 4000,
      currency: 'lumens',
      content: { energy: 100 },
      imageUrl: '/assets/shop/potion_major.png',
      isActive: true
    },

    // --- SHIELD CATEGORY ---
    {
      id: 'shield_crystal',
      name: 'Escudo de Cristal',
      nameEn: 'Crystal Shield',
      description: 'Protege tu santuario de saqueos durante 4 horas.',
      descEn: 'Protects your sanctuary from raids for 4 hours.',
      category: 'shields',
      price: 1500,
      currency: 'lumens',
      content: { type: 'shield', hours: 4 },
      imageUrl: '/assets/shop/shield_crystal.png',
      isActive: true
    },
    {
      id: 'shield_star',
      name: 'Manto Estelar',
      nameEn: 'Star Mantle',
      description: 'Una protección celestial que dura 12 horas.',
      descEn: 'A celestial protection that lasts 12 hours.',
      category: 'shields',
      price: 3500,
      currency: 'lumens',
      content: { type: 'shield', hours: 12 },
      imageUrl: '/assets/shop/shield_star.png',
      isActive: true
    },
    {
      id: 'shield_dome',
      name: 'Cúpula Eterna',
      nameEn: 'Eternal Dome',
      description: 'Protección absoluta durante 24 horas completas.',
      descEn: 'Absolute protection for 24 full hours.',
      category: 'shields',
      price: 6000,
      currency: 'lumens',
      content: { type: 'shield', hours: 24 },
      imageUrl: '/assets/shop/shield_dome.png',
      isActive: true
    },

    // --- CHEST CATEGORY ---
    {
      id: 'chest_bronze',
      name: 'Cofre de Bronce',
      nameEn: 'Bronze Chest',
      description: 'Contiene 3 espíritus de rareza común o poco común.',
      descEn: 'Contains 3 spirits of common or uncommon rarity.',
      category: 'chests',
      price: 5000,
      currency: 'lumens',
      content: { spirits: 3, rarity: ['common', 'uncommon'] },
      imageUrl: '/assets/shop/chest_bronze.png',
      isActive: true
    },
    {
      id: 'chest_silver',
      name: 'Cofre de Plata',
      nameEn: 'Silver Chest',
      description: 'Contiene 5 espíritus con alta probabilidad de raros.',
      descEn: 'Contains 5 spirits with high rare chance.',
      category: 'chests',
      price: 12000,
      currency: 'lumens',
      content: { spirits: 5, rarity: ['uncommon', 'rare'] },
      imageUrl: '/assets/shop/chest_silver.png',
      isActive: true
    },
    {
      id: 'chest_gold',
      name: 'Cofre de Oro',
      nameEn: 'Gold Chest',
      description: '8 espíritus garantizados. Épicos y Legendarios posibles.',
      descEn: '8 spirits guaranteed. Epic and Legendary possible.',
      category: 'chests',
      price: 25000,
      currency: 'lumens',
      content: { spirits: 8, rarity: ['rare', 'epic', 'legendary'] },
      imageUrl: '/assets/shop/chest_gold.png',
      isActive: true
    }
  ];

  for (const item of shopItems) {
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  console.log('✅ Shop updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
