import { PrismaClient } from '@prisma/client'

const NEON_URL = "postgresql://neondb_owner:npg_VzUqpNx1WY9v@ep-broad-feather-al79xap1-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: NEON_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
