import prisma from '../../../../utils/db'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

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
    },
    include: {
      list: true
    }
  })

  if (!existingItem) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Item not found in this list'
    })
  }

  // List owner can delete any item
  // Item claimer can delete their claimed item
  // Anyone can delete unclaimed items (for family collaboration)
  const isListOwner = existingItem.list.creatorId === user.id
  const isItemClaimer = existingItem.assignedUserId === user.id
  const isUnclaimed = !existingItem.assignedUserId

  if (!isListOwner && !isItemClaimer && !isUnclaimed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only the list owner or the person who claimed this item can delete it'
    })
  }

  // Delete the item
  await prisma.listItem.delete({
    where: { id: itemId }
  })

  return { success: true }
})
