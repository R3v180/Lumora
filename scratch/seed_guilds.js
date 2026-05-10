const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding enemy guilds...');

  // Create Enemy Guild 1
  await prisma.guild.upsert({
    where: { name: 'Orden de la Estrella' },
    update: {},
    create: {
      name: 'Orden de la Estrella',
      description: 'Defensores de la luz astral. No nos rendiremos.',
      emblem: '🌟',
      level: 3,
      experience: 1200,
      treasury: 15000,
      ownerId: 'bot_owner_1'
    }
  });

  // Create Enemy Guild 2
  await prisma.guild.upsert({
    where: { name: 'Sombras del Abismo' },
    update: {},
    create: {
      name: 'Sombras del Abismo',
      description: 'El vacío nos reclama. Guerreros de la oscuridad.',
      emblem: '🌑',
      level: 5,
      experience: 4500,
      treasury: 25000,
      ownerId: 'bot_owner_2'
    }
  });

  console.log('✅ Enemy guilds created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
