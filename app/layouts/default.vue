<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const router = useRouter()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  router.push('/login')
}

const navigation = [
  { label: 'Events', icon: 'i-lucide-calendar', to: '/events' },
  { label: 'My Items', icon: 'i-lucide-check-square', to: '/my-items' }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header - minimal and unobtrusive -->
    <header class="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-900">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink
          to="/events"
          class="flex items-center gap-2"
        >
          <span class="text-xl">🛒</span>
          <span class="font-semibold text-gray-900 dark:text-white">Chopping List</span>
        </NuxtLink>

        <!-- User avatar with dropdown -->
        <div
          v-if="loggedIn"
          class="flex items-center"
        >
          <UDropdownMenu
            :items="[
              [
                { label: (user as any)?.email || 'Account', disabled: true },
                { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: logout }
              ]
            ]"
          >
            <button class="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-800 transition-all">
              <img
                v-if="(user as any)?.image"
                :src="(user as any).image"
                :alt="(user as any)?.name || 'User'"
                class="w-full h-full object-cover"
              >
              <div
                v-else
                class="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-sm font-medium"
              >
                {{ ((user as any)?.name || 'U').charAt(0).toUpperCase() }}
              </div>
            </button>
          </UDropdownMenu>
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <main class="pb-20">
      <slot />
    </main>

    <!-- Bottom navigation - mobile first -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-900 safe-bottom">
      <div class="max-w-lg mx-auto px-6 h-16 flex items-center justify-around">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors"
          :class="$route.path.startsWith(item.to)
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'"
        >
          <UIcon
            :name="item.icon"
            class="w-6 h-6"
          />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
