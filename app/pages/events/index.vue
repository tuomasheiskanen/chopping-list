<script setup lang="ts">
interface EventItem {
  id: string
  title: string
  description?: string | null
  eventType?: string | null
  eventDate?: string | null
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

// Create event modal
const showCreateModal = ref(false)
const isCreating = ref(false)
const newEvent = ref({
  title: '',
  emoji: '🎉',
  eventDate: ''
})

const router = useRouter()

// Error state
const errorMessage = ref('')

// Common event emojis
const emojis = ['🎉', '🎂', '🎄', '🍽️', '🥳', '🎃', '🌸', '🍕', '☀️', '🏠']

async function createEvent() {
  if (!newEvent.value.title.trim()) return

  isCreating.value = true
  errorMessage.value = ''
  try {
    const { list } = await $fetch<{ list: { id: string } }>('/api/lists', {
      method: 'POST',
      body: {
        title: newEvent.value.title,
        eventType: 'custom',
        eventDate: newEvent.value.eventDate || undefined,
        description: newEvent.value.emoji // Store emoji in description for now
      }
    })

    showCreateModal.value = false
    newEvent.value = { title: '', emoji: '🎉', eventDate: '' }
    router.push(`/events/${list.id}`)
  } catch {
    errorMessage.value = 'Failed to create event. Please try again.'
  } finally {
    isCreating.value = false
  }
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 0 && days <= 7) return `In ${days} days`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getEventEmoji(event: EventItem) {
  // Check description for emoji, fallback to event type
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

function getProgress(event: EventItem) {
  if (!event.itemCounts?.total) return 0
  return Math.round((event.itemCounts.purchased / event.itemCounts.total) * 100)
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
        Events
      </h1>
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
        Your upcoming shopping lists
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="pending"
      class="flex justify-center py-16"
    >
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Events list -->
    <div
      v-else-if="events.length > 0"
      class="space-y-3"
    >
      <NuxtLink
        v-for="event in events"
        :key="event.id"
        :to="`/events/${event.id}`"
        class="block bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors active:scale-[0.99]"
      >
        <div class="flex items-center gap-4">
          <!-- Emoji -->
          <div class="text-3xl flex-shrink-0">
            {{ getEventEmoji(event) }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white truncate">
              {{ event.title }}
            </h3>
            <div class="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="event.eventDate">{{ formatDate(event.eventDate) }}</span>
              <span>{{ event.itemCounts?.total || 0 }} items</span>
            </div>
          </div>

          <!-- Progress indicator -->
          <div class="flex-shrink-0 flex items-center gap-2">
            <div
              v-if="event.itemCounts?.total && event.itemCounts.total > 0"
              class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium"
              :class="getProgress(event) === 100
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
            >
              {{ getProgress(event) }}%
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="w-5 h-5 text-gray-300 dark:text-gray-600"
            />
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-16"
    >
      <div class="text-5xl mb-4">
        📋
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        No events yet
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm">
        Create your first event to get started
      </p>
    </div>

    <!-- Floating action button -->
    <button
      class="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
      @click="showCreateModal = true"
    >
      <UIcon
        name="i-lucide-plus"
        class="w-6 h-6"
      />
    </button>

    <!-- Create event modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            New Event
          </h2>

          <!-- Error message -->
          <div
            v-if="errorMessage"
            class="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm"
          >
            {{ errorMessage }}
          </div>

          <form
            class="space-y-5"
            @submit.prevent="createEvent"
          >
            <!-- Event name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event name
              </label>
              <input
                v-model="newEvent.title"
                type="text"
                placeholder="e.g., Christmas Dinner"
                class="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                autofocus
              >
            </div>

            <!-- Emoji picker -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose an emoji
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="emoji in emojis"
                  :key="emoji"
                  type="button"
                  class="w-12 h-12 text-2xl rounded-xl border-2 transition-all hover:scale-105 active:scale-95"
                  :class="newEvent.emoji === emoji
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'"
                  @click="newEvent.emoji = emoji"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>

            <!-- Date (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                v-model="newEvent.eventDate"
                type="date"
                class="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 h-12 px-4 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                @click="showCreateModal = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 h-12 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!newEvent.title.trim() || isCreating"
              >
                {{ isCreating ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
