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

  // Toggle purchased status
  const isPurchased = existingItem.status === 'PURCHASED'

  // Determine new status when unmarking as purchased
  let newStatus: 'PENDING' | 'ASSIGNED' | 'PURCHASED'
  if (isPurchased) {
    // When unmarking, go back to ASSIGNED if has assignee, otherwise PENDING
    newStatus = existingItem.assignedUserId ? 'ASSIGNED' : 'PENDING'
  } else {
    newStatus = 'PURCHASED'
  }

  const item = await prisma.listItem.update({
    where: { id: itemId },
    data: {
      status: newStatus,
      // If marking as purchased and not assigned, assign to current user
      assignedUserId: !isPurchased && !existingItem.assignedUserId
        ? user.id
        : existingItem.assignedUserId
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
    purchased: !isPurchased
  }
})
