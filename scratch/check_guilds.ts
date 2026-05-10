import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const guilds = await prisma.guild.findMany({
    select: { name: true, level: true, _count: { select: { members: true } } }
  });
  console.log('Guilds found:', guilds);
}

main().catch(console.error).finally(() => prisma.$disconnect());
