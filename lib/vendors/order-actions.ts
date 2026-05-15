'use server'

import { requireVendor } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { purchaseOrders } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const VALID_TRANSITIONS: Record<string, string[]> = {
  sent: ['acknowledged', 'partially_received'],
  acknowledged: ['partially_received', 'received'],
  partially_received: ['received'],
}

const UpdateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.string().max(50),
})

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const input = UpdateOrderStatusSchema.safeParse({ orderId, newStatus })
  if (!input.success) return { success: false, error: 'Invalid input' }
  const user = await requireVendor()

  const [order] = await db
    .select({ id: purchaseOrders.id, status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.vendorId, user.vendorId)))
    .limit(1)

  if (!order) {
    return { success: false, error: 'Order not found' }
  }

  const allowed = VALID_TRANSITIONS[order.status]
  if (!allowed || !allowed.includes(newStatus)) {
    return { success: false, error: `Cannot transition from ${order.status} to ${newStatus}` }
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  }

  if (newStatus === 'received') {
    updates.receivedAt = new Date().toISOString()
  }

  await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, orderId))

  return { success: true }
}
