import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Echoes of Lumora database...');

  // Create World State
  const worldState = await prisma.worldState.upsert({
    where: { id: 'lumora_world' },
    update: {},
    create: {
      id: 'lumora_world',
      totalWater: 0,
      totalFire: 0,
      totalNature: 0,
      totalDream: 0,
      totalStar: 0,
      totalSpins: 0,
      totalPlayers: 0,
      treeLevel: 1,
    },
  });
  console.log('✅ World state created');

  // Create Spirit Types - Fire
  const fireSpirits = await Promise.all([
    prisma.spiritType.upsert({
      where: { id: 'spirit_fire_common_1' },
      update: {},
      create: {
        id: 'spirit_fire_common_1',
        name: 'Chispa',
        nameEn: 'Spark',
        element: 'fire',
        rarity: 'common',
        description: 'Una pequeña llama danzante que ilumina el camino',
        descEn: 'A small dancing flame that lights the way',
        basePower: 10,
        lumensPerHour: 3,
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_fire_uncommon_1' },
      update: {},
      create: {
        id: 'spirit_fire_uncommon_1',
        name: 'Ignis',
        nameEn: 'Ignis',
        element: 'fire',
        rarity: 'uncommon',
        description: 'Espíritu guardián del fuego primordial',
        descEn: 'Guardian spirit of primordial fire',
        basePower: 25,
        lumensPerHour: 8,
        evolveFrom: 'spirit_fire_common_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_fire_rare_1' },
      update: {},
      create: {
        id: 'spirit_fire_rare_1',
        name: 'Fénix Menor',
        nameEn: 'Lesser Phoenix',
        element: 'fire',
        rarity: 'rare',
        description: 'Ave de fuego que renace de las cenizas',
        descEn: 'Fire bird that rises from ashes',
        basePower: 50,
        lumensPerHour: 15,
        evolveFrom: 'spirit_fire_uncommon_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_fire_epic_1' },
      update: {},
      create: {
        id: 'spirit_fire_epic_1',
        name: 'Dragón de Brasas',
        nameEn: 'Ember Dragon',
        element: 'fire',
        rarity: 'epic',
        description: 'Majestuoso dragón de fuego eterno',
        descEn: 'Majestic dragon of eternal fire',
        basePower: 100,
        lumensPerHour: 30,
        evolveFrom: 'spirit_fire_rare_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_fire_legendary_1' },
      update: {},
      create: {
        id: 'spirit_fire_legendary_1',
        name: 'Sol de Lumora',
        nameEn: 'Sun of Lumora',
        element: 'fire',
        rarity: 'legendary',
        description: 'La encarnación del fuego celestial que da vida a Lumora',
        descEn: 'Incarnation of celestial fire that gives life to Lumora',
        basePower: 250,
        lumensPerHour: 75,
        evolveFrom: 'spirit_fire_epic_1',
      },
    }),
  ]);
  console.log(`✅ Created ${fireSpirits.length} fire spirits`);

  // Water Spirits
  const waterSpirits = await Promise.all([
    prisma.spiritType.upsert({
      where: { id: 'spirit_water_common_1' },
      update: {},
      create: {
        id: 'spirit_water_common_1',
        name: 'Gotita',
        nameEn: 'Droplet',
        element: 'water',
        rarity: 'common',
        description: 'Una pequeña gota de agua mágica que fluye suavemente',
        descEn: 'A small drop of magical water that flows softly',
        basePower: 10,
        lumensPerHour: 3,
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_water_uncommon_1' },
      update: {},
      create: {
        id: 'spirit_water_uncommon_1',
        name: 'Aqua',
        nameEn: 'Aqua',
        element: 'water',
        rarity: 'uncommon',
        description: 'Espíritu de las corrientes cristalinas',
        descEn: 'Spirit of crystal currents',
        basePower: 25,
        lumensPerHour: 8,
        evolveFrom: 'spirit_water_common_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_water_rare_1' },
      update: {},
      create: {
        id: 'spirit_water_rare_1',
        name: 'Sirena de Río',
        nameEn: 'River Siren',
        element: 'water',
        rarity: 'rare',
        description: 'Criatura acuática que canta melodías hipnóticas',
        descEn: 'Aquatic creature that sings hypnotic melodies',
        basePower: 50,
        lumensPerHour: 15,
        evolveFrom: 'spirit_water_uncommon_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_water_epic_1' },
      update: {},
      create: {
        id: 'spirit_water_epic_1',
        name: 'Leviatán',
        nameEn: 'Leviathan',
        element: 'water',
        rarity: 'epic',
        description: 'Señor de los océanos profundos de Lumora',
        descEn: 'Lord of Lumora\'s deep oceans',
        basePower: 100,
        lumensPerHour: 30,
        evolveFrom: 'spirit_water_rare_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_water_legendary_1' },
      update: {},
      create: {
        id: 'spirit_water_legendary_1',
        name: 'Marea Celestial',
        nameEn: 'Celestial Tide',
        element: 'water',
        rarity: 'legendary',
        description: 'La fuerza del océano cósmico que mueve Lumora',
        descEn: 'The force of the cosmic ocean that moves Lumora',
        basePower: 250,
        lumensPerHour: 75,
        evolveFrom: 'spirit_water_epic_1',
      },
    }),
  ]);
  console.log(`✅ Created ${waterSpirits.length} water spirits`);

  // Dream Spirits
  const dreamSpirits = await Promise.all([
    prisma.spiritType.upsert({
      where: { id: 'spirit_dream_common_1' },
      update: {},
      create: {
        id: 'spirit_dream_common_1',
        name: 'Suspiro',
        nameEn: 'Whisper',
        element: 'dream',
        rarity: 'common',
        description: 'Un suave murmullo de los sueños más dulces',
        descEn: 'A soft whisper from the sweetest dreams',
        basePower: 10,
        lumensPerHour: 4,
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_dream_uncommon_1' },
      update: {},
      create: {
        id: 'spirit_dream_uncommon_1',
        name: 'Somnus',
        nameEn: 'Somnus',
        element: 'dream',
        rarity: 'uncommon',
        description: 'Tejedor de sueños y pesadillas',
        descEn: 'Weaver of dreams and nightmares',
        basePower: 25,
        lumensPerHour: 10,
        evolveFrom: 'spirit_dream_common_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_dream_rare_1' },
      update: {},
      create: {
        id: 'spirit_dream_rare_1',
        name: 'Aurora Mental',
        nameEn: 'Mental Aurora',
        element: 'dream',
        rarity: 'rare',
        description: 'Espectro de luces que danza entre realidades',
        descEn: 'Spectrum of lights dancing between realities',
        basePower: 50,
        lumensPerHour: 18,
        evolveFrom: 'spirit_dream_uncommon_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_dream_epic_1' },
      update: {},
      create: {
        id: 'spirit_dream_epic_1',
        name: 'Soñador Eterno',
        nameEn: 'Eternal Dreamer',
        element: 'dream',
        rarity: 'epic',
        description: 'Ser que existe entre el sueño y la vigilia eternamente',
        descEn: 'Being that exists between dream and wakefulness eternally',
        basePower: 100,
        lumensPerHour: 35,
        evolveFrom: 'spirit_dream_rare_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_dream_legendary_1' },
      update: {},
      create: {
        id: 'spirit_dream_legendary_1',
        name: 'Tejedor de Lumora',
        nameEn: 'Weaver of Lumora',
        element: 'dream',
        rarity: 'legendary',
        description: 'El arquitecto del mundo onírico de Lumora',
        descEn: 'The architect of Lumora\'s dream world',
        basePower: 250,
        lumensPerHour: 80,
        evolveFrom: 'spirit_dream_epic_1',
      },
    }),
  ]);
  console.log(`✅ Created ${dreamSpirits.length} dream spirits`);

  // Nature Spirits
  const natureSpirits = await Promise.all([
    prisma.spiritType.upsert({
      where: { id: 'spirit_nature_common_1' },
      update: {},
      create: {
        id: 'spirit_nature_common_1',
        name: 'Brotito',
        nameEn: 'Sprout',
        element: 'nature',
        rarity: 'common',
        description: 'Un pequeño brote lleno de energía natural',
        descEn: 'A small sprout full of natural energy',
        basePower: 10,
        lumensPerHour: 3,
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_nature_uncommon_1' },
      update: {},
      create: {
        id: 'spirit_nature_uncommon_1',
        name: 'Verdis',
        nameEn: 'Verdis',
        element: 'nature',
        rarity: 'uncommon',
        description: 'Guardián del bosque ancestral',
        descEn: 'Guardian of the ancestral forest',
        basePower: 25,
        lumensPerHour: 8,
        evolveFrom: 'spirit_nature_common_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_nature_rare_1' },
      update: {},
      create: {
        id: 'spirit_nature_rare_1',
        name: 'Árbol Sabio',
        nameEn: 'Wise Tree',
        element: 'nature',
        rarity: 'rare',
        description: 'Árbol milenario que atesora la sabiduría de Lumora',
        descEn: 'Millennial tree that treasures Lumora\'s wisdom',
        basePower: 50,
        lumensPerHour: 15,
        evolveFrom: 'spirit_nature_uncommon_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_nature_epic_1' },
      update: {},
      create: {
        id: 'spirit_nature_epic_1',
        name: 'Guardián del Bosque',
        nameEn: 'Forest Guardian',
        element: 'nature',
        rarity: 'epic',
        description: 'Ente colosal que protege toda la vida natural',
        descEn: 'Colossal entity that protects all natural life',
        basePower: 100,
        lumensPerHour: 30,
        evolveFrom: 'spirit_nature_rare_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_nature_legendary_1' },
      update: {},
      create: {
        id: 'spirit_nature_legendary_1',
        name: 'Raíz del Mundo',
        nameEn: 'World Root',
        element: 'nature',
        rarity: 'legendary',
        description: 'La raíz que conecta toda la vida de Lumora',
        descEn: 'The root that connects all life in Lumora',
        basePower: 250,
        lumensPerHour: 75,
        evolveFrom: 'spirit_nature_epic_1',
      },
    }),
  ]);
  console.log(`✅ Created ${natureSpirits.length} nature spirits`);

  // Star Spirits
  const starSpirits = await Promise.all([
    prisma.spiritType.upsert({
      where: { id: 'spirit_star_common_1' },
      update: {},
      create: {
        id: 'spirit_star_common_1',
        name: 'Destello',
        nameEn: 'Glimmer',
        element: 'star',
        rarity: 'common',
        description: 'Un pequeño destello de luz estelar',
        descEn: 'A small glimmer of starlight',
        basePower: 10,
        lumensPerHour: 4,
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_star_uncommon_1' },
      update: {},
      create: {
        id: 'spirit_star_uncommon_1',
        name: 'Astra',
        nameEn: 'Astra',
        element: 'star',
        rarity: 'uncommon',
        description: 'Espíritu de las constelaciones danzantes',
        descEn: 'Spirit of dancing constellations',
        basePower: 25,
        lumensPerHour: 10,
        evolveFrom: 'spirit_star_common_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_star_rare_1' },
      update: {},
      create: {
        id: 'spirit_star_rare_1',
        name: 'Nova Menor',
        nameEn: 'Minor Nova',
        element: 'star',
        rarity: 'rare',
        description: 'Estrella que explota en mil colores mágicos',
        descEn: 'Star that explodes in a thousand magical colors',
        basePower: 50,
        lumensPerHour: 18,
        evolveFrom: 'spirit_star_uncommon_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_star_epic_1' },
      update: {},
      create: {
        id: 'spirit_star_epic_1',
        name: 'Cometa Arcano',
        nameEn: 'Arcane Comet',
        element: 'star',
        rarity: 'epic',
        description: 'Cometa que recorre los cielos dejando magia pura',
        descEn: 'Comet that crosses the skies leaving pure magic',
        basePower: 100,
        lumensPerHour: 35,
        evolveFrom: 'spirit_star_rare_1',
      },
    }),
    prisma.spiritType.upsert({
      where: { id: 'spirit_star_legendary_1' },
      update: {},
      create: {
        id: 'spirit_star_legendary_1',
        name: 'Corona de Lumora',
        nameEn: 'Crown of Lumora',
        element: 'star',
        rarity: 'legendary',
        description: 'La estrella más brillante del firmamento de Lumora',
        descEn: 'The brightest star in Lumora\'s sky',
        basePower: 250,
        lumensPerHour: 80,
        evolveFrom: 'spirit_star_epic_1',
      },
    }),
  ]);
  console.log(`✅ Created ${starSpirits.length} star spirits`);

  // Create Shop Items
  const shopItems = await Promise.all([
    prisma.shopItem.upsert({
      where: { id: 'shop_lumens_small' },
      update: {},
      create: {
        id: 'shop_lumens_small',
        name: 'Bolsa de Lumens',
        nameEn: 'Lumen Pouch',
        description: '500 Lumens para tu aventura',
        descEn: '500 Lumens for your adventure',
        category: 'lumens',
        price: 100,
        currency: 'lumens',
        content: { lumens: 500 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_lumens_medium' },
      update: {},
      create: {
        id: 'shop_lumens_medium',
        name: 'Cofre de Lumens',
        nameEn: 'Lumen Chest',
        description: '1,500 Lumens + 200 de bono',
        descEn: '1,500 Lumens + 200 bonus',
        category: 'lumens',
        price: 300,
        currency: 'lumens',
        content: { lumens: 1500, bonus: 200 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_energy_refill' },
      update: {},
      create: {
        id: 'shop_energy_refill',
        name: 'Recarga de Energía',
        nameEn: 'Energy Refill',
        description: 'Restaura tu energía al máximo',
        descEn: 'Restores your energy to maximum',
        category: 'boost',
        price: 50,
        currency: 'lumens',
        content: { energyRefill: true },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_season_pass' },
      update: {},
      create: {
        id: 'shop_season_pass',
        name: 'Pase de Temporada: Eclipse Estelar',
        nameEn: 'Season Pass: Stellar Eclipse',
        description: 'Desbloquea recompensas exclusivas durante la temporada',
        descEn: 'Unlock exclusive rewards during the season',
        category: 'pass',
        price: 500,
        currency: 'lumens',
        content: { type: 'season_pass', season: 'stellar_eclipse' },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_bundle_forest' },
      update: {},
      create: {
        id: 'shop_bundle_forest',
        name: 'Paquete Espíritus del Bosque',
        nameEn: 'Forest Spirits Bundle',
        description: '3 espíritus de naturaleza + decoración de bosque',
        descEn: '3 nature spirits + forest decoration',
        category: 'bundle',
        price: 200,
        currency: 'lumens',
        content: { spirits: 3, element: 'nature', decoration: 'forest_grove' },
      },
    }),
  ]);
  console.log(`✅ Created ${shopItems.length} shop items`);

  // Create initial achievements
  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { id: 'ach_first_spin' },
      update: {},
      create: {
        id: 'ach_first_spin',
        name: 'Primer Giro',
        nameEn: 'First Spin',
        description: 'Realiza tu primer giro onírico',
        descEn: 'Perform your first dream spin',
        category: 'exploration',
        requirement: 1,
        reward: { lumens: 50 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_10_spins' },
      update: {},
      create: {
        id: 'ach_10_spins',
        name: 'Soñador Novato',
        nameEn: 'Novice Dreamer',
        description: 'Realiza 10 giros oníricos',
        descEn: 'Perform 10 dream spins',
        category: 'exploration',
        requirement: 10,
        reward: { lumens: 100 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_first_spirit' },
      update: {},
      create: {
        id: 'ach_first_spirit',
        name: 'Primer Espíritu',
        nameEn: 'First Spirit',
        description: 'Consigue tu primer espíritu guardián',
        descEn: 'Obtain your first guardian spirit',
        category: 'collection',
        requirement: 1,
        reward: { lumens: 75 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_5_spirits' },
      update: {},
      create: {
        id: 'ach_5_spirits',
        name: 'Coleccionista',
        nameEn: 'Collector',
        description: 'Consigue 5 espíritus guardianes',
        descEn: 'Obtain 5 guardian spirits',
        category: 'collection',
        requirement: 5,
        reward: { lumens: 200 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_rare_spirit' },
      update: {},
      create: {
        id: 'ach_rare_spirit',
        name: 'Espíritu Raro',
        nameEn: 'Rare Spirit',
        description: 'Consigue un espíritu de rareza Raro o superior',
        descEn: 'Obtain a Rare or higher spirit',
        category: 'collection',
        requirement: 1,
        reward: { lumens: 150 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_first_merge' },
      update: {},
      create: {
        id: 'ach_first_merge',
        name: 'Fusión Primera',
        nameEn: 'First Merge',
        description: 'Fusiona dos espíritus por primera vez',
        descEn: 'Merge two spirits for the first time',
        category: 'collection',
        requirement: 1,
        reward: { lumens: 100 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_sanc_level5' },
      update: {},
      create: {
        id: 'ach_sanc_level5',
        name: 'Santuario Floreciente',
        nameEn: 'Blossoming Sanctuary',
        description: 'Alcanza el nivel 5 de santuario',
        descEn: 'Reach sanctuary level 5',
        category: 'exploration',
        requirement: 5,
        reward: { lumens: 300 },
      },
    }),
  ]);
  console.log(`✅ Created ${achievements.length} achievements`);

  console.log('');
  console.log('🌟 Echoes of Lumora database seeded successfully!');
  console.log(`   - ${fireSpirits.length + waterSpirits.length + dreamSpirits.length + natureSpirits.length + starSpirits.length} Spirit Types`);
  console.log(`   - ${shopItems.length} Shop Items`);
  console.log(`   - ${achievements.length} Achievements`);
  console.log(`   - World State initialized`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
