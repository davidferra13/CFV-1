import {
  calculateDirectOrderCartTotals,
  getDirectOrderCheckoutBlockers,
  type DirectOrderCart,
} from './cart-contracts'

export type DirectOrderStatus =
  | 'draft'
  | 'checkout_pending'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'cancelled'
  | 'refunded'

export interface DirectOrderReservation {
  productProjectionId: string
  quantity: number
  status: 'reserved' | 'finalized' | 'released'
  expiresAt: string
}

export interface DirectOrderCheckoutPlan {
  cartId: string
  canCheckout: boolean
  blockers: string[]
  amountCents: number
  stripeMetadata: Record<string, string>
  reservations: DirectOrderReservation[]
}

export interface DirectOrderRecord {
  id: string
  cartId: string
  chefTenantId: string
  status: DirectOrderStatus
  amountCents: number
  stripeCheckoutSessionId: string
  stripePaymentIntentId?: string | null
  cartVersion: number
  publicToken: string
  milestones: ReturnType<typeof getDirectOrderMilestones>
  createdAt: string
}

export function buildDirectOrderCheckoutPlan(
  cart: DirectOrderCart,
  now: Date = new Date()
): DirectOrderCheckoutPlan {
  const totals = calculateDirectOrderCartTotals(cart)
  const blockers = getDirectOrderCheckoutBlockers(cart)
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  return {
    cartId: cart.id,
    canCheckout: blockers.length === 0,
    blockers,
    amountCents: totals.totalCents,
    stripeMetadata: {
      flow: 'direct_order',
      cart_id: cart.id,
      chef_tenant_id: cart.chefTenantId,
      cart_scope: cart.context.scope,
      cart_version: String(cart.version),
    },
    reservations: cart.items
      .filter((item) => !item.savedForLater)
      .map((item) => ({
        productProjectionId: item.productProjectionId,
        quantity: item.quantity,
        status: 'reserved',
        expiresAt,
      })),
  }
}

export function getDirectOrderMilestones(status: DirectOrderStatus) {
  const order: DirectOrderStatus[] = [
    'draft',
    'checkout_pending',
    'paid',
    'accepted',
    'preparing',
    'ready',
    'picked_up',
  ]
  const current = order.indexOf(status)

  return order.map((step, index) => ({
    step,
    complete: current >= index,
    current: current === index,
  }))
}

export function finalizeDirectOrderCheckout(input: {
  cart: DirectOrderCart
  checkoutSessionId: string
  paymentIntentId?: string | null
  existingOrder?: DirectOrderRecord | null
  now?: Date
}): DirectOrderRecord {
  const plan = buildDirectOrderCheckoutPlan(input.cart, input.now ?? new Date())
  if (!plan.canCheckout) {
    throw new Error(`Direct order checkout is blocked: ${plan.blockers.join(', ')}`)
  }

  if (input.existingOrder?.stripeCheckoutSessionId === input.checkoutSessionId) {
    return input.existingOrder
  }

  const createdAt = (input.now ?? new Date()).toISOString()
  const publicTokenSource = `${input.cart.id}:${input.checkoutSessionId}:${input.cart.version}`
  const publicToken = Buffer.from(publicTokenSource).toString('base64url')

  return {
    id: `direct-order-${input.checkoutSessionId}`,
    cartId: input.cart.id,
    chefTenantId: input.cart.chefTenantId,
    status: 'paid',
    amountCents: plan.amountCents,
    stripeCheckoutSessionId: input.checkoutSessionId,
    stripePaymentIntentId: input.paymentIntentId ?? null,
    cartVersion: input.cart.version,
    publicToken,
    milestones: getDirectOrderMilestones('paid'),
    createdAt,
  }
}
