const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const players = await prisma.playerProfile.findMany({
    select: { id: true, displayName: true }
  });
  console.log(JSON.stringify(players, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
