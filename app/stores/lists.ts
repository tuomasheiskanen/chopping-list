import { defineStore } from 'pinia'
import type { ShoppingList, ListItem } from '~/types'

interface ListWithCounts {
  id: string
  title: string
  description?: string | null
  eventType?: string | null
  eventDate?: Date | null
  createdAt: Date
  updatedAt: Date
  creator: {
    id: string
    name: string
    image?: string | null
  }
  isOwner: boolean
  itemCounts: {
    total: number
    pending: number
    assigned: number
    purchased: number
    myItems: number
  }
}

interface ListDetail extends ShoppingList {
  isOwner: boolean
  items: ListItem[]
}

interface ListsState {
  lists: ListWithCounts[]
  currentList: ListDetail | null
  isLoading: boolean
  error: string | null
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export const useListsStore = defineStore('lists', {
  state: (): ListsState => ({
    lists: [],
    currentList: null,
    isLoading: false,
    error: null
  }),

  getters: {
    myLists: state => state.lists.filter(l => l.isOwner),
    sharedLists: state => state.lists.filter(l => !l.isOwner),
    pendingItems: state => state.currentList?.items.filter(i => i.status === 'PENDING') ?? [],
    assignedItems: state => state.currentList?.items.filter(i => i.status === 'ASSIGNED') ?? [],
    purchasedItems: state => state.currentList?.items.filter(i => i.status === 'PURCHASED') ?? []
  },

  actions: {
    async fetchLists() {
      this.isLoading = true
      this.error = null

      try {
        const { lists } = await $fetch<{ lists: ListWithCounts[] }>('/api/lists')
        this.lists = lists
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to fetch lists'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchList(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const { list } = await $fetch<{ list: ListDetail }>(`/api/lists/${id}`)
        this.currentList = list
        return list
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to fetch list'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createList(data: { title: string, description?: string, eventType?: string, eventDate?: string }) {
      try {
        const { list } = await $fetch<{ list: ShoppingList }>('/api/lists', {
          method: 'POST',
          body: data
        })
        // Refresh lists
        await this.fetchLists()
        return list
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to create list'
        throw err
      }
    },

    async updateList(id: string, data: { title?: string, description?: string, eventType?: string, eventDate?: string | null }) {
      try {
        const { list } = await $fetch<{ list: ShoppingList }>(`/api/lists/${id}`, {
          method: 'PUT',
          body: data
        })
        // Update current list if it matches
        if (this.currentList?.id === id) {
          this.currentList = { ...this.currentList, ...list }
        }
        // Refresh lists
        await this.fetchLists()
        return list
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to update list'
        throw err
      }
    },

    async deleteList(id: string) {
      try {
        await $fetch(`/api/lists/${id}`, { method: 'DELETE' })
        // Remove from local state
        this.lists = this.lists.filter(l => l.id !== id)
        if (this.currentList?.id === id) {
          this.currentList = null
        }
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to delete list'
        throw err
      }
    },

    async addItem(listId: string, data: { name: string, quantity?: number, unit?: string, category?: string, notes?: string }) {
      try {
        const { item } = await $fetch<{ item: ListItem }>(`/api/lists/${listId}/items`, {
          method: 'POST',
          body: data
        })
        // Add to current list if it matches
        if (this.currentList?.id === listId) {
          this.currentList.items.push(item)
        }
        return item
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to add item'
        throw err
      }
    },

    async updateItem(listId: string, itemId: string, data: Partial<ListItem>) {
      try {
        const { item } = await $fetch<{ item: ListItem }>(`/api/lists/${listId}/items/${itemId}`, {
          method: 'PUT',
          body: data
        })
        // Update in current list if it matches
        if (this.currentList?.id === listId) {
          const index = this.currentList.items.findIndex(i => i.id === itemId)
          if (index !== -1) {
            this.currentList.items[index] = item
          }
        }
        return item
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to update item'
        throw err
      }
    },

    async deleteItem(listId: string, itemId: string) {
      try {
        await $fetch(`/api/lists/${listId}/items/${itemId}`, { method: 'DELETE' })
        // Remove from current list if it matches
        if (this.currentList?.id === listId) {
          this.currentList.items = this.currentList.items.filter(i => i.id !== itemId)
        }
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to delete item'
        throw err
      }
    },

    async claimItem(listId: string, itemId: string) {
      try {
        const { item, claimed } = await $fetch<{ item: ListItem, claimed: boolean }>(
          `/api/lists/${listId}/items/${itemId}/claim`,
          { method: 'POST' }
        )
        // Update in current list if it matches
        if (this.currentList?.id === listId) {
          const index = this.currentList.items.findIndex(i => i.id === itemId)
          if (index !== -1) {
            this.currentList.items[index] = item
          }
        }
        return { item, claimed }
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to claim item'
        throw err
      }
    },

    async purchaseItem(listId: string, itemId: string) {
      try {
        const { item, purchased } = await $fetch<{ item: ListItem, purchased: boolean }>(
          `/api/lists/${listId}/items/${itemId}/purchase`,
          { method: 'POST' }
        )
        // Update in current list if it matches
        if (this.currentList?.id === listId) {
          const index = this.currentList.items.findIndex(i => i.id === itemId)
          if (index !== -1) {
            this.currentList.items[index] = item
          }
        }
        return { item, purchased }
      } catch (err) {
        this.error = getErrorMessage(err) || 'Failed to purchase item'
        throw err
      }
    },

    clearCurrentList() {
      this.currentList = null
    }
  }
})
