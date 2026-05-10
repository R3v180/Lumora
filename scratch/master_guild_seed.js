const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌌 Iniciando Seed Maestro de Gremios...');

  const travelerId = 'cmov507f60001phurcx4ia9ej';

  // 1. Obtener algunos bots para repartir
  const bots = await prisma.playerProfile.findMany({
    where: { NOT: { id: travelerId } },
    take: 30
  });

  if (bots.length < 20) {
    console.log('❌ No hay suficientes bots en la DB. Abortando.');
    return;
  }

  // 2. Limpiar gremios actuales (excepto el tuyo si quieres mantenerlo)
  // Para ser limpios, borramos todo y recreamos
  await prisma.guildMember.deleteMany({});
  await prisma.guild.deleteMany({});

  console.log('🧹 DB Limpia de Gremios.');

  // 3. Crear TU Gremio (Ludopatas)
  const myGuild = await prisma.guild.create({
    data: {
      name: 'Ludopatas',
      description: 'El gremio oficial del Viajero Estelar. ¡A por todas!',
      emblem: '🏰',
      level: 1,
      experience: 0,
      treasury: 50000,
      ownerId: travelerId
    }
  });

  // Añadirte a ti como dueño
  await prisma.guildMember.create({
    data: { guildId: myGuild.id, playerId: travelerId, role: 'owner' }
  });

  // Añadir 4 bots a tu gremio
  for (let i = 0; i < 4; i++) {
    await prisma.guildMember.create({
      data: { guildId: myGuild.id, playerId: bots[i].id, role: 'member' }
    });
  }

  // 4. Crear Gremio Enemigo 1: Orden de la Estrella
  const enemy1 = await prisma.guild.create({
    data: {
      name: 'Orden de la Estrella',
      description: 'Los guardianes del firmamento. No pasarán.',
      emblem: '🌟',
      level: 2,
      experience: 500,
      treasury: 10000,
      ownerId: bots[4].id
    }
  });

  // Añadir miembros a Orden de la Estrella
  await prisma.guildMember.create({ data: { guildId: enemy1.id, playerId: bots[4].id, role: 'owner' } });
  for (let i = 5; i < 12; i++) {
    await prisma.guildMember.create({ data: { guildId: enemy1.id, playerId: bots[i].id, role: 'member' } });
  }

  // 5. Crear Gremio Enemigo 2: Sombras del Abismo
  const enemy2 = await prisma.guild.create({
    data: {
      name: 'Sombras del Abismo',
      description: 'Guerreros forjados en la oscuridad más profunda.',
      emblem: '🌑',
      level: 3,
      experience: 1500,
      treasury: 25000,
      ownerId: bots[13].id
    }
  });

  // Añadir miembros a Sombras del Abismo
  await prisma.guildMember.create({ data: { guildId: enemy2.id, playerId: bots[13].id, role: 'owner' } });
  for (let i = 14; i < 25; i++) {
    await prisma.guildMember.create({ data: { guildId: enemy2.id, playerId: bots[i].id, role: 'member' } });
  }

  console.log('✅ Seed Maestro completado.');
  console.log('🏰 Tu Gremio: Ludopatas (5 miembros)');
  console.log('🌟 Rival 1: Orden de la Estrella (8 miembros)');
  console.log('🌑 Rival 2: Sombras del Abismo (12 miembros)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
