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
  createdAt?: string | Date
  updatedAt?: string | Date
  category?: string | null
  notes?: string | null
  listId?: string
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

// Loading states per item
const loadingItems = ref<Set<string>>(new Set())
const itemErrors = ref<Map<string, string>>(new Map())

// Global error for add item
const addItemError = ref('')

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

function setItemLoading(itemId: string, loading: boolean) {
  if (loading) {
    loadingItems.value.add(itemId)
  } else {
    loadingItems.value.delete(itemId)
  }
}

function setItemError(itemId: string, error: string | null) {
  if (error) {
    itemErrors.value.set(itemId, error)
    setTimeout(() => {
      itemErrors.value.delete(itemId)
    }, 4000)
  } else {
    itemErrors.value.delete(itemId)
  }
}

function isLoading(itemId: string) {
  return loadingItems.value.has(itemId)
}

function getItemError(itemId: string) {
  return itemErrors.value.get(itemId) || null
}

async function addItem() {
  if (!newItemName.value.trim() || isAddingItem.value) return

  const itemName = newItemName.value.trim()
  newItemName.value = ''
  addItemError.value = ''

  isAddingItem.value = true
  try {
    const response = await $fetch<{ item: ListItem }>(`/api/lists/${eventId.value}/items`, {
      method: 'POST',
      body: { name: itemName, quantity: 1, unit: 'pcs' }
    })
    // Add to local state instead of refreshing
    if (listData.value?.list) {
      listData.value = {
        ...listData.value,
        list: {
          ...listData.value.list,
          items: [response.item as any, ...listData.value.list.items]
        }
      }
    }
  } catch (err) {
    // Restore the item name if it failed
    newItemName.value = itemName
    addItemError.value = 'Failed to add item. Please try again.'
  } finally {
    isAddingItem.value = false
    // Keep focus on input for quick successive additions
    await nextTick()
    itemInputRef.value?.focus()
  }
}

async function claimItem(item: ListItem) {
  if (isLoading(item.id)) return

  setItemLoading(item.id, true)
  setItemError(item.id, null)

  try {
    const response = await $fetch<{ item: ListItem }>(`/api/lists/${eventId.value}/items/${item.id}/claim`, { method: 'POST' })
    // Update local state instead of refreshing
    if (listData.value?.list) {
      const index = listData.value.list.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        // Create new array and new list object to trigger reactivity
        const updatedItems = [...listData.value.list.items]
        updatedItems[index] = response.item as any
        listData.value = {
          ...listData.value,
          list: {
            ...listData.value.list,
            items: updatedItems
          }
        }
      }
    }
  } catch {
    setItemError(item.id, 'Failed to update item')
  } finally {
    setItemLoading(item.id, false)
  }
}

async function purchaseItem(item: ListItem) {
  if (isLoading(item.id)) return

  setItemLoading(item.id, true)
  setItemError(item.id, null)

  try {
    const response = await $fetch<{ item: ListItem }>(`/api/lists/${eventId.value}/items/${item.id}/purchase`, { method: 'POST' })
    // Update local state instead of refreshing
    if (listData.value?.list) {
      const index = listData.value.list.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        // Create new array and new list object to trigger reactivity
        const updatedItems = [...listData.value.list.items]
        updatedItems[index] = response.item as any
        listData.value = {
          ...listData.value,
          list: {
            ...listData.value.list,
            items: updatedItems
          }
        }
      }
    }
  } catch {
    setItemError(item.id, 'Failed to update item')
  } finally {
    setItemLoading(item.id, false)
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

  setItemLoading(item.id, true)
  setItemError(item.id, null)

  try {
    const response = await $fetch<{ item: ListItem }>(`/api/lists/${eventId.value}/items/${item.id}`, {
      method: 'PUT',
      body: { name: newName }
    })
    // Update local state instead of refreshing
    if (listData.value?.list) {
      const index = listData.value.list.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        // Create new array and new list object to trigger reactivity
        const updatedItems = [...listData.value.list.items]
        updatedItems[index] = response.item as any
        listData.value = {
          ...listData.value,
          list: {
            ...listData.value.list,
            items: updatedItems
          }
        }
      }
    }
    editingItemId.value = null
  } catch {
    setItemError(item.id, 'Failed to update item')
  } finally {
    setItemLoading(item.id, false)
  }
}

function cancelEditItem() {
  editingItemId.value = null
  editingItemName.value = ''
}

async function deleteItem(item: ListItem) {
  if (isLoading(item.id)) return

  setItemLoading(item.id, true)
  setItemError(item.id, null)

  try {
    await $fetch(`/api/lists/${eventId.value}/items/${item.id}`, { method: 'DELETE' })
    // Remove from local state instead of refreshing
    if (listData.value?.list) {
      // Create new array and new list object to trigger reactivity
      listData.value = {
        ...listData.value,
        list: {
          ...listData.value.list,
          items: listData.value.list.items.filter(i => i.id !== item.id)
        }
      }
    }
  } catch {
    setItemError(item.id, 'Failed to delete item')
  } finally {
    setItemLoading(item.id, false)
  }
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
    await refresh()
  } catch (err) {
    console.error('Failed to update event:', err)
    alert('Failed to update event. Please try again.')
  }
}

async function deleteEvent() {
  if (!confirm('Delete this event and all items?')) return

  try {
    await $fetch(`/api/lists/${eventId.value}`, { method: 'DELETE' })
    router.push('/events')
  } catch (err) {
    console.error('Failed to delete event:', err)
    alert('Failed to delete event. Please try again.')
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
              v-if="!isAddingItem"
              name="i-lucide-plus"
              class="w-5 h-5"
            />
            <div
              v-else
              class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
            />
          </button>
        </div>
        <p
          v-if="addItemError"
          class="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ addItemError }}
        </p>
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
              class="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
            >
              <div class="flex items-center gap-3">
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
                  :disabled="isLoading(item.id)"
                  @click="startEditingItem(item)"
                >
                  <span class="text-gray-900 dark:text-white">{{ item.name }}</span>
                </button>
                <button
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  :disabled="isLoading(item.id)"
                  @click="deleteItem(item)"
                >
                  <UIcon
                    v-if="!isLoading(item.id)"
                    name="i-lucide-trash-2"
                    class="w-4 h-4"
                  />
                  <div
                    v-else
                    class="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
                  />
                </button>
                <button
                  class="h-8 px-3 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
                  :disabled="isLoading(item.id)"
                  @click="claimItem(item)"
                >
                  <span v-if="!isLoading(item.id)">Claim</span>
                  <div
                    v-else
                    class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"
                  />
                </button>
              </div>
              <p
                v-if="getItemError(item.id)"
                class="mt-2 text-xs text-red-600 dark:text-red-400"
              >
                {{ getItemError(item.id) }}
              </p>
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
              class="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
              :class="isMyItem(item) ? 'border-l-4 border-l-primary-500' : ''"
            >
              <div class="flex items-center gap-3">
                <!-- Avatar showing who claimed it -->
                <button
                  class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-primary-200 dark:hover:ring-primary-800 transition-all disabled:opacity-50"
                  :disabled="isLoading(item.id)"
                  @click="purchaseItem(item)"
                >
                  <div
                    v-if="isLoading(item.id)"
                    class="w-full h-full border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex items-center justify-center"
                  />
                  <img
                    v-else-if="item.assignedUser?.image"
                    :src="item.assignedUser.image"
                    :alt="item.assignedUser.name"
                    class="w-full h-full object-cover"
                  >
                  <div
                    v-else
                    class="w-full h-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium"
                  >
                    {{ (item.assignedUser?.name || 'U').charAt(0).toUpperCase() }}
                  </div>
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
                  :disabled="isLoading(item.id)"
                  @click="startEditingItem(item)"
                >
                  <span class="text-gray-900 dark:text-white">{{ item.name }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {{ isMyItem(item) ? '(You)' : `(${item.assignedUser?.name})` }}
                  </span>
                </button>
                <button
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  :disabled="isLoading(item.id)"
                  @click="deleteItem(item)"
                >
                  <UIcon
                    v-if="!isLoading(item.id)"
                    name="i-lucide-trash-2"
                    class="w-4 h-4"
                  />
                  <div
                    v-else
                    class="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
                  />
                </button>
                <div
                  v-if="isMyItem(item)"
                  class="flex items-center gap-2"
                >
                  <button
                    class="h-8 px-3 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    :disabled="isLoading(item.id)"
                    @click="claimItem(item)"
                  >
                    <span v-if="!isLoading(item.id)">Unclaim</span>
                    <div
                      v-else
                      class="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"
                    />
                  </button>
                  <button
                    class="h-8 px-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
                    :disabled="isLoading(item.id)"
                    @click="purchaseItem(item)"
                  >
                    <span v-if="!isLoading(item.id)">Done</span>
                    <div
                      v-else
                      class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    />
                  </button>
                </div>
              </div>
              <p
                v-if="getItemError(item.id)"
                class="mt-2 text-xs text-red-600 dark:text-red-400"
              >
                {{ getItemError(item.id) }}
              </p>
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
              class="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 opacity-60"
            >
              <div class="flex items-center gap-3">
                <!-- Avatar with checkmark overlay -->
                <button
                  class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-primary-500 disabled:opacity-50 relative"
                  :disabled="isLoading(item.id)"
                  @click="purchaseItem(item)"
                >
                  <div
                    v-if="isLoading(item.id)"
                    class="w-full h-full border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex items-center justify-center"
                  />
                  <template v-else>
                    <img
                      v-if="item.assignedUser?.image"
                      :src="item.assignedUser.image"
                      :alt="item.assignedUser.name"
                      class="w-full h-full object-cover"
                    >
                    <div
                      v-else
                      class="w-full h-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium"
                    >
                      {{ (item.assignedUser?.name || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <!-- Checkmark overlay -->
                    <div class="absolute inset-0 bg-primary-500/80 flex items-center justify-center">
                      <UIcon
                        name="i-lucide-check"
                        class="w-5 h-5 text-white"
                      />
                    </div>
                  </template>
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
                  :disabled="isLoading(item.id)"
                  @click="startEditingItem(item)"
                >
                  <span class="text-gray-900 dark:text-white line-through">{{ item.name }}</span>
                  <span
                    v-if="item.assignedUser"
                    class="text-xs text-gray-500 dark:text-gray-400 ml-2"
                  >
                    ({{ item.assignedUser.name }})
                  </span>
                </button>
                <button
                  class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  :disabled="isLoading(item.id)"
                  @click="deleteItem(item)"
                >
                  <UIcon
                    v-if="!isLoading(item.id)"
                    name="i-lucide-trash-2"
                    class="w-4 h-4"
                  />
                  <div
                    v-else
                    class="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
                  />
                </button>
              </div>
              <p
                v-if="getItemError(item.id)"
                class="mt-2 text-xs text-red-600 dark:text-red-400"
              >
                {{ getItemError(item.id) }}
              </p>
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
