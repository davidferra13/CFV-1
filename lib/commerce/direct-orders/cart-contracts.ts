export type DirectOrderCartScope =
  | 'personal'
  | 'hub_group'
  | 'household'
  | 'event'
  | 'corporate'
  | 'gift'
  | 'subscription'
  | 'concierge_review'

export type DirectOrderCartStatus = 'draft' | 'needs_review' | 'ready' | 'locked' | 'checked_out'

export interface DirectOrderCartItem {
  id: string
  productProjectionId: string
  name: string
  description?: string | null
  imageUrl?: string | null
  unitPriceCents: number
  quantity: number
  status?: 'available' | 'low_stock' | 'out_of_stock' | 'unavailable' | 'price_changed'
  savedForLater?: boolean
  dietaryConflictCount?: number
  note?: string | null
}

export interface DirectOrderCartContext {
  scope: DirectOrderCartScope
  label: string
  ownerId?: string
  hubGroupId?: string
  role?: 'owner' | 'admin' | 'chef' | 'host' | 'member' | 'viewer' | 'delegate'
}

export interface DirectOrderCart {
  id: string
  chefTenantId: string
  context: DirectOrderCartContext
  status: DirectOrderCartStatus
  items: DirectOrderCartItem[]
  version: number
  updatedAt: string
  buyer?: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  pickup?: {
    windowLabel?: string | null
    instructions?: string | null
  }
}

export interface DirectOrderCartTotals {
  subtotalCents: number
  estimatedTaxCents: number
  estimatedFeesCents: number
  totalCents: number
  itemCount: number
  priceConfidence: 'final' | 'estimated' | 'requires_chef_review'
}

export function calculateDirectOrderCartTotals(cart: DirectOrderCart): DirectOrderCartTotals {
  const activeItems = getActiveDirectOrderItems(cart)
  const subtotalCents = activeItems.reduce(
    (total, item) => total + Math.max(0, item.unitPriceCents) * Math.max(0, item.quantity),
    0
  )
  const estimatedTaxCents = Math.round(subtotalCents * 0.0825)
  const estimatedFeesCents = subtotalCents > 0 ? 99 : 0
  const requiresReview = activeItems.some(
    (item) => item.status === 'price_changed' || item.status === 'unavailable'
  )

  return {
    subtotalCents,
    estimatedTaxCents,
    estimatedFeesCents,
    totalCents: subtotalCents + estimatedTaxCents + estimatedFeesCents,
    itemCount: activeItems.reduce((total, item) => total + item.quantity, 0),
    priceConfidence: requiresReview ? 'requires_chef_review' : 'estimated',
  }
}

export function getActiveDirectOrderItems(cart: DirectOrderCart): DirectOrderCartItem[] {
  return cart.items.filter((item) => !item.savedForLater)
}

export function getSavedDirectOrderItems(cart: DirectOrderCart): DirectOrderCartItem[] {
  return cart.items.filter((item) => item.savedForLater)
}

export function canMutateDirectOrderCart(context: DirectOrderCartContext): boolean {
  if (context.scope !== 'hub_group') return true
  return ['owner', 'admin', 'chef', 'host', 'member', 'delegate'].includes(context.role ?? 'viewer')
}

export function getDirectOrderCheckoutBlockers(cart: DirectOrderCart): string[] {
  const blockers: string[] = []
  if (getActiveDirectOrderItems(cart).length === 0) blockers.push('cart_empty')
  if (cart.status === 'needs_review') blockers.push('chef_review_required')
  if (cart.status === 'locked') blockers.push('cart_locked')
  if (!canMutateDirectOrderCart(cart.context)) blockers.push('insufficient_cart_permission')
  if (cart.items.some((item) => item.status === 'out_of_stock')) blockers.push('out_of_stock_item')
  if (cart.items.some((item) => item.status === 'unavailable')) blockers.push('unavailable_item')
  if (!cart.buyer?.email && !cart.buyer?.phone) blockers.push('buyer_contact_required')
  if (!cart.pickup?.windowLabel) blockers.push('pickup_window_required')
  if (cart.items.some((item) => (item.dietaryConflictCount ?? 0) > 0)) {
    blockers.push('dietary_conflict_review_required')
  }
  return blockers
}

function touchCart(cart: DirectOrderCart, now: Date): DirectOrderCart {
  return {
    ...cart,
    version: cart.version + 1,
    updatedAt: now.toISOString(),
  }
}

export function addDirectOrderCartItem(
  cart: DirectOrderCart,
  item: Omit<DirectOrderCartItem, 'quantity'> & { quantity?: number },
  now: Date = new Date()
): DirectOrderCart {
  const quantity = Math.max(1, Math.floor(item.quantity ?? 1))
  const existing = cart.items.find(
    (candidate) =>
      candidate.productProjectionId === item.productProjectionId && !candidate.savedForLater
  )

  if (existing) {
    return updateDirectOrderCartItemQuantity(cart, existing.id, existing.quantity + quantity, now)
  }

  return touchCart(
    {
      ...cart,
      items: [
        ...cart.items,
        {
          ...item,
          quantity,
          savedForLater: false,
        },
      ],
    },
    now
  )
}

export function updateDirectOrderCartItemQuantity(
  cart: DirectOrderCart,
  itemId: string,
  quantity: number,
  now: Date = new Date()
): DirectOrderCart {
  const nextQuantity = Math.max(0, Math.floor(quantity))
  const nextItems =
    nextQuantity === 0
      ? cart.items.filter((item) => item.id !== itemId)
      : cart.items.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity } : item))
  return touchCart({ ...cart, items: nextItems }, now)
}

export function setDirectOrderCartItemSaved(
  cart: DirectOrderCart,
  itemId: string,
  savedForLater: boolean,
  now: Date = new Date()
): DirectOrderCart {
  return touchCart(
    {
      ...cart,
      items: cart.items.map((item) => (item.id === itemId ? { ...item, savedForLater } : item)),
    },
    now
  )
}

export function removeDirectOrderCartItem(
  cart: DirectOrderCart,
  itemId: string,
  now: Date = new Date()
): DirectOrderCart {
  return touchCart(
    {
      ...cart,
      items: cart.items.filter((item) => item.id !== itemId),
    },
    now
  )
}
