export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn } = useUserSession()

  // If already logged in, redirect to events
  if (loggedIn.value) {
    return navigateTo('/events')
  }
})
