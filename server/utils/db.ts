import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // If using Turso (libsql://), use the libSQL adapter
  if (databaseUrl.startsWith('libsql://')) {
    // Parse the URL to extract connection string and auth token
    try {
      const url = new URL(databaseUrl)
      const connectionString = `libsql://${url.host}${url.pathname}`
      const authToken = url.searchParams.get('authToken') || undefined

      const adapter = new PrismaLibSql({
        url: connectionString,
        authToken
      })
      return new PrismaClient({ adapter })
    } catch (error) {
      console.error('Error parsing Turso database URL:', error)
      throw new Error('Invalid Turso database URL format')
    }
  }

  // Otherwise, use standard Prisma Client (for file:// SQLite)
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
