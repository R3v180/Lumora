const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const player = await prisma.playerProfile.findFirst({
    where: { displayName: { contains: 'Viajero' } }
  });
  console.log(JSON.stringify(player, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
