import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  addDirectOrderCartItem,
  calculateDirectOrderCartTotals,
  getDirectOrderCheckoutBlockers,
  removeDirectOrderCartItem,
  setDirectOrderCartItemSaved,
  type DirectOrderCart,
  updateDirectOrderCartItemQuantity,
} from '@/lib/commerce/direct-orders/cart-contracts'
import {
  buildDirectOrderCheckoutPlan,
  finalizeDirectOrderCheckout,
  getDirectOrderMilestones,
} from '@/lib/commerce/direct-orders/order-lifecycle'

const cart: DirectOrderCart = {
  id: 'cart-1',
  chefTenantId: 'tenant-1',
  context: { scope: 'personal', label: 'Personal cart', role: 'owner' },
  status: 'draft',
  version: 3,
  updatedAt: '2026-05-13T00:00:00.000Z',
  buyer: { email: 'buyer@example.com' },
  pickup: { windowLabel: 'Friday 5 PM' },
  items: [
    { id: 'item-1', productProjectionId: 'p1', name: 'Dinner', unitPriceCents: 4200, quantity: 2 },
    {
      id: 'item-2',
      productProjectionId: 'p2',
      name: 'Dessert',
      unitPriceCents: 1200,
      quantity: 1,
      savedForLater: true,
    },
  ],
}

describe('direct order cart contracts', () => {
  it('calculates active totals and ignores saved-for-later items', () => {
    const totals = calculateDirectOrderCartTotals(cart)
    assert.equal(totals.subtotalCents, 8400)
    assert.equal(totals.estimatedTaxCents, 693)
    assert.equal(totals.estimatedFeesCents, 99)
    assert.equal(totals.totalCents, 9192)
    assert.equal(totals.itemCount, 2)
  })

  it('blocks checkout for unsafe or unauthorized states', () => {
    assert.deepEqual(getDirectOrderCheckoutBlockers(cart), [])
    assert.deepEqual(
      getDirectOrderCheckoutBlockers({
        ...cart,
        context: { scope: 'hub_group', label: 'Group cart', role: 'viewer' },
      }),
      ['insufficient_cart_permission']
    )
    assert.deepEqual(getDirectOrderCheckoutBlockers({ ...cart, buyer: undefined }), [
      'buyer_contact_required',
    ])
  })

  it('applies cart item mutations without changing saved evidence in place', () => {
    const added = addDirectOrderCartItem(
      cart,
      {
        id: 'item-3',
        productProjectionId: 'p3',
        name: 'Sauce',
        unitPriceCents: 700,
      },
      new Date('2026-05-13T12:00:00.000Z')
    )
    assert.equal(added.version, 4)
    assert.equal(added.items.length, 3)

    const incremented = updateDirectOrderCartItemQuantity(added, 'item-3', 3)
    assert.equal(incremented.items.find((item) => item.id === 'item-3')?.quantity, 3)

    const saved = setDirectOrderCartItemSaved(incremented, 'item-3', true)
    assert.equal(saved.items.find((item) => item.id === 'item-3')?.savedForLater, true)

    const removed = removeDirectOrderCartItem(saved, 'item-3')
    assert.equal(
      removed.items.some((item) => item.id === 'item-3'),
      false
    )
  })

  it('builds a checkout plan with reservation metadata', () => {
    const plan = buildDirectOrderCheckoutPlan(cart, new Date('2026-05-13T12:00:00.000Z'))
    assert.equal(plan.canCheckout, true)
    assert.equal(plan.amountCents, 9192)
    assert.equal(plan.stripeMetadata.flow, 'direct_order')
    assert.equal(plan.reservations.length, 1)
    assert.equal(plan.reservations[0].expiresAt, '2026-05-13T12:15:00.000Z')
  })

  it('reports order milestone progress', () => {
    const milestones = getDirectOrderMilestones('preparing')
    assert.equal(milestones.find((item) => item.step === 'preparing')?.current, true)
    assert.equal(milestones.find((item) => item.step === 'paid')?.complete, true)
    assert.equal(milestones.find((item) => item.step === 'ready')?.complete, false)
  })

  it('finalizes paid checkout idempotently from a checkout session', () => {
    const paid = finalizeDirectOrderCheckout({
      cart,
      checkoutSessionId: 'cs_test_123',
      paymentIntentId: 'pi_test_123',
      now: new Date('2026-05-13T12:00:00.000Z'),
    })
    assert.equal(paid.status, 'paid')
    assert.equal(paid.amountCents, 9192)
    assert.equal(paid.milestones.find((item) => item.step === 'paid')?.current, true)
    assert.equal(
      finalizeDirectOrderCheckout({
        cart,
        checkoutSessionId: 'cs_test_123',
        existingOrder: paid,
      }),
      paid
    )
  })
})
