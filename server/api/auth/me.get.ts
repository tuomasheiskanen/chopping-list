export default defineEventHandler(async (event) => {
  // Get the current user session
  const session = await getUserSession(event)

  if (!session?.user) {
    return { user: null }
  }

  return { user: session.user }
})
