import { defineStore } from 'pinia'

// Note: This store is optional since nuxt-auth-utils provides useUserSession composable
// Keep it for any additional auth-related state you might need

interface AuthState {
  isInitialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isInitialized: false
  }),

  actions: {
    setInitialized() {
      this.isInitialized = true
    }
  }
})
