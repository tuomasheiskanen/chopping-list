import prisma from '../../../../utils/db'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const listId = getRouterParam(event, 'id')

  if (!listId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'List ID is required'
    })
  }

  // Verify list exists
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId }
  })

  if (!list) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Shopping list not found'
    })
  }

  const items = await prisma.listItem.findMany({
    where: { listId },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { category: 'asc' },
      { createdAt: 'asc' }
    ]
  })

  return { items }
})
