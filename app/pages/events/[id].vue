<script setup lang="ts">
interface ListItem {
  id: string
  name: string
  quantity: number
  unit: string
  status: 'PENDING' | 'ASSIGNED' | 'PURCHASED'
  assignedUserId?: string | null
  assignedUser?: {
    id: string
    name: string
    image?: string | null
  } | null
}

interface EventData {
  id: string
  title: string
  description?: string | null
  eventDate?: string | null
  eventType?: string | null
  items: ListItem[]
  isOwner: boolean
}

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { user } = useUserSession()

const eventId = computed(() => route.params.id as string)
const { data: listData, pending, refresh } = await useFetch(() => `/api/lists/${eventId.value}`)

const event = computed(() => (listData.value as { list: EventData } | null)?.list)
const items = computed(() => event.value?.items ?? [])

// Group items by status
const unclaimedItems = computed(() => items.value.filter(i => i.status === 'PENDING'))
const claimedItems = computed(() => items.value.filter(i => i.status === 'ASSIGNED'))
const purchasedItems = computed(() => items.value.filter(i => i.status === 'PURCHASED'))

// Add item
const newItemName = ref('')
const isAddingItem = ref(false)
const itemInputRef = ref<HTMLInputElement | null>(null)

// Edit event modal
const showEditModal = ref(false)
const editData = ref({ title: '', eventDate: '', emoji: '🎉' })

// Share modal
const showShareModal = ref(false)

// Inline edit item
const editingItemId = ref<string | null>(null)
const editingItemName = ref('')

// Undo/feedback state
const undoAction = ref<{ message: string, undo: () => Promise<void> } | null>(null)
const undoTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const errorMessage = ref('')

const userId = computed(() => (user.value as { id: string } | null)?.id)

function isMyItem(item: ListItem) {
  return item.assignedUserId === userId.value
}

function getEventEmoji() {
  if (event.value?.description && /\p{Emoji}/u.test(event.value.description)) {
    return event.value.description.match(/\p{Emoji}/u)?.[0] || '📋'
  }
  return '📋'
}

function showError(message: string) {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 4000)
}

async function addItem() {
  if (!newItemName.value.trim() || isAddingItem.value) return

  const itemName = newItemName.value.trim()
  newItemName.value = ''

  isAddingItem.value = true
  try {
    await $fetch(`/api/lists/${eventId.value}/items`, {
      method: 'POST',
      body: { name: itemName, quantity: 1, unit: 'pcs' }
    })
    await refresh()
  } catch {
    // Restore the item name if it failed
    newItemName.value = itemName
    showError('Failed to add item')
  } finally {
    isAddingItem.value = false
    // Keep focus on input for quick successive additions
    await nextTick()
    itemInputRef.value?.focus()
  }
}

async function claimItem(item: ListItem) {
  const wasClaimed = item.status === 'ASSIGNED' && isMyItem(item)

  try {
    await $fetch(`/api/lists/${eventId.value}/items/${item.id}/claim`, { method: 'POST' })

    // Show undo toast
    showUndo(
      wasClaimed ? `Unclaimed "${item.name}"` : `Claimed "${item.name}"`,
      async () => {
        await $fetch(`/api/lists/${eventId.value}/items/${item.id}/claim`, { method: 'POST' })
        refresh()
      }
    )

    refresh()
  } catch {
    showError('Failed to update item')
  }
}

async function purchaseItem(item: ListItem) {
  const wasPurchased = item.status === 'PURCHASED'

  try {
    await $fetch(`/api/lists/${eventId.value}/items/${item.id}/purchase`, { method: 'POST' })

    showUndo(
      wasPurchased ? `Unmarked "${item.name}"` : `Marked "${item.name}" as bought`,
      async () => {
        await $fetch(`/api/lists/${eventId.value}/items/${item.id}/purchase`, { method: 'POST' })
        refresh()
      }
    )

    refresh()
  } catch {
    showError('Failed to update item')
  }
}

function startEditingItem(item: ListItem) {
  editingItemId.value = item.id
  editingItemName.value = item.name
}

async function saveItemEdit(item: ListItem) {
  const newName = editingItemName.value.trim()
  if (!newName) {
    // If empty, cancel edit
    editingItemId.value = null
    return
  }

  if (newName === item.name) {
    // No change, just close
    editingItemId.value = null
    return
  }

  try {
    await $fetch(`/api/lists/${eventId.value}/items/${item.id}`, {
      method: 'PUT',
      body: { name: newName }
    })
    editingItemId.value = null
    refresh()
  } catch {
    showError('Failed to update item')
  }
}

function cancelEditItem() {
  editingItemId.value = null
  editingItemName.value = ''
}

async function deleteItem(item: ListItem) {
  try {
    await $fetch(`/api/lists/${eventId.value}/items/${item.id}`, { method: 'DELETE' })

    showUndo(
      `Deleted "${item.name}"`,
      async () => {
        // Re-add the item
        await $fetch(`/api/lists/${eventId.value}/items`, {
          method: 'POST',
          body: { name: item.name, quantity: item.quantity, unit: item.unit }
        })
        refresh()
      }
    )

    refresh()
  } catch {
    showError('Failed to delete item')
  }
}

function showUndo(message: string, undoFn: () => Promise<void>) {
  // Clear previous timeout
  if (undoTimeout.value) clearTimeout(undoTimeout.value)

  undoAction.value = { message, undo: undoFn }

  // Auto-hide after 4 seconds
  undoTimeout.value = setTimeout(() => {
    undoAction.value = null
  }, 4000)
}

async function executeUndo() {
  if (!undoAction.value) return

  const fn = undoAction.value.undo
  undoAction.value = null
  if (undoTimeout.value) clearTimeout(undoTimeout.value)

  await fn()
}

function openEditModal() {
  editData.value = {
    title: event.value?.title || '',
    eventDate: event.value?.eventDate ? new Date(event.value.eventDate).toISOString().split('T')[0] as string : '',
    emoji: getEventEmoji()
  }
  showEditModal.value = true
}

async function saveEdit() {
  try {
    await $fetch(`/api/lists/${eventId.value}`, {
      method: 'PUT',
      body: {
        title: editData.value.title,
        eventDate: editData.value.eventDate || null,
        description: editData.value.emoji
      }
    })
    showEditModal.value = false
    refresh()
  } catch {
    showError('Failed to update event')
  }
}

async function deleteEvent() {
  if (!confirm('Delete this event and all items?')) return

  try {
    await $fetch(`/api/lists/${eventId.value}`, { method: 'DELETE' })
    router.push('/events')
  } catch {
    showError('Failed to delete event')
  }
}

const emojis = ['🎉', '🎂', '🎄', '🍽️', '🥳', '🎃', '🌸', '🍕', '☀️', '🏠']
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <!-- Loading -->
    <div
      v-if="pending"
      class="flex justify-center py-16"
    >
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="event">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-3">
          <button
            class="w-10 h-10 -ml-2 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="router.push('/events')"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="w-5 h-5"
            />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">{{ getEventEmoji() }}</span>
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ event.title }}
              </h1>
            </div>
            <p
              v-if="event.eventDate"
              class="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
            >
              {{ new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button
            class="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            @click="showShareModal = true"
          >
            <UIcon
              name="i-lucide-share"
              class="w-5 h-5"
            />
          </button>
          <button
            class="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            @click="openEditModal"
          >
            <UIcon
              name="i-lucide-settings"
              class="w-5 h-5"
            />
          </button>
        </div>
      </div>

      <!-- Progress bar -->
      <div
        v-if="items.length > 0"
        class="mb-6"
      >
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-gray-500 dark:text-gray-400">
            {{ purchasedItems.length }} of {{ items.length }} bought
          </span>
          <span class="font-medium text-gray-900 dark:text-white">
            {{ Math.round((purchasedItems.length / items.length) * 100) }}%
          </span>
        </div>
        <div class="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-500 rounded-full transition-all duration-500"
            :style="{ width: `${(purchasedItems.length / items.length) * 100}%` }"
          />
        </div>
      </div>

      <!-- Add item input -->
      <form
        class="mb-6"
        @submit.prevent="addItem"
      >
        <div class="relative">
          <input
            ref="itemInputRef"
            v-model="newItemName"
            type="text"
            placeholder="Add an item..."
            enterkeyhint="done"
            autocomplete="off"
            class="w-full h-12 pl-4 pr-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            :disabled="isAddingItem"
          >
          <button
            type="submit"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-primary-500 hover:text-primary-600 disabled:opacity-50 transition-colors"
            :disabled="!newItemName.trim() || isAddingItem"
          >
            <UIcon
              name="i-lucide-plus"
              class="w-5 h-5"
            />
          </button>
        </div>
      </form>

      <!-- Items list -->
      <div class="space-y-6">
        <!-- Unclaimed items -->
        <div v-if="unclaimedItems.length > 0">
          <h2 class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Unclaimed · {{ unclaimedItems.length }}
          </h2>
          <div class="space-y-2">
            <div
              v-for="item in unclaimedItems"
              :key="item.id"
              class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
            >
              <button
                class="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-primary-500 transition-colors"
                @click="purchaseItem(item)"
              />
              <!-- Inline edit mode -->
              <form
                v-if="editingItemId === item.id"
                class="flex-1 min-w-0"
                @submit.prevent="saveItemEdit(item)"
              >
                <input
                  v-model="editingItemName"
                  type="text"
                  class="w-full h-8 px-2 -mx-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autofocus
                  @blur="saveItemEdit(item)"
                  @keydown.escape="cancelEditItem"
                >
              </form>
              <!-- Display mode -->
              <button
                v-else
                class="flex-1 min-w-0 text-left"
                @click="startEditingItem(item)"
              >
                <span class="text-gray-900 dark:text-white">{{ item.name }}</span>
              </button>
              <button
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                @click="deleteItem(item)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="w-4 h-4"
                />
              </button>
              <button
                class="h-8 px-3 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                @click="claimItem(item)"
              >
                Claim
              </button>
            </div>
          </div>
        </div>

        <!-- Claimed items -->
        <div v-if="claimedItems.length > 0">
          <h2 class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Claimed · {{ claimedItems.length }}
          </h2>
          <div class="space-y-2">
            <div
              v-for="item in claimedItems"
              :key="item.id"
              class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
              :class="isMyItem(item) ? 'border-l-4 border-l-primary-500' : ''"
            >
              <button
                class="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-primary-500 transition-colors"
                @click="purchaseItem(item)"
              />
              <!-- Inline edit mode -->
              <form
                v-if="editingItemId === item.id"
                class="flex-1 min-w-0"
                @submit.prevent="saveItemEdit(item)"
              >
                <input
                  v-model="editingItemName"
                  type="text"
                  class="w-full h-8 px-2 -mx-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autofocus
                  @blur="saveItemEdit(item)"
                  @keydown.escape="cancelEditItem"
                >
              </form>
              <!-- Display mode -->
              <button
                v-else
                class="flex-1 min-w-0 text-left"
                @click="startEditingItem(item)"
              >
                <span class="text-gray-900 dark:text-white">{{ item.name }}</span>
                <div class="flex items-center gap-1.5 mt-1">
                  <img
                    v-if="item.assignedUser?.image"
                    :src="item.assignedUser.image"
                    :alt="item.assignedUser.name"
                    class="w-4 h-4 rounded-full"
                  >
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ isMyItem(item) ? 'You' : item.assignedUser?.name }}
                  </span>
                </div>
              </button>
              <button
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                @click="deleteItem(item)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="w-4 h-4"
                />
              </button>
              <button
                v-if="isMyItem(item)"
                class="h-8 px-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                @click="purchaseItem(item)"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        <!-- Purchased items -->
        <div v-if="purchasedItems.length > 0">
          <h2 class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Bought · {{ purchasedItems.length }}
          </h2>
          <div class="space-y-2">
            <div
              v-for="item in purchasedItems"
              :key="item.id"
              class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 opacity-60"
            >
              <button
                class="w-6 h-6 rounded-full bg-primary-500 flex-shrink-0 flex items-center justify-center"
                @click="purchaseItem(item)"
              >
                <UIcon
                  name="i-lucide-check"
                  class="w-4 h-4 text-white"
                />
              </button>
              <!-- Inline edit mode -->
              <form
                v-if="editingItemId === item.id"
                class="flex-1 min-w-0"
                @submit.prevent="saveItemEdit(item)"
              >
                <input
                  v-model="editingItemName"
                  type="text"
                  class="w-full h-8 px-2 -mx-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autofocus
                  @blur="saveItemEdit(item)"
                  @keydown.escape="cancelEditItem"
                >
              </form>
              <!-- Display mode -->
              <button
                v-else
                class="flex-1 min-w-0 text-left"
                @click="startEditingItem(item)"
              >
                <span class="text-gray-900 dark:text-white line-through">{{ item.name }}</span>
                <div
                  v-if="item.assignedUser"
                  class="flex items-center gap-1.5 mt-1"
                >
                  <img
                    v-if="item.assignedUser?.image"
                    :src="item.assignedUser.image"
                    :alt="item.assignedUser.name"
                    class="w-4 h-4 rounded-full"
                  >
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ item.assignedUser?.name }}
                  </span>
                </div>
              </button>
              <button
                class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                @click="deleteItem(item)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="items.length === 0"
          class="text-center py-12"
        >
          <div class="text-4xl mb-3">
            🛒
          </div>
          <p class="text-gray-500 dark:text-gray-400">
            Add items to your shopping list
          </p>
        </div>
      </div>
    </template>

    <!-- Undo/Error snackbar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="undoAction"
        class="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg"
      >
        <span class="text-sm">{{ undoAction.message }}</span>
        <button
          class="text-sm font-medium text-primary-400 dark:text-primary-600 hover:text-primary-300 dark:hover:text-primary-700 transition-colors"
          @click="executeUndo"
        >
          Undo
        </button>
      </div>
    </Transition>

    <!-- Error snackbar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="errorMessage && !undoAction"
        class="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-red-600 text-white rounded-xl px-4 py-3 shadow-lg"
      >
        <span class="text-sm">{{ errorMessage }}</span>
      </div>
    </Transition>

    <!-- Edit event modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Edit Event
          </h2>

          <form
            class="space-y-5"
            @submit.prevent="saveEdit"
          >
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event name
              </label>
              <input
                v-model="editData.title"
                type="text"
                class="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emoji
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="emoji in emojis"
                  :key="emoji"
                  type="button"
                  class="w-12 h-12 text-2xl rounded-xl border-2 transition-all"
                  :class="editData.emoji === emoji
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-100 dark:border-gray-800'"
                  @click="editData.emoji = emoji"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                v-model="editData.eventDate"
                type="date"
                class="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              >
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 h-12 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                @click="showEditModal = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 h-12 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
              >
                Save
              </button>
            </div>

            <button
              type="button"
              class="w-full h-12 text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              @click="deleteEvent"
            >
              Delete Event
            </button>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Share modal -->
    <UModal v-model:open="showShareModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Share Event
          </h2>
          <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Invite others to collaborate on this shopping list
          </p>

          <div class="space-y-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-center text-sm text-gray-500 dark:text-gray-400">
              Sharing feature coming soon
            </div>

            <button
              class="w-full h-12 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              @click="showShareModal = false"
            >
              Close
            </button>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>
