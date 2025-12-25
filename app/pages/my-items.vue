<script setup lang="ts">
interface EventItem {
  id: string
  title: string
  description?: string | null
  eventType?: string | null
  itemCounts?: {
    total: number
    purchased: number
    myItems: number
  }
}

definePageMeta({
  middleware: 'auth'
})

const { data: listsData, pending } = await useFetch('/api/lists')
const events = computed(() => (listsData.value as { lists: EventItem[] } | null)?.lists ?? [])

function getEventEmoji(event: EventItem) {
  if (event.description && /\p{Emoji}/u.test(event.description)) {
    return event.description.match(/\p{Emoji}/u)?.[0] || '📋'
  }
  const typeEmojis: Record<string, string> = {
    birthday: '🎂',
    dinner: '🍽️',
    christmas: '🎄',
    custom: '📋'
  }
  return typeEmojis[event.eventType || 'custom'] || '📋'
}

const totalItems = computed(() => {
  return events.value.reduce((acc: number, event) => acc + (event.itemCounts?.myItems || 0), 0)
})

const eventsWithMyItems = computed(() => {
  return events.value.filter(e => e.itemCounts?.myItems && e.itemCounts.myItems > 0)
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
        My Items
      </h1>
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
        Items you've claimed to buy
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="pending"
      class="flex justify-center py-16"
    >
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Summary -->
    <div
      v-else-if="totalItems > 0"
      class="space-y-4"
    >
      <div class="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-4 text-center mb-6">
        <div class="text-3xl font-semibold text-primary-600 dark:text-primary-400">
          {{ totalItems }}
        </div>
        <div class="text-sm text-primary-600/80 dark:text-primary-400/80">
          items to buy
        </div>
      </div>

      <!-- Events with my items -->
      <NuxtLink
        v-for="event in eventsWithMyItems"
        :key="event.id"
        :to="`/events/${event.id}`"
        class="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
      >
        <div class="text-2xl">{{ getEventEmoji(event) }}</div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-900 dark:text-white">
            {{ event.title }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ event.itemCounts?.myItems }} items
          </p>
        </div>
        <UIcon
          name="i-lucide-chevron-right"
          class="w-5 h-5 text-gray-300 dark:text-gray-600"
        />
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-16"
    >
      <div class="text-5xl mb-4">
        ✨
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        Nothing to buy
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm">
        Claim items from events to see them here
      </p>
      <NuxtLink
        to="/events"
        class="inline-block mt-4 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
      >
        Browse events
      </NuxtLink>
    </div>
  </div>
</template>
