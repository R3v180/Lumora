import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const BOT_NAMES = [
  "Caballero Oscuro", "Viajero Lunar", "Mago de Luz", "Guardián Estelar",
  "Sombra Veloz", "Llama Eterna", "Viento del Norte", "Cazador de Sueños",
  "Rayo Azul", "Señor de las Bestias", "Dama del Lago", "Paladín Caído",
  "Espectro Nocturno", "Furia de Cristal", "Sabio Ancestral", "Titán de Piedra",
  "Arquero Ciego", "Susurro del Bosque", "Corazón de Dragón", "Reina de Hielo",
  "Místico Astral", "Guerrero del Alba", "Fantasma Errante", "Vengador Solar",
  "Caminante del Vacío", "Alquimista Loco", "Caballero Prisma", "Señora del Fuego",
  "Señor del Tiempo", "Sombra de la Muerte"
];

const SPIRIT_IDS = [
  'spirit_fire_common_1', 'spirit_fire_epic_1', 'spirit_fire_uncommon_1',
  'spirit_fire_legendary_1', 'spirit_fire_rare_1', 'spirit_water_legendary_1',
  'spirit_water_epic_1', 'spirit_water_rare_1', 'spirit_water_common_1',
  'spirit_water_uncommon_1', 'spirit_dream_epic_1', 'spirit_dream_rare_1',
  'spirit_dream_legendary_1', 'spirit_dream_common_1', 'spirit_dream_uncommon_1',
  'spirit_nature_uncommon_1', 'spirit_nature_legendary_1', 'spirit_nature_epic_1',
  'spirit_nature_rare_1', 'spirit_nature_common_1', 'spirit_star_uncommon_1',
  'spirit_star_rare_1', 'spirit_star_legendary_1', 'spirit_star_common_1',
  'spirit_star_epic_1'
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSpirits(count: number) {
  const spirits: any[] = [];
  for (let i = 0; i < count; i++) {
    spirits.push({
      id: `bot_spirit_${randomUUID()}`,
      spriteId: SPIRIT_IDS[randomInt(0, SPIRIT_IDS.length - 1)],
      level: randomInt(1, 10),
      power: randomInt(50, 500)
    });
  }
  return spirits;
}

async function seedBots() {
  console.log('Starting bot seeding...');
  
  // Clean up old bot guild if it exists to prevent ownerId issues on reset
  const existingGuild = await prisma.guild.findUnique({ where: { name: 'Autómatas de Lumora' } });
  if (existingGuild) {
    await prisma.guild.delete({ where: { id: existingGuild.id } });
  }

  let botGuild: any = null;
  
  for (let i = 0; i < 50; i++) {
    const name = `${BOT_NAMES[randomInt(0, BOT_NAMES.length - 1)]} ${randomInt(10, 999)}`;
    const level = randomInt(1, 25);
    const fakeUserId = `bot_user_${randomUUID()}`;
    
    // Create User
    await prisma.user.create({
      data: {
        id: fakeUserId,
        name: name,
        email: `bot_${randomUUID()}@lumora.dream`,
      }
    });

    // Create Profile
    const profile = await prisma.playerProfile.create({
      data: {
        userId: fakeUserId,
        displayName: name,
        level: level,
        experience: level * 100 + randomInt(0, 99),
        lumens: randomInt(1000, 50000),
        energy: randomInt(50, 150),
        maxEnergy: 100 + Math.floor(level / 2) * 10,
        sanctuaryLevel: randomInt(1, 8),
        arenaRating: randomInt(800, 2000),
        arenaDefenseTeam: getRandomSpirits(3)
      }
    });

    // Create Sanctuary
    await prisma.sanctuary.create({
      data: {
        playerId: profile.id,
        name: `Isla de ${name}`,
        globalFire: randomInt(0, 100),
        globalWater: randomInt(0, 100),
        globalNature: randomInt(0, 100),
        globalDream: randomInt(0, 100),
        globalStar: randomInt(0, 50),
        lumensPerHour: randomInt(10, 200),
        lastCollectAt: new Date(Date.now() - randomInt(0, 8 * 3600000)), // up to 8h ago
        // 20% chance of having a shield (easier for raiding)
        shieldUntil: Math.random() > 0.8 ? new Date(Date.now() + randomInt(1, 12) * 3600000) : null
      }
    });

    // Optionally add some spirits to the player's collection
    const spiritCount = randomInt(1, 10);
    for (let j = 0; j < spiritCount; j++) {
      const typeId = SPIRIT_IDS[randomInt(0, SPIRIT_IDS.length - 1)];
      await prisma.playerSpirit.create({
        data: {
          playerId: profile.id,
          spiritTypeId: typeId,
          level: randomInt(1, level),
          experience: 0
        }
      });
    }

    // Add to Bot Guild
    if (!botGuild) {
      botGuild = await prisma.guild.create({
        data: {
          name: 'Autómatas de Lumora',
          description: '[IA DEL SISTEMA] Somos los Guardianes de Prueba. Aquí verás a todos los bots del servidor.',
          level: 20,
          experience: 15000,
          maxMembers: 1000,
          ownerId: profile.id
        }
      });
      // Add owner as member
      await prisma.guildMember.create({
        data: { guildId: botGuild.id, playerId: profile.id, role: 'owner' }
      });
    } else {
      await prisma.guildMember.create({
        data: { guildId: botGuild.id, playerId: profile.id, role: 'member' }
      });
    }

    if (i % 10 === 0) {
      console.log(`Seeded ${i} bots...`);
    }
  }

  console.log('✅ Bot seeding complete!');
}

seedBots()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
