import prisma from '../../utils/db'
import { requireAuth } from '../../utils/auth'

interface CreateListBody {
  title: string
  description?: string
  eventType?: string
  eventDate?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateListBody>(event)

  // Validate required fields
  if (!body.title || body.title.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Title is required'
    })
  }

  // Create the shopping list
  const list = await prisma.shoppingList.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      eventType: body.eventType || null,
      eventDate: body.eventDate ? new Date(body.eventDate) : null,
      creatorId: user.id
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    }
  })

  return { list }
})
