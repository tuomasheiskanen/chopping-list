// Application types for Family Shopping List

export type ItemStatus = 'PENDING' | 'ASSIGNED' | 'PURCHASED'

export type EventType = 'birthday' | 'dinner' | 'christmas' | 'custom'

export interface User {
  id: string
  googleId: string
  email: string
  name: string
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ShoppingList {
  id: string
  title: string
  description?: string | null
  eventType?: EventType | null
  eventDate?: Date | null
  createdAt: Date
  updatedAt: Date
  creatorId: string
  creator?: User
  items?: ListItem[]
}

export interface ListItem {
  id: string
  name: string
  quantity: number
  unit: string
  category?: string | null
  status: ItemStatus
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  listId: string
  assignedUserId?: string | null
  assignedUser?: User | null
}

export interface EventTemplate {
  id: string
  name: string
  eventType: EventType
  description?: string | null
  items: string // JSON array
  createdAt: Date
}

export interface TemplateItem {
  name: string
  quantity: number
  unit: string
  category?: string
}

// API request/response types
export interface CreateListInput {
  title: string
  description?: string
  eventType?: EventType
  eventDate?: string
}

export interface UpdateListInput {
  title?: string
  description?: string
  eventType?: EventType
  eventDate?: string
}

export interface CreateItemInput {
  name: string
  quantity?: number
  unit?: string
  category?: string
  notes?: string
}

export interface UpdateItemInput {
  name?: string
  quantity?: number
  unit?: string
  category?: string
  status?: ItemStatus
  notes?: string
  assignedUserId?: string | null
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
}
