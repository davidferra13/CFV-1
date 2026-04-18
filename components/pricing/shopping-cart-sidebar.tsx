'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  getCarts,
  getCartWithItems,
  createCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  deleteCart,
  refreshCartPrices,
  type ShoppingCart,
  type ShoppingCartItem,
} from '@/lib/openclaw/cart-actions'
import { ImageWithFallback } from './image-with-fallback'
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart as CartIcon,
  RefreshCw,
  ChevronLeft,
  Check,
  Loader2,
} from '@/components/ui/icons'

function formatCurrency(cents: number | null): string {
  if (cents == null) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

interface ShoppingCartSidebarProps {
  open: boolean
  onClose: () => void
  /** Called when cart item count changes so parent can update badge */
  onCartCountChange?: (count: number) => void
}

export function ShoppingCartSidebar({
  open,
  onClose,
  onCartCountChange,
}: ShoppingCartSidebarProps) {
  const [carts, setCarts] = useState<ShoppingCart[]>([])
  const [activeCart, setActiveCart] = useState<ShoppingCart | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newCartName, setNewCartName] = useState('')
  const [showNewCart, setShowNewCart] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load carts on open
  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      try {
        const result = await getCarts()
        setCarts(result)
        setError(null)
        // Auto-select first cart if none active
        if (result.length > 0 && !activeCart) {
          const full = await getCartWithItems(result[0].id)
          if (full) {
            setActiveCart(full)
            onCartCountChange?.(full.items.length)
          }
        }
      } catch {
        setError('Failed to load carts')
      }
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectCart = useCallback(
    async (cartId: string) => {
      startTransition(async () => {
        try {
          const full = await getCartWithItems(cartId)
          if (full) {
            setActiveCart(full)
            onCartCountChange?.(full.items.length)
          }
          setError(null)
        } catch {
          setError('Failed to load cart')
        }
      })
    },
    [onCartCountChange]
  )

  const handleCreateCart = useCallback(async () => {
    if (!newCartName.trim()) return
    startTransition(async () => {
      try {
        const result = await createCart({ name: newCartName.trim() })
        if (result.success && result.cart) {
          setCarts((prev) => [result.cart!, ...prev])
          setActiveCart(result.cart)
          onCartCountChange?.(0)
          setNewCartName('')
          setShowNewCart(false)
        } else {
          setError(result.error || 'Failed to create cart')
        }
      } catch {
        setError('Failed to create cart')
      }
    })
  }, [newCartName, onCartCountChange])

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!activeCart) return
      const previous = activeCart
      // Optimistic remove
      setActiveCart((prev) => {
        if (!prev) return prev
        const items = prev.items.filter((i) => i.id !== itemId)
        const totalCents = items.reduce((sum, i) => {
          if (i.priceCents == null) return sum
          return sum + Math.round(i.quantity * i.priceCents)
        }, 0)
        return { ...prev, items, totalCents }
      })
      try {
        const result = await removeCartItem(itemId)
        if (!result.success) {
          setActiveCart(previous) // rollback
          setError(result.error || 'Failed to remove item')
        } else {
          onCartCountChange?.(previous.items.length - 1)
        }
      } catch {
        setActiveCart(previous)
        setError('Failed to remove item')
      }
    },
    [activeCart, onCartCountChange]
  )

  const handleUpdateQuantity = useCallback(
    async (itemId: string, delta: number) => {
      if (!activeCart) return
      const item = activeCart.items.find((i) => i.id === itemId)
      if (!item) return
      const newQty = Math.max(0.25, item.quantity + delta)
      const previous = activeCart

      // Optimistic update
      setActiveCart((prev) => {
        if (!prev) return prev
        const items = prev.items.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
        const totalCents = items.reduce((sum, i) => {
          if (i.priceCents == null) return sum
          return sum + Math.round(i.quantity * i.priceCents)
        }, 0)
        return { ...prev, items, totalCents }
      })

      try {
        const result = await updateCartItem({ itemId, quantity: newQty })
        if (!result.success) {
          setActiveCart(previous)
          setError(result.error || 'Failed to update quantity')
        }
      } catch {
        setActiveCart(previous)
        setError('Failed to update quantity')
      }
    },
    [activeCart]
  )

  const handleToggleCheck = useCallback(
    async (itemId: string) => {
      if (!activeCart) return
      const item = activeCart.items.find((i) => i.id === itemId)
      if (!item) return
      const previous = activeCart

      setActiveCart((prev) => {
        if (!prev) return prev
        const items = prev.items.map((i) =>
          i.id === itemId ? { ...i, checkedOff: !i.checkedOff } : i
        )
        return { ...prev, items }
      })

      try {
        const result = await updateCartItem({ itemId, checkedOff: !item.checkedOff })
        if (!result.success) {
          setActiveCart(previous)
        }
      } catch {
        setActiveCart(previous)
      }
    },
    [activeCart]
  )

  const handleRefreshPrices = useCallback(async () => {
    if (!activeCart) return
    setIsRefreshing(true)
    try {
      const result = await refreshCartPrices(activeCart.id)
      if (result.success) {
        // Reload cart to get updated prices
        const full = await getCartWithItems(activeCart.id)
        if (full) setActiveCart(full)
      } else {
        setError(result.error || 'Failed to refresh prices')
      }
    } catch {
      setError('Failed to refresh prices')
    } finally {
      setIsRefreshing(false)
    }
  }, [activeCart])

  const handleDeleteCart = useCallback(
    async (cartId: string) => {
      const previous = carts
      setCarts((prev) => prev.filter((c) => c.id !== cartId))
      if (activeCart?.id === cartId) {
        setActiveCart(null)
        onCartCountChange?.(0)
      }
      try {
        const result = await deleteCart(cartId)
        if (!result.success) {
          setCarts(previous)
          setError(result.error || 'Failed to delete cart')
        }
      } catch {
        setCarts(previous)
        setError('Failed to delete cart')
      }
    },
    [carts, activeCart, onCartCountChange]
  )

  // Compute totals
  const uncheckedItems = activeCart?.items.filter((i) => !i.checkedOff) || []
  const checkedItems = activeCart?.items.filter((i) => i.checkedOff) || []
  const totalCents = uncheckedItems.reduce((sum, i) => {
    if (i.priceCents == null) return sum
    return sum + Math.round(i.quantity * i.priceCents)
  }, 0)
  const unpricedCount = uncheckedItems.filter((i) => i.priceCents == null).length

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-stone-950 border-l border-stone-800 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            {activeCart && carts.length > 1 && (
              <button
                onClick={() => setActiveCart(null)}
                className="p-1 text-stone-400 hover:text-stone-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <CartIcon className="w-5 h-5 text-stone-400" />
            <h2 className="text-lg font-semibold text-stone-100">
              {activeCart ? activeCart.name : 'Shopping Carts'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-900/30 border-b border-red-800 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isPending && !activeCart ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
            </div>
          ) : !activeCart ? (
            // Cart list view
            <div className="p-4 space-y-3">
              {carts.length === 0 && !showNewCart && (
                <div className="text-center py-8">
                  <CartIcon className="w-10 h-10 text-stone-700 mx-auto mb-3" />
                  <p className="text-stone-500 text-sm mb-4">No shopping carts yet</p>
                  <button
                    onClick={() => setShowNewCart(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Cart
                  </button>
                </div>
              )}

              {carts.map((cart) => (
                <button
                  key={cart.id}
                  onClick={() => selectCart(cart.id)}
                  className="w-full text-left p-3 rounded-lg border border-stone-800 bg-stone-900/50 hover:border-stone-600 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-200">{cart.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCart(cart.id)
                      }}
                      className="p-1 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                    {cart.storeFilter && <span>{cart.storeFilter}</span>}
                    <span>{formatCurrency(cart.totalCents)}</span>
                  </div>
                </button>
              ))}

              {/* New cart form */}
              {showNewCart ? (
                <div className="p-3 rounded-lg border border-stone-700 bg-stone-900 space-y-2">
                  <input
                    type="text"
                    value={newCartName}
                    onChange={(e) => setNewCartName(e.target.value)}
                    placeholder="Cart name (e.g. Saturday dinner)"
                    className="w-full px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCart()}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateCart}
                      disabled={!newCartName.trim() || isPending}
                      className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-md disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewCart(false)
                        setNewCartName('')
                      }}
                      className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                carts.length > 0 && (
                  <button
                    onClick={() => setShowNewCart(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-stone-500 hover:text-stone-300 border border-dashed border-stone-800 rounded-lg hover:border-stone-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Cart
                  </button>
                )
              )}
            </div>
          ) : (
            // Active cart items view
            <div className="divide-y divide-stone-800/50">
              {uncheckedItems.length === 0 && checkedItems.length === 0 && (
                <div className="text-center py-12 px-4">
                  <CartIcon className="w-8 h-8 text-stone-700 mx-auto mb-3" />
                  <p className="text-stone-500 text-sm">Cart is empty</p>
                  <p className="text-stone-600 text-xs mt-1">
                    Browse the catalog and tap "Add to Cart" on any item
                  </p>
                </div>
              )}

              {/* Unchecked items */}
              {uncheckedItems.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onToggleCheck={() => handleToggleCheck(item.id)}
                  onUpdateQty={(delta) => handleUpdateQuantity(item.id, delta)}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              ))}

              {/* Checked items */}
              {checkedItems.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-stone-900/80">
                    <span className="text-xs text-stone-500 font-medium">
                      Checked off ({checkedItems.length})
                    </span>
                  </div>
                  {checkedItems.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onToggleCheck={() => handleToggleCheck(item.id)}
                      onUpdateQty={(delta) => handleUpdateQuantity(item.id, delta)}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer with totals (only when viewing a cart with items) */}
        {activeCart && (uncheckedItems.length > 0 || checkedItems.length > 0) && (
          <div className="border-t border-stone-800 p-4 space-y-3">
            {/* Refresh prices */}
            <button
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-stone-400 hover:text-stone-200 border border-stone-800 rounded-md hover:border-stone-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating prices...' : 'Update Prices'}
            </button>

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-stone-400">Estimated Total</span>
                {unpricedCount > 0 && (
                  <span className="text-xs text-amber-500 ml-2">
                    ({unpricedCount} item{unpricedCount !== 1 ? 's' : ''} unpriced)
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-white">{formatCurrency(totalCents)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Cart Item Row
// ---------------------------------------------------------------------------

function CartItemRow({
  item,
  onToggleCheck,
  onUpdateQty,
  onRemove,
}: {
  item: ShoppingCartItem
  onToggleCheck: () => void
  onUpdateQty: (delta: number) => void
  onRemove: () => void
}) {
  const lineCents = item.priceCents != null ? Math.round(item.quantity * item.priceCents) : null

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${item.checkedOff ? 'opacity-50' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={onToggleCheck}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          item.checkedOff
            ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400'
            : 'border-stone-600 hover:border-stone-400'
        }`}
      >
        {item.checkedOff && <Check className="w-3 h-3" />}
      </button>

      {/* Image */}
      <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden">
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.ingredientName}
          category=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm text-stone-200 truncate ${item.checkedOff ? 'line-through' : ''}`}>
          {item.ingredientName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateQty(-1)}
              className="w-5 h-5 flex items-center justify-center rounded bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs text-stone-300 w-8 text-center">
              {item.quantity} {item.unit}
            </span>
            <button
              onClick={() => onUpdateQty(1)}
              className="w-5 h-5 flex items-center justify-center rounded bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {item.priceSource && (
            <span className="text-[10px] text-stone-600 truncate">{item.priceSource}</span>
          )}
        </div>
      </div>

      {/* Price + delete */}
      <div className="flex-shrink-0 text-right">
        <span className="text-sm text-stone-200 font-medium">
          {lineCents != null ? formatCurrency(lineCents) : '-'}
        </span>
        <button
          onClick={onRemove}
          className="block mt-1 ml-auto p-0.5 text-stone-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
