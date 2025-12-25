import prisma from '../../utils/db'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile'],
    authorizationParams: {
      access_type: 'offline'
    }
  },
  async onSuccess(event, { user: googleUser }) {
    try {
      // Find or create user in database
      let user = await prisma.user.findUnique({
        where: { googleId: googleUser.sub }
      })

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            googleId: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            image: googleUser.picture
          }
        })
      } else {
        // Update existing user info (in case they changed their Google profile)
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: googleUser.email,
            name: googleUser.name,
            image: googleUser.picture
          }
        })
      }

      // Set user session
      await setUserSession(event, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        }
      })

      // Use header-based redirect to avoid the useHead() issue
      event.node.res.writeHead(302, { Location: '/events' })
      event.node.res.end()
      return
    } catch (error) {
      console.error('Error during OAuth success handler:', error)
      event.node.res.writeHead(302, { Location: '/login?error=server_error' })
      event.node.res.end()
      return
    }
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    event.node.res.writeHead(302, { Location: '/login?error=auth_failed' })
    event.node.res.end()
    return
  }
})
