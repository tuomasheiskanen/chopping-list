// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only secrets
    sessionPassword: process.env.NUXT_SESSION_PASSWORD,
    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      }
    },
    // Public (exposed to client)
    public: {
      appName: 'Chopping List'
    }
  },

  routeRules: {
    '/': { redirect: '/events' },
    '/dashboard': { redirect: '/events' },
    '/lists': { redirect: '/events' },
    '/lists/new': { redirect: '/events' },
    '/auth/**': { ssr: true }
    // Note: /lists/:id to /events/:id redirects handled via middleware
  },

  compatibilityDate: '2025-01-15',

  typescript: {
    strict: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
