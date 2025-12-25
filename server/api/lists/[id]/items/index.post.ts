import prisma from '../../../../utils/db'
import { requireAuth } from '../../../../utils/auth'

interface CreateItemBody {
  name: string
  quantity?: number
  unit?: string
  category?: string
  notes?: string
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const listId = getRouterParam(event, 'id')
  const body = await readBody<CreateItemBody>(event)

  if (!listId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'List ID is required'
    })
  }

  // Validate required fields
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Item name is required'
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

  // Create the item
  const item = await prisma.listItem.create({
    data: {
      listId,
      name: body.name.trim(),
      quantity: body.quantity ?? 1,
      unit: body.unit?.trim() || 'pcs',
      category: body.category?.trim() || null,
      notes: body.notes?.trim() || null
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

  return { item }
})
