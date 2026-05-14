import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { DirectOrderCartShell } from '@/components/commerce/direct-orders/direct-order-cart-shell'
import type { DirectOrderCart } from '@/lib/commerce/direct-orders/cart-contracts'

describe('direct orders cart UI', () => {
  it('renders item rows, saved-for-later, totals, and checkout blockers', () => {
    const cart: DirectOrderCart = {
      id: 'cart-ui',
      chefTenantId: 'tenant-1',
      context: { scope: 'hub_group', label: 'Friday Circle cart', role: 'viewer' },
      status: 'draft',
      version: 1,
      updatedAt: '2026-05-13T00:00:00.000Z',
      items: [
        {
          id: 'item-1',
          productProjectionId: 'p1',
          name: 'Chef meal drop',
          unitPriceCents: 4200,
          quantity: 2,
          status: 'available',
        },
        {
          id: 'item-2',
          productProjectionId: 'p2',
          name: 'Seasonal dessert',
          unitPriceCents: 1200,
          quantity: 1,
          status: 'price_changed',
          savedForLater: true,
        },
      ],
    }

    const html = renderToStaticMarkup(<DirectOrderCartShell cart={cart} />)
    assert.match(html, /Friday Circle cart/)
    assert.match(html, /Chef meal drop/)
    assert.match(html, /Saved for later/)
    assert.match(html, /insufficient cart permission/)
    assert.match(html, /\$91\.92/)
  })
})
