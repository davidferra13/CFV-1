'use client'

import { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Banknote,
  Search,
  X,
} from 'lucide-react'
import { counterCheckout } from '@/lib/commerce/checkout-actions'
import { openRegister, closeRegister } from '@/lib/commerce/register-actions'
import { useRouter } from 'next/navigation'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/commerce/constants'
import type { ProductCategory } from '@/lib/commerce/constants'

type Product = {
  id: string
  name: string
  price_cents: number
  category: string | null
  image_url: string | null
  is_active: boolean
  modifiers: any[]
  tax_class: string
  cost_cents: number | null
}

type CartItem = {
  product: Product
  quantity: number
}

type Props = {
  products: any[]
  registerSession: any | null
}

export function PosRegister({ products, registerSession }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [lastSale, setLastSale] = useState<{
    saleNumber: string
    totalCents: number
    changeDueCents: number
  } | null>(null)

  // Register open/close state
  const [showOpenRegister, setShowOpenRegister] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [showCloseRegister, setShowCloseRegister] = useState(false)
  const [closingCash, setClosingCash] = useState('')

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p: any) => p.is_active)
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((p: any) => p.name.toLowerCase().includes(s))
    }
    if (categoryFilter) {
      filtered = filtered.filter((p: any) => p.category === categoryFilter)
    }
    return filtered
  }, [products, search, categoryFilter])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of products) {
      if (p.category) cats.add(p.category)
    }
    return Array.from(cats).sort()
  }, [products])

  // Cart math
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.product.price_cents * item.quantity,
    0
  )

  // ─── Cart Actions ────────────────────────────────────────────

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setShowPayment(false)
    setLastSale(null)
  }

  // ─── Checkout ────────────────────────────────────────────────

  function handleCheckout(paymentMethod: 'cash' | 'card') {
    if (cart.length === 0) return

    startTransition(async () => {
      try {
        const result = await counterCheckout({
          registerSessionId: registerSession?.id,
          items: cart.map((item) => ({
            productProjectionId: item.product.id,
            name: item.product.name,
            unitPriceCents: item.product.price_cents,
            quantity: item.quantity,
            taxClass: (item.product.tax_class as any) ?? 'standard',
            unitCostCents: item.product.cost_cents ?? undefined,
          })),
          paymentMethod,
          amountTenderedCents: subtotalCents,
        })

        setLastSale({
          saleNumber: result.saleNumber,
          totalCents: result.totalCents,
          changeDueCents: result.changeDueCents,
        })
        setCart([])
        setShowPayment(false)
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Checkout failed')
      }
    })
  }

  // ─── Register Open/Close ─────────────────────────────────────

  function handleOpenRegister() {
    const cents = Math.round(parseFloat(openingCash || '0') * 100)
    startTransition(async () => {
      try {
        await openRegister({ openingCashCents: cents })
        setShowOpenRegister(false)
        setOpeningCash('')
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to open register')
      }
    })
  }

  function handleCloseRegister() {
    if (!registerSession) return
    const cents = Math.round(parseFloat(closingCash || '0') * 100)
    startTransition(async () => {
      try {
        await closeRegister(registerSession.id, cents)
        setShowCloseRegister(false)
        setClosingCash('')
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to close register')
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-stone-100">POS Register</h1>
        <div className="flex gap-2">
          {!registerSession ? (
            <Button variant="primary" onClick={() => setShowOpenRegister(true)}>
              Open Register
            </Button>
          ) : (
            <>
              <Badge variant="success">Register Open</Badge>
              <Button variant="secondary" onClick={() => setShowCloseRegister(true)}>
                Close Register
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Open Register Dialog */}
      {showOpenRegister && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-stone-200 font-medium mb-3">Open Register</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-stone-400 text-sm">Opening Cash ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button variant="primary" onClick={handleOpenRegister} disabled={isPending}>
                Open
              </Button>
              <Button variant="ghost" onClick={() => setShowOpenRegister(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Register Dialog */}
      {showCloseRegister && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-stone-200 font-medium mb-3">Close Register</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-stone-400 text-sm">Closing Cash ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button variant="primary" onClick={handleCloseRegister} disabled={isPending}>
                Close
              </Button>
              <Button variant="ghost" onClick={() => setShowCloseRegister(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Sale Confirmation */}
      {lastSale && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between bg-emerald-900/20 border border-emerald-800 rounded-lg">
            <div>
              <p className="text-emerald-400 font-medium">Sale {lastSale.saleNumber} completed</p>
              <p className="text-stone-400 text-sm">
                Total: ${(lastSale.totalCents / 100).toFixed(2)}
                {lastSale.changeDueCents > 0 &&
                  ` · Change due: $${(lastSale.changeDueCents / 100).toFixed(2)}`}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setLastSale(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Grid (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <Input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {PRODUCT_CATEGORY_LABELS[cat as ProductCategory] ?? cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-stone-500">No products found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-stone-900 border border-stone-800 rounded-lg p-3 text-left hover:border-brand-600 hover:bg-stone-800 transition-all active:scale-95"
                >
                  <p className="text-stone-200 font-medium text-sm line-clamp-2">{product.name}</p>
                  <p className="text-brand-500 font-bold mt-1">
                    ${(product.price_cents / 100).toFixed(2)}
                  </p>
                  {product.category && (
                    <p className="text-stone-500 text-xs mt-1">
                      {PRODUCT_CATEGORY_LABELS[product.category as ProductCategory] ??
                        product.category}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">Tap products to add them</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 py-2 border-b border-stone-800 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-200 text-sm truncate">{item.product.name}</p>
                        <p className="text-stone-500 text-xs">
                          ${(item.product.price_cents / 100).toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-stone-200 text-sm w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-stone-200 text-sm font-medium w-16 text-right">
                        ${((item.product.price_cents * item.quantity) / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div className="pt-3 border-t border-stone-700">
                    <div className="flex justify-between text-stone-100 font-bold text-lg">
                      <span>Total</span>
                      <span>${(subtotalCents / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="primary"
                      onClick={() => handleCheckout('cash')}
                      disabled={isPending}
                      className="flex items-center justify-center gap-2"
                    >
                      <Banknote className="w-4 h-4" />
                      Cash
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleCheckout('card')}
                      disabled={isPending}
                      className="flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Card
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
