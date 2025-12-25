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

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      items: {
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!list) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Shopping list not found'
    })
  }

  return {
    list: {
      ...list,
      isOwner: list.creatorId === user.id
    }
  }
})
