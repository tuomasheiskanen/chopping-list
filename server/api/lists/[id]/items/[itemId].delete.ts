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

  // Only list owner can delete items
  if (existingItem.list.creatorId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only the list owner can delete items'
    })
  }

  // Delete the item
  await prisma.listItem.delete({
    where: { id: itemId }
  })

  return { success: true }
})
