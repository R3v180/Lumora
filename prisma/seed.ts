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
      update: { price: 100, content: { lumens: 1000 }, isActive: true },
      create: {
        id: 'shop_lumens_small',
        name: 'Bolsa de Lumens',
        nameEn: 'Small Lumens Pouch',
        description: 'Contiene 1,000 Lumens',
        descEn: 'Contains 1,000 Lumens',
        category: 'currency',
        price: 100,
        currency: 'lumens',
        content: { lumens: 1000 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_energy_small' },
      update: { 
        name: 'Pócima Menor de Energía',
        description: 'Restaura 25 puntos de energía de forma inmediata.',
        price: 75,
        category: 'energy',
        content: { energy: 25, type: 'energy_small' } 
      },
      create: {
        id: 'shop_energy_small',
        name: 'Pócima Menor de Energía',
        nameEn: 'Minor Energy Potion',
        description: 'Restaura 25 puntos de energía de forma inmediata.',
        descEn: 'Restores 25 energy points immediately.',
        category: 'energy',
        price: 75,
        currency: 'lumens',
        content: { energy: 25, type: 'energy_small' },
        isActive: true,
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_energy_medium' },
      update: { 
        name: 'Elixir Medio de Energía',
        description: 'Restaura 60 puntos de energía para seguir jugando.',
        price: 150,
        category: 'energy',
        content: { energy: 60, type: 'energy_medium' } 
      },
      create: {
        id: 'shop_energy_medium',
        name: 'Elixir Medio de Energía',
        nameEn: 'Medium Energy Elixir',
        description: 'Restaura 60 puntos de energía para seguir jugando.',
        descEn: 'Restores 60 energy points to keep playing.',
        category: 'energy',
        price: 150,
        currency: 'lumens',
        content: { energy: 60, type: 'energy_medium' },
        isActive: true,
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_energy_refill' },
      update: { 
        name: 'Esencia Mayor de Energía',
        description: 'Una potente esencia que restaura toda tu energía al máximo.',
        price: 250,
        category: 'energy',
        content: { energyRefill: true, type: 'energy_large' } 
      },
      create: {
        id: 'shop_energy_refill',
        name: 'Esencia Mayor de Energía',
        nameEn: 'Greater Energy Essence',
        description: 'Una potente esencia que restaura toda tu energía al máximo.',
        descEn: 'A powerful essence that restores all your energy to maximum.',
        category: 'energy',
        price: 250,
        currency: 'lumens',
        content: { energyRefill: true, type: 'energy_large' },
        isActive: true,
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_shield_basic' },
      update: { price: 150, content: { type: 'shield', hours: 4 }, isActive: true },
      create: {
        id: 'shop_shield_basic',
        name: 'Escudo Onírico',
        nameEn: 'Dream Shield',
        description: '4 horas de protección total',
        descEn: '4 hours of total protection',
        category: 'boost',
        price: 150,
        currency: 'lumens',
        content: { type: 'shield', hours: 4 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_boost_exp' },
      update: { price: 500, content: { type: 'exp_boost', multiplier: 2, durationMin: 15 }, isActive: true },
      create: {
        id: 'shop_boost_exp',
        name: 'Elixir de Sabiduría',
        nameEn: 'Wisdom Elixir',
        description: 'x2 Experiencia durante 15 minutos',
        descEn: 'x2 Experience for 15 minutes',
        category: 'boost',
        price: 500,
        currency: 'lumens',
        content: { type: 'exp_boost', multiplier: 2, durationMin: 15 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_season_pass' },
      update: { price: 1500, content: { type: 'season_pass', season: 'stellar_eclipse' }, isActive: true },
      create: {
        id: 'shop_season_pass',
        name: 'Pase de Temporada: Eclipse Estelar',
        nameEn: 'Season Pass: Stellar Eclipse',
        description: 'Desbloquea recompensas exclusivas y bonos diarios',
        descEn: 'Unlock exclusive rewards and daily bonuses',
        category: 'pass',
        price: 1500,
        currency: 'lumens',
        content: { type: 'season_pass', season: 'stellar_eclipse' },
      },
    }),
  ]);
  console.log(`✅ Created ${shopItems.length} shop items`);

  // Create sanctuary decorations shop items
  const decorItems = await Promise.all([
    prisma.shopItem.upsert({
      where: { id: 'shop_deco_fountain' },
      update: {},
      create: {
        id: 'shop_deco_fountain',
        name: 'Fuente de los Sueños',
        nameEn: 'Dream Fountain',
        description: 'Genera +5 Lumens adicionales por hora',
        descEn: 'Generates +5 extra Lumens per hour',
        category: 'cosmetic',
        price: 300,
        currency: 'lumens',
        content: { type: 'fountain', lumensBonus: 5 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_deco_crystal' },
      update: {},
      create: {
        id: 'shop_deco_crystal',
        name: 'Cristal Arcano',
        nameEn: 'Arcane Crystal',
        description: '+10% de probabilidad de símbolos raros',
        descEn: '+10% chance for rare symbols',
        category: 'cosmetic',
        price: 500,
        currency: 'lumens',
        content: { type: 'crystal', rareChanceBonus: 0.1 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_deco_lamp' },
      update: {},
      create: {
        id: 'shop_deco_lamp',
        name: 'Lámpara Onírica',
        nameEn: 'Dream Lamp',
        description: 'Reduce el tiempo de cofres en un 10%',
        descEn: 'Reduces chest time by 10%',
        category: 'cosmetic',
        price: 400,
        currency: 'lumens',
        content: { type: 'lamp', chestTimeReduction: 0.1 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_deco_tree' },
      update: {},
      create: {
        id: 'shop_deco_tree',
        name: 'Bonsái Ancestral',
        nameEn: 'Ancestral Bonsai',
        description: '+5% de experiencia en todas las acciones',
        descEn: '+5% experience on all actions',
        category: 'cosmetic',
        price: 600,
        currency: 'lumens',
        content: { type: 'tree', expBonus: 0.05 },
      },
    }),
    prisma.shopItem.upsert({
      where: { id: 'shop_deco_flower_bed' },
      update: {},
      create: {
        id: 'shop_deco_flower_bed',
        name: 'Jardín de Loto',
        nameEn: 'Lotus Garden',
        description: 'Aumenta el límite de energía en +5',
        descEn: 'Increases energy limit by +5',
        category: 'cosmetic',
        price: 250,
        currency: 'lumens',
        content: { type: 'flower_bed', maxEnergyBonus: 5 },
      },
    }),
  ]);
  console.log(`✅ Created ${decorItems.length} decoration items`);

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
    prisma.achievement.upsert({
      where: { id: 'ach_place_spirit' },
      update: {},
      create: {
        id: 'ach_place_spirit',
        name: 'Primer Hogar',
        nameEn: 'First Home',
        description: 'Coloca tu primer espíritu en el santuario',
        descEn: 'Place your first spirit in the sanctuary',
        category: 'exploration',
        requirement: 1,
        reward: { lumens: 100 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_collect_idle' },
      update: {},
      create: {
        id: 'ach_collect_idle',
        name: 'Recolector Paciente',
        nameEn: 'Patient Collector',
        description: 'Recolecta Lumens idle por primera vez',
        descEn: 'Collect idle Lumens for the first time',
        category: 'exploration',
        requirement: 1,
        reward: { lumens: 50 },
      },
    }),
    // === SOCIAL ACHIEVEMENTS ===
    prisma.achievement.upsert({
      where: { id: 'ach_first_friend' },
      update: {},
      create: {
        id: 'ach_first_friend',
        name: 'Primer Amigo',
        nameEn: 'First Friend',
        description: 'Agrega a tu primer amigo en Lumora',
        descEn: 'Add your first friend in Lumora',
        category: 'social',
        requirement: 1,
        reward: { lumens: 100 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_5_friends' },
      update: {},
      create: {
        id: 'ach_5_friends',
        name: 'Alma Social',
        nameEn: 'Social Soul',
        description: 'Consigue 5 amigos en Lumora',
        descEn: 'Get 5 friends in Lumora',
        category: 'social',
        requirement: 5,
        reward: { lumens: 250 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_10_friends' },
      update: {},
      create: {
        id: 'ach_10_friends',
        name: 'Conector de Mundos',
        nameEn: 'World Connector',
        description: 'Consigue 10 amigos en Lumora',
        descEn: 'Get 10 friends in Lumora',
        category: 'social',
        requirement: 10,
        reward: { lumens: 500 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_create_guild' },
      update: {},
      create: {
        id: 'ach_create_guild',
        name: 'Fundador',
        nameEn: 'Founder',
        description: 'Crea tu propio gremio',
        descEn: 'Create your own guild',
        category: 'social',
        requirement: 1,
        reward: { lumens: 200 },
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'ach_join_guild' },
      update: {},
      create: {
        id: 'ach_join_guild',
        name: 'Miembro del Clan',
        nameEn: 'Clan Member',
        description: 'Únete a un gremio por primera vez',
        descEn: 'Join a guild for the first time',
        category: 'social',
        requirement: 1,
        reward: { lumens: 75 },
      },
    }),
  ]);
  console.log(`✅ Created ${achievements.length} achievements`);

  // === TESTING & BOTS SECTION ===
  console.log('🧪 Setting up testing environment...');
  
  // 1. Boost "Viajero Estelar"
  const traveler = await prisma.playerProfile.updateMany({
    where: { displayName: { contains: 'Viajero' } },
    data: {
      lumens: 1000000,
      energy: 5000,
      maxEnergy: 5000,
      level: 50
    }
  });
  console.log(`🚀 Boosted ${traveler.count} traveler profiles`);

  // 2. Create Vulnerable Rich Bots
  const botNames = ['Sombra Nocturna', 'Espectro Errante', 'Viento del Norte', 'Llama Eterna', 'Gota de Rocío'];
  const elements = ['fire', 'water', 'nature', 'dream', 'star'];

  for (let i = 0; i < botNames.length; i++) {
    const botId = `bot_test_${i}`;
    const botUser = await prisma.user.upsert({
      where: { email: `bot${i}@lumora.test` },
      update: {},
      create: {
        id: botId,
        email: `bot${i}@lumora.test`,
        name: botNames[i],
      },
    });

    const botProfile = await prisma.playerProfile.upsert({
      where: { userId: botId },
      update: {
        lumens: 1000,
        level: 10 + i * 5,
      },
      create: {
        userId: botId,
        displayName: botNames[i],
        level: 10 + i * 5,
        lumens: 1000,
        energy: 150,
      },
    });

    // High producing sanctuary with NO shield and 8 hours of idle time
    await prisma.sanctuary.upsert({
      where: { playerId: botProfile.id },
      update: {
        lumensPerHour: 500 + i * 100,
        shieldUntil: null, // Always vulnerable
        lastCollectAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
      create: {
        playerId: botProfile.id,
        name: `Isla de ${botNames[i]}`,
        lumensPerHour: 500 + i * 100,
        shieldUntil: null,
        lastCollectAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      },
    });

    // Give bot some spirits so they have defense power
    const botSpiritType = await prisma.spiritType.findFirst({
      where: { element: elements[i % elements.length] }
    });

    if (botSpiritType) {
      await prisma.playerSpirit.create({
        data: {
          playerId: botProfile.id,
          spiritTypeId: botSpiritType.id,
          level: 10,
        }
      }).catch(() => {}); // Ignore if already exists
    }
  }
  console.log(`🤖 Created/Updated ${botNames.length} rich bots for raiding`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
