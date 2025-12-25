import prisma from '../../../../../utils/db'
import { requireAuth } from '../../../../../utils/auth'

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
    }
  })

  if (!existingItem) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Item not found in this list'
    })
  }

  // Check if item is already purchased
  if (existingItem.status === 'PURCHASED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Cannot claim an item that has already been purchased'
    })
  }

  // Toggle claim: if currently assigned to me, unclaim. Otherwise, claim.
  const isMyItem = existingItem.assignedUserId === user.id

  const item = await prisma.listItem.update({
    where: { id: itemId },
    data: {
      assignedUserId: isMyItem ? null : user.id,
      status: isMyItem ? 'PENDING' : 'ASSIGNED'
    },
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

  return {
    item,
    claimed: !isMyItem
  }
})
