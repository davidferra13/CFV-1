// Online Cart - slide-in cart drawer with checkout
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeOnlineOrder } from '@/lib/commerce/online-order-actions'

export type CartItem = {
  productId: string
  name: string
  unitPriceCents: number
  quantity: number
  modifiers: Array<{ name: string; option: string; priceDeltaCents: number }>
  notes: string
}

type Props = {
  open: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (index: number, quantity: number) => void
  onRemoveItem: (index: number) => void
  onClearCart: () => void
  chefSlug: string
  restaurantName: string
}

export function OnlineCart({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  chefSlug,
  restaurantName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [orderType, setOrderType] = useState<'pickup' | 'dine_in'>('pickup')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  const subtotalCents = items.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, m) => ms + m.priceDeltaCents, 0)
    return sum + (item.unitPriceCents + modTotal) * item.quantity
  }, 0)

  function handlePlaceOrder() {
    if (!customerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!customerPhone.trim()) {
      setError('Please enter your phone number')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await placeOnlineOrder({
          chefSlug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            modifiers: item.modifiers.length > 0 ? item.modifiers : undefined,
            notes: item.notes || undefined,
          })),
          orderType,
          notes: orderNotes.trim() || undefined,
        })

        onClearCart()
        router.push(`/order/${chefSlug}/status/${result.orderId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to place order')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Your Order</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500">Your cart is empty.</p>
              <p className="text-stone-400 text-sm mt-1">Add items from the menu to get started.</p>
            </div>
          ) : showCheckout ? (
            /* Checkout form */
            <div className="space-y-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="text-sm text-stone-500 hover:text-stone-200"
              >
                &larr; Back to cart
              </button>

              {/* Order type */}
              <div>
                <label className="block text-sm font-medium text-stone-200 mb-2">Order type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderType('pickup')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      orderType === 'pickup'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => setOrderType('dine_in')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      orderType === 'dine_in'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    Dine-in
                  </button>
                </div>
              </div>

              {/* Customer info */}
              <div>
                <label className="block text-sm font-medium text-stone-200 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-200 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-200 mb-1">
                  Email (optional, for confirmation)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-200 mb-1">Order notes</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special requests?"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-200 resize-none"
                  rows={2}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-200 text-sm p-3 rounded-lg">{error}</div>
              )}

              {/* Order summary */}
              <div className="border-t border-stone-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-stone-600">
                  <span>Subtotal</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900">
                  <span>Total</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Cart items */
            <div className="space-y-4">
              {items.map((item, index) => {
                const modTotal = item.modifiers.reduce((sum, m) => sum + m.priceDeltaCents, 0)
                const lineTotal = (item.unitPriceCents + modTotal) * item.quantity

                return (
                  <div key={index} className="border border-stone-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900">{item.name}</p>
                        {item.modifiers.length > 0 && (
                          <div className="mt-1">
                            {item.modifiers.map((m, mi) => (
                              <p key={mi} className="text-xs text-stone-500">
                                {m.option}
                                {m.priceDeltaCents > 0 && (
                                  <span> (+${(m.priceDeltaCents / 100).toFixed(2)})</span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-stone-400 mt-1 italic">{item.notes}</p>
                        )}
                      </div>
                      <span className="font-medium text-stone-900">
                        ${(lineTotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                          className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 text-sm"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium text-stone-200 w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100 text-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(index)}
                        className="text-xs text-red-500 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-white">
            {!showCheckout ? (
              <>
                <div className="flex justify-between mb-3 text-stone-900">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold">${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-stone-900 text-white py-3 rounded-lg font-medium hover:bg-stone-800 transition-colors"
                >
                  Checkout
                </button>
              </>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={isPending}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isPending
                  ? 'Placing Order...'
                  : `Place Order - $${(subtotalCents / 100).toFixed(2)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
