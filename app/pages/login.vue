<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const route = useRoute()
const error = computed(() => route.query.error as string | undefined)

const errorMessage = computed(() => {
  if (error.value === 'auth_failed') {
    return 'Sign in failed. Please try again.'
  }
  if (error.value === 'server_error') {
    return 'Something went wrong. Please try again.'
  }
  return null
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
    <div class="w-full max-w-sm">
      <!-- Logo and branding -->
      <div class="text-center mb-12">
        <div class="text-5xl mb-4">
          🛒
        </div>
        <h1 class="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
          Gather
        </h1>
        <p class="mt-3 text-gray-500 dark:text-gray-400 text-base">
          Share shopping for events with family and friends
        </p>
      </div>

      <!-- Error message -->
      <div
        v-if="errorMessage"
        class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm text-center"
      >
        {{ errorMessage }}
      </div>

      <!-- Sign in button -->
      <a
        href="/api/auth/google"
        class="flex items-center justify-center gap-3 w-full h-14 px-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white font-medium shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 active:scale-[0.98]"
      >
        <svg
          class="w-5 h-5"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            class="fill-[#4285F4]"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            class="fill-[#34A853]"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            class="fill-[#FBBC05]"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            class="fill-[#EA4335]"
          />
        </svg>
        Continue with Google
      </a>

      <!-- Footer text -->
      <p class="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
        Sign in to create and join shared shopping lists
      </p>
    </div>
  </div>
</template>
