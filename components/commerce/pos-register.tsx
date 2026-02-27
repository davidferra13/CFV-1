'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Search,
  X,
  Wallet,
} from 'lucide-react'
import { counterCheckout } from '@/lib/commerce/checkout-actions'
import { openRegister, closeRegister } from '@/lib/commerce/register-actions'
import {
  getCashDrawerSummary,
  listCashDrawerMovements,
  recordCashAdjustment,
  recordCashPaidIn,
  recordCashPaidOut,
} from '@/lib/commerce/cash-drawer-actions'
import { useRouter } from 'next/navigation'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/commerce/constants'
import type { ProductCategory } from '@/lib/commerce/constants'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils/currency'

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
  products: Product[]
  registerSession: any | null
}

type DrawerSummary = {
  expectedCashCents: number
  movementNetCents: number
  openingCashCents: number
  breakdown: {
    salePaymentCents: number
    refundCents: number
    paidInCents: number
    paidOutCents: number
    adjustmentCents: number
  }
}

const CART_STORAGE_KEY = 'chefflow_pos_cart_v1'

export function PosRegister({ products, registerSession }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<{
    saleNumber: string
    totalCents: number
    changeDueCents: number
  } | null>(null)

  const [hydratedCart, setHydratedCart] = useState(false)

  // Register open/close state
  const [showOpenRegister, setShowOpenRegister] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [showCloseRegister, setShowCloseRegister] = useState(false)
  const [closingCash, setClosingCash] = useState('')

  // Tip + cash tender
  const [tipInput, setTipInput] = useState('0.00')
  const [cashTendered, setCashTendered] = useState('')

  // Drawer state
  const [drawerSummary, setDrawerSummary] = useState<DrawerSummary | null>(null)
  const [drawerMovements, setDrawerMovements] = useState<any[]>([])
  const [drawerAction, setDrawerAction] = useState<'paid_in' | 'paid_out' | 'adjustment' | null>(
    null
  )
  const [drawerAmount, setDrawerAmount] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p: Product) => p.is_active)
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((p: Product) => p.name.toLowerCase().includes(s))
    }
    if (categoryFilter) {
      filtered = filtered.filter((p: Product) => p.category === categoryFilter)
    }
    return filtered
  }, [products, search, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of products) {
      if (p.category) cats.add(p.category)
    }
    return Array.from(cats).sort()
  }, [products])

  const subtotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0),
    [cart]
  )
  const tipCents = useMemo(() => parseCurrencyToCents(tipInput || '0'), [tipInput])
  const totalDueCents = subtotalCents + tipCents

  useEffect(() => {
    if (totalDueCents <= 0) {
      setCashTendered('')
      return
    }

    if (!cashTendered) {
      setCashTendered((totalDueCents / 100).toFixed(2))
    }
  }, [totalDueCents, cashTendered])

  useEffect(() => {
    if (hydratedCart) return

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) {
        setHydratedCart(true)
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setHydratedCart(true)
        return
      }

      const restored: CartItem[] = parsed
        .map((item: any) => {
          const product = products.find((p) => p.id === item.productId)
          const quantity = Number(item.quantity)
          if (!product || !Number.isInteger(quantity) || quantity <= 0) return null
          return { product, quantity }
        })
        .filter(Boolean)

      setCart(restored)
    } catch {
      // ignore malformed cache
    } finally {
      setHydratedCart(true)
    }
  }, [products, hydratedCart])

  useEffect(() => {
    if (!hydratedCart) return

    const payload = cart.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload))
  }, [cart, hydratedCart])

  async function refreshDrawerData() {
    if (!registerSession?.id) {
      setDrawerSummary(null)
      setDrawerMovements([])
      return
    }

    try {
      const [summary, movementData] = await Promise.all([
        getCashDrawerSummary(registerSession.id),
        listCashDrawerMovements({ registerSessionId: registerSession.id, limit: 20 }),
      ])
      setDrawerSummary(summary as DrawerSummary)
      setDrawerMovements(movementData.movements ?? [])
    } catch {
      setDrawerSummary(null)
      setDrawerMovements([])
    }
  }

  useEffect(() => {
    refreshDrawerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSession?.id])

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
    setTipInput('0.00')
    setCashTendered('')
    setLastSale(null)
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  function handleCheckout(paymentMethod: 'cash' | 'card') {
    if (cart.length === 0) return

    const amountTenderedCents =
      paymentMethod === 'cash' ? parseCurrencyToCents(cashTendered || '0') : totalDueCents

    if (paymentMethod === 'cash' && amountTenderedCents < totalDueCents) {
      alert('Amount tendered must be at least the total due')
      return
    }

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
          amountTenderedCents,
          tipCents,
        })

        setLastSale({
          saleNumber: result.saleNumber,
          totalCents: result.totalCents,
          changeDueCents: result.changeDueCents,
        })
        setCart([])
        setTipInput('0.00')
        setCashTendered('')
        localStorage.removeItem(CART_STORAGE_KEY)
        await refreshDrawerData()
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Checkout failed')
      }
    })
  }

  function handleOpenRegister() {
    const cents = parseCurrencyToCents(openingCash || '0')
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
    const cents = parseCurrencyToCents(closingCash || '0')
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

  function handleDrawerActionSubmit() {
    if (!registerSession?.id || !drawerAction) return
    const amountCents = parseCurrencyToCents(drawerAmount || '0')

    if (amountCents <= 0 && drawerAction !== 'adjustment') {
      alert('Enter a positive amount')
      return
    }

    startTransition(async () => {
      try {
        if (drawerAction === 'paid_in') {
          await recordCashPaidIn({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        } else if (drawerAction === 'paid_out') {
          await recordCashPaidOut({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        } else {
          await recordCashAdjustment({
            registerSessionId: registerSession.id,
            amountCents,
            notes: drawerNotes || undefined,
          })
        }

        setDrawerAction(null)
        setDrawerAmount('')
        setDrawerNotes('')
        await refreshDrawerData()
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to record drawer movement')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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

      {registerSession && drawerSummary && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Expected Drawer</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(drawerSummary.expectedCashCents)}
                </p>
                <p className="text-xs text-stone-500">
                  Opening {formatCurrency(drawerSummary.openingCashCents)} · Net{' '}
                  {formatCurrency(drawerSummary.movementNetCents)}
                </p>
              </div>
              <div className="text-sm text-stone-400">
                <p>Sales: {formatCurrency(drawerSummary.breakdown.salePaymentCents)}</p>
                <p>Refunds: {formatCurrency(drawerSummary.breakdown.refundCents)}</p>
                <p>Paid In: {formatCurrency(drawerSummary.breakdown.paidInCents)}</p>
                <p>Paid Out: {formatCurrency(drawerSummary.breakdown.paidOutCents)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => setDrawerAction('paid_in')}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Paid In
                </Button>
                <Button variant="ghost" onClick={() => setDrawerAction('paid_out')}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Paid Out
                </Button>
                <Button variant="ghost" onClick={() => setDrawerAction('adjustment')}>
                  Adjustment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {drawerAction && registerSession && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-stone-200 font-medium capitalize">
              Record {drawerAction.replace('_', ' ')}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-stone-400 text-sm">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-stone-400 text-sm">Notes (optional)</label>
                <Input
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Reason for movement"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" disabled={isPending} onClick={handleDrawerActionSubmit}>
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDrawerAction(null)
                  setDrawerAmount('')
                  setDrawerNotes('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {lastSale && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between bg-emerald-900/20 border border-emerald-800 rounded-lg">
            <div>
              <p className="text-emerald-400 font-medium">Sale {lastSale.saleNumber} completed</p>
              <p className="text-stone-400 text-sm">
                Total: {formatCurrency(lastSale.totalCents)}
                {lastSale.changeDueCents > 0 &&
                  ` · Change due: ${formatCurrency(lastSale.changeDueCents)}`}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setLastSale(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
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

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-stone-500">No products found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product: Product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-brand-600 hover:bg-stone-800 transition-all active:scale-95 overflow-hidden"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-24 w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="p-3">
                    <p className="text-stone-200 font-medium text-sm line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-brand-500 font-bold mt-1">
                      {formatCurrency(product.price_cents)}
                    </p>
                    {product.category && (
                      <p className="text-stone-500 text-xs mt-1">
                        {PRODUCT_CATEGORY_LABELS[product.category as ProductCategory] ??
                          product.category}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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
                          {formatCurrency(item.product.price_cents)} each
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
                        {formatCurrency(item.product.price_cents * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="space-y-2 pt-3 border-t border-stone-700">
                    <div>
                      <label className="text-stone-400 text-xs">Tip ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tipInput}
                        onChange={(e) => setTipInput(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-stone-400 text-xs">Cash Tendered ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-between text-stone-100 font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(totalDueCents)}</span>
                    </div>
                  </div>

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

      {drawerMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Drawer Movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {drawerMovements.slice(0, 8).map((movement) => (
              <div key={movement.id} className="flex justify-between text-sm text-stone-400">
                <span className="capitalize">
                  {String(movement.movement_type).replace('_', ' ')}
                </span>
                <span className={movement.amount_cents >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatCurrency(movement.amount_cents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
