'use client'

import React, { useMemo, useState } from 'react'

import {
  calculateDirectOrderCartTotals,
  getDirectOrderCheckoutBlockers,
  getActiveDirectOrderItems,
  getSavedDirectOrderItems,
  removeDirectOrderCartItem,
  setDirectOrderCartItemSaved,
  updateDirectOrderCartItemQuantity,
  type DirectOrderCart,
} from '@/lib/commerce/direct-orders/cart-contracts'

function dollars(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function DirectOrderCartShell({ cart }: { cart: DirectOrderCart }) {
  const [draftCart, setDraftCart] = useState(cart)
  const totals = useMemo(() => calculateDirectOrderCartTotals(draftCart), [draftCart])
  const blockers = useMemo(() => getDirectOrderCheckoutBlockers(draftCart), [draftCart])
  const activeItems = useMemo(() => getActiveDirectOrderItems(draftCart), [draftCart])
  const savedItems = useMemo(() => getSavedDirectOrderItems(draftCart), [draftCart])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 border-b pb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Direct Orders
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Cart</h1>
            <p className="text-sm text-muted-foreground">{draftCart.context.label}</p>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm">
            {totals.itemCount} items - {totals.priceConfidence.replaceAll('_', ' ')}
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {activeItems.length === 0 ? (
            <div className="rounded-md border p-6">
              <h2 className="text-lg font-semibold">No active items</h2>
              <p className="text-sm text-muted-foreground">
                Add available chef products to create a checkout-ready cart.
              </p>
            </div>
          ) : (
            activeItems.map((item) => (
              <article key={item.id} className="rounded-md border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Qty {item.quantity} - {item.status ?? 'available'}
                    </p>
                    {(item.dietaryConflictCount ?? 0) > 0 ? (
                      <p className="mt-2 text-sm font-medium text-destructive">
                        Dietary review needed for {item.dietaryConflictCount} profile
                        {item.dietaryConflictCount === 1 ? '' : 's'}.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name}`}
                      className="h-9 w-9 rounded-md border text-sm"
                      onClick={() =>
                        setDraftCart((current) =>
                          updateDirectOrderCartItemQuantity(current, item.id, item.quantity - 1)
                        )
                      }
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name}`}
                      className="h-9 w-9 rounded-md border text-sm"
                      onClick={() =>
                        setDraftCart((current) =>
                          updateDirectOrderCartItemQuantity(current, item.id, item.quantity + 1)
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-md border px-3 text-sm"
                      onClick={() =>
                        setDraftCart((current) =>
                          setDirectOrderCartItemSaved(current, item.id, true)
                        )
                      }
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-md border px-3 text-sm"
                      onClick={() =>
                        setDraftCart((current) => removeDirectOrderCartItem(current, item.id))
                      }
                    >
                      Remove
                    </button>
                    <p className="min-w-20 text-right font-semibold">
                      {dollars(item.unitPriceCents * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}

          {savedItems.length > 0 ? (
            <section className="rounded-md border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Saved for later</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {savedItems.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span>{dollars(item.unitPriceCents)}</span>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 text-xs"
                        onClick={() =>
                          setDraftCart((current) =>
                            setDirectOrderCartItemSaved(current, item.id, false)
                          )
                        }
                      >
                        Move to cart
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-md border p-4">
          <h2 className="font-semibold">Estimated total</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{dollars(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Estimated tax</dt>
              <dd>{dollars(totals.estimatedTaxCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Estimated fees</dt>
              <dd>{dollars(totals.estimatedFeesCents)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{dollars(totals.totalCents)}</dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={blockers.length > 0}
            className="mt-4 w-full rounded-md bg-foreground px-4 py-2 text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {blockers.length > 0 ? 'Checkout unavailable' : 'Checkout ready'}
          </button>
          {blockers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker.replaceAll('_', ' ')}</li>
              ))}
            </ul>
          ) : null}
        </aside>
      </section>
    </main>
  )
}
