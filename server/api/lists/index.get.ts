import prisma from '../../utils/db'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all lists where the user is the creator or has assigned items
  const lists = await prisma.shoppingList.findMany({
    where: {
      OR: [
        { creatorId: user.id },
        { items: { some: { assignedUserId: user.id } } }
      ]
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      items: {
        select: {
          id: true,
          status: true,
          assignedUserId: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })

  // Transform to include item counts
  const listsWithCounts = lists.map(list => ({
    id: list.id,
    title: list.title,
    description: list.description,
    eventType: list.eventType,
    eventDate: list.eventDate,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    creator: list.creator,
    isOwner: list.creatorId === user.id,
    itemCounts: {
      total: list.items.length,
      pending: list.items.filter(i => i.status === 'PENDING').length,
      assigned: list.items.filter(i => i.status === 'ASSIGNED').length,
      purchased: list.items.filter(i => i.status === 'PURCHASED').length,
      myItems: list.items.filter(i => i.assignedUserId === user.id).length
    }
  }))

  return { lists: listsWithCounts }
})
