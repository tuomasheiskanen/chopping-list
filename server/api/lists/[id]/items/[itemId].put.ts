import prisma from '../../../../utils/db'
import { requireAuth } from '../../../../utils/auth'
import type { ItemStatus } from '@prisma/client'

interface UpdateItemBody {
  name?: string
  quantity?: number
  unit?: string
  category?: string
  status?: ItemStatus
  notes?: string
  assignedUserId?: string | null
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readBody<UpdateItemBody>(event)

  if (!listId || !itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'List ID and Item ID are required'
    })
  }

  // Verify item exists and belongs to the list
  const existingItem = await prisma.listItem.findFirst({
    where: {
      id: itemId,
      listId
    }
  })

  if (!existingItem) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Item not found in this list'
    })
  }

  // Build update data
  const updateData: {
    name?: string
    quantity?: number
    unit?: string
    category?: string | null
    status?: ItemStatus
    notes?: string | null
    assignedUserId?: string | null
  } = {}

  if (body.name !== undefined) {
    if (body.name.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Item name cannot be empty'
      })
    }
    updateData.name = body.name.trim()
  }

  if (body.quantity !== undefined) {
    updateData.quantity = body.quantity
  }

  if (body.unit !== undefined) {
    updateData.unit = body.unit.trim() || 'pcs'
  }

  if (body.category !== undefined) {
    updateData.category = body.category?.trim() || null
  }

  if (body.status !== undefined) {
    updateData.status = body.status
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes?.trim() || null
  }

  if (body.assignedUserId !== undefined) {
    // When assigning to someone, also update status
    updateData.assignedUserId = body.assignedUserId

    if (body.assignedUserId) {
      // Verify the user exists
      const assignee = await prisma.user.findUnique({
        where: { id: body.assignedUserId }
      })

      if (!assignee) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Invalid user to assign'
        })
      }

      // Auto-update status to ASSIGNED if currently PENDING
      if (existingItem.status === 'PENDING' && body.status === undefined) {
        updateData.status = 'ASSIGNED'
      }
    } else {
      // Unassigning - reset to PENDING if ASSIGNED
      if (existingItem.status === 'ASSIGNED' && body.status === undefined) {
        updateData.status = 'PENDING'
      }
    }
  }

  // Update the item
  const item = await prisma.listItem.update({
    where: { id: itemId },
    data: updateData,
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    }
  })

  return { item }
})
