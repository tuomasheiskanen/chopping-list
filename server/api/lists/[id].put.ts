import prisma from '../../utils/db'
import { requireAuth } from '../../utils/auth'

interface UpdateListBody {
  title?: string
  description?: string
  eventType?: string
  eventDate?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const listId = getRouterParam(event, 'id')
  const body = await readBody<UpdateListBody>(event)

  if (!listId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'List ID is required'
    })
  }

  // Check if list exists
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

  // Everyone can update events (for family collaboration)

  // Build update data
  const updateData: {
    title?: string
    description?: string | null
    eventType?: string | null
    eventDate?: Date | null
  } = {}

  if (body.title !== undefined) {
    if (body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Title cannot be empty'
      })
    }
    updateData.title = body.title.trim()
  }

  if (body.description !== undefined) {
    updateData.description = body.description?.trim() || null
  }

  if (body.eventType !== undefined) {
    updateData.eventType = body.eventType || null
  }

  if (body.eventDate !== undefined) {
    updateData.eventDate = body.eventDate ? new Date(body.eventDate) : null
  }

  // Update the list
  const list = await prisma.shoppingList.update({
    where: { id: listId },
    data: updateData,
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
