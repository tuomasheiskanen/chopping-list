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
      // Extract the base URL - Turso format is libsql://host (no path usually)
      // Remove trailing slash if present
      const host = url.host
      const path = url.pathname === '/' ? '' : url.pathname
      const baseUrl = `libsql://${host}${path}`
      const authToken = url.searchParams.get('authToken')

      if (!authToken) {
        throw new Error('Turso database URL must include authToken query parameter. Format: libsql://host?authToken=token')
      }

      const adapter = new PrismaLibSql({
        url: baseUrl,
        authToken
      })
      return new PrismaClient({ adapter })
    } catch (error) {
      console.error('Error setting up Turso connection:', error)
      if (error instanceof Error && error.message.includes('URL')) {
        throw error
      }
      throw new Error(`Failed to connect to Turso: ${error instanceof Error ? error.message : String(error)}`)
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
