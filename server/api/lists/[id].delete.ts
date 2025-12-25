import prisma from '../../utils/db'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const listId = getRouterParam(event, 'id')

  if (!listId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'List ID is required'
    })
  }

  // Check if list exists and user is the owner
  const existingList = await prisma.shoppingList.findUnique({
    where: { id: listId }
  })

  if (!existingList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Shopping list not found'
    })
  }

  if (existingList.creatorId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You can only delete your own lists'
    })
  }

  // Delete the list (items will be cascade deleted due to schema)
  await prisma.shoppingList.delete({
    where: { id: listId }
  })

  return { success: true }
})
