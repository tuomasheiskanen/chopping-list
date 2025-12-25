import type { H3Event } from 'h3'

export interface SessionUser {
  id: string
  email: string
  name: string
  image?: string | null
}

/**
 * Get the authenticated user from the session.
 * Throws a 401 error if not authenticated.
 */
export async function requireAuth(event: H3Event): Promise<SessionUser> {
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    })
  }

  return session.user as SessionUser
}

/**
 * Get the authenticated user from the session, or null if not authenticated.
 */
export async function getAuthUser(event: H3Event): Promise<SessionUser | null> {
  const session = await getUserSession(event)
  return (session?.user as SessionUser) ?? null
}
