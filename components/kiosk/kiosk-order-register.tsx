/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Minus, Plus, CreditCard, Banknote, Wallet, X } from '@/components/ui/icons'
import type { StaffPinSession } from '@/lib/devices/types'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils/currency'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/commerce/constants'
import type { ProductCategory } from '@/lib/commerce/constants'
import { hasTaxableItems } from '@/lib/commerce/tax-policy'
import { computeLineTaxCents } from '@/lib/commerce/kiosk-policy'
import {
  enqueueOrderCheckout,
  getOrderQueueSize,
  replayOrderCheckoutQueue,
} from '@/lib/devices/offline-order-queue'

type ProductModifier = {
  name: string
  options: Array<{ label: string; price_delta_cents: number }>
}

type Product = {
  id: string
  name: string
  price_cents: number
  category: string | null
  image_url: string | null
  modifiers: ProductModifier[]
  tax_class: string
  is_active: boolean
}

type CartItem = {
  id: string
  product: Product
  quantity: number
  modifiersApplied: Array<{ name: string; option: string; price_delta_cents: number }>
  unitPriceCents: number
}

type DrawerSummary = {
  openingCashCents: number
  movementNetCents: number
  expectedCashCents: number
  status: string
  breakdown: {
    salePaymentCents: number
    refundCents: number
    paidInCents: number
    paidOutCents: number
    adjustmentCents: number
  }
}

const CART_STORAGE_KEY = 'chefflow_kiosk_order_cart_v1'

type KioskOrderRegisterProps = {
  token: string
  staffSession: StaffPinSession | null
}

function modifierSignature(modifiers: Array<{ name: string; option: string }>) {
  return modifiers
    .map((m) => `${m.name}:${m.option}`)
    .sort()
    .join('|')
}

function buildCheckoutAttemptId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function KioskOrderRegister({ token, staffSession }: KioskOrderRegisterProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [drawerSummary, setDrawerSummary] = useState<DrawerSummary | null>(null)
  const [drawerMovements, setDrawerMovements] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cashTendered, setCashTendered] = useState('')
  const [tipInput, setTipInput] = useState('0.00')
  const [queuedCount, setQueuedCount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  const [taxZipConfigured, setTaxZipConfigured] = useState(false)
  const [taxServiceAvailable, setTaxServiceAvailable] = useState(true)

  const [lastSale, setLastSale] = useState<{
    saleNumber: string
    totalCents: number
    changeDueCents: number
  } | null>(null)

  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null)
  const [modifierSelections, setModifierSelections] = useState<Record<string, string>>({})

  const [drawerAction, setDrawerAction] = useState<
    'paid_in' | 'paid_out' | 'adjustment' | 'no_sale' | null
  >(null)
  const [drawerAmount, setDrawerAmount] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')
  const checkoutRequestIdRef = useRef<string | null>(null)
  const hasManagerDrawerAccess = !!staffSession?.is_manager

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setCart(parsed)
      }
    } catch {
      // ignore corrupt cart cache
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const subtotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    [cart]
  )
  const cartHasTaxableItems = useMemo(
    () =>
      hasTaxableItems(
        cart.map((item) => ({
          taxClass: (item.product.tax_class as any) ?? 'standard',
        }))
      ),
    [cart]
  )
  const estimatedTaxCents = useMemo(() => {
    if (!taxZipConfigured || taxRate <= 0) return 0

    return cart.reduce(
      (sum, item) =>
        sum +
        computeLineTaxCents({
          lineTotalCents: item.unitPriceCents * item.quantity,
          combinedRate: taxRate,
          taxClass: item.product.tax_class,
        }),
      0
    )
  }, [cart, taxRate, taxZipConfigured])
  const taxBlockingMessage = useMemo(() => {
    if (!cartHasTaxableItems) return null
    if (!taxZipConfigured) {
      return 'Business ZIP is required for taxable items before checkout.'
    }
    if (!taxServiceAvailable) {
      return 'Tax service unavailable. Unable to calculate sales tax right now.'
    }
    return null
  }, [cartHasTaxableItems, taxServiceAvailable, taxZipConfigured])
  const checkoutBlockedByTax = !!taxBlockingMessage

  const tipCents = useMemo(() => parseCurrencyToCents(tipInput || '0'), [tipInput])
  const totalDueCents = subtotalCents + estimatedTaxCents + tipCents
  const cashTenderedCents = useMemo(() => parseCurrencyToCents(cashTendered || '0'), [cashTendered])
  const insufficientCashTendered = totalDueCents > 0 && cashTenderedCents < totalDueCents
  const cashPaymentBlocked = checkoutBlockedByTax || insufficientCashTendered

  useEffect(() => {
    if (totalDueCents <= 0) {
      setCashTendered('')
      return
    }
    if (!cashTendered) {
      setCashTendered((totalDueCents / 100).toFixed(2))
    }
  }, [totalDueCents, cashTendered])

  const loadCatalog = useCallback(async () => {
    const response = await fetch('/api/kiosk/order/catalog', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load products')
    }

    setProducts(data.products || [])
    setTaxRate(typeof data.tax_rate === 'number' ? data.tax_rate : 0)
    setTaxZipConfigured(!!data.tax_zip_configured)
    setTaxServiceAvailable(data.tax_zip_configured ? !!data.tax_service_available : true)
  }, [token])

  const loadDrawer = useCallback(async () => {
    const sessionId = staffSession?.session_id
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''

    const response = await fetch(`/api/kiosk/order/drawer${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load drawer summary')
    }

    setDrawerSummary(data.summary || null)
    setDrawerMovements(data.movements || [])
  }, [staffSession?.session_id, token])

  useEffect(() => {
    let mounted = true

    async function boot() {
      setLoading(true)
      setError('')
      try {
        await Promise.all([loadCatalog(), loadDrawer()])
        const sent = await replayOrderCheckoutQueue()
        if (sent > 0) {
          await loadDrawer().catch(() => {})
        }
        if (mounted) {
          setQueuedCount(getOrderQueueSize())
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load kiosk order mode')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [loadCatalog, loadDrawer])

  const filteredProducts = useMemo(() => {
    let next = products.filter((p) => p.is_active)

    if (search) {
      const normalized = search.toLowerCase()
      next = next.filter((p) => p.name.toLowerCase().includes(normalized))
    }

    if (categoryFilter) {
      next = next.filter((p) => p.category === categoryFilter)
    }

    return next
  }, [products, search, categoryFilter])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const product of products) {
      if (product.category) set.add(product.category)
    }
    return Array.from(set).sort()
  }, [products])

  function addToCart(product: Product, modifiersApplied: CartItem['modifiersApplied'] = []) {
    const signature = modifierSignature(modifiersApplied)
    const itemId = `${product.id}::${signature}`
    const modifierDelta = modifiersApplied.reduce((sum, m) => sum + m.price_delta_cents, 0)
    const unitPriceCents = product.price_cents + modifierDelta

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId)
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }

      return [
        ...prev,
        {
          id: itemId,
          product,
          quantity: 1,
          modifiersApplied,
          unitPriceCents,
        },
      ]
    })
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function clearCart() {
    setCart([])
    checkoutRequestIdRef.current = null
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  function openCustomizer(product: Product) {
    if (!Array.isArray(product.modifiers) || product.modifiers.length === 0) {
      addToCart(product)
      return
    }

    const defaults: Record<string, string> = {}
    for (const modifier of product.modifiers) {
      if (Array.isArray(modifier.options) && modifier.options.length > 0) {
        defaults[modifier.name] = modifier.options[0].label
      }
    }

    setModifierSelections(defaults)
    setCustomizingProduct(product)
  }

  function confirmCustomizer() {
    if (!customizingProduct) return

    const normalized: Array<{ name: string; option: string; price_delta_cents: number }> = []

    for (const modifier of customizingProduct.modifiers || []) {
      const selectedOption = modifierSelections[modifier.name]
      if (!selectedOption) continue
      const option = (modifier.options || []).find((item) => item.label === selectedOption)
      if (!option) continue

      normalized.push({
        name: modifier.name,
        option: option.label,
        price_delta_cents: option.price_delta_cents,
      })
    }

    addToCart(customizingProduct, normalized)
    setCustomizingProduct(null)
    setModifierSelections({})
  }

  async function submitCheckout(paymentMethod: 'cash' | 'card') {
    if (cart.length === 0 || submitting) return
    if (checkoutBlockedByTax) {
      setError(taxBlockingMessage ?? 'Unable to checkout taxable items right now')
      return
    }

    setSubmitting(true)
    setError('')

    if (!checkoutRequestIdRef.current) {
      checkoutRequestIdRef.current = buildCheckoutAttemptId()
    }
    const checkoutRequestId = checkoutRequestIdRef.current

    const payload = {
      items: cart.map((item) => ({
        product_projection_id: item.product.id,
        quantity: item.quantity,
        selected_modifiers: item.modifiersApplied.map((m) => ({ name: m.name, option: m.option })),
      })),
      payment_method: paymentMethod,
      amount_tendered_cents: paymentMethod === 'cash' ? cashTenderedCents : totalDueCents,
      tip_cents: tipCents,
      session_id: staffSession?.session_id,
      client_checkout_id: checkoutRequestId,
    }

    try {
      const response = await fetch('/api/kiosk/order/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Checkout failed')
        setSubmitting(false)
        return
      }

      setLastSale({
        saleNumber: data.sale_number,
        totalCents: data.total_cents,
        changeDueCents: data.change_due_cents,
      })
      clearCart()
      setTipInput('0.00')
      setCashTendered('')
      setQueuedCount(getOrderQueueSize())
      await loadDrawer().catch(() => {})
    } catch {
      enqueueOrderCheckout(token, payload)
      setQueuedCount(getOrderQueueSize())
      clearCart()
      setTipInput('0.00')
      setCashTendered('')
      setLastSale({
        saleNumber: 'Queued',
        totalCents: totalDueCents,
        changeDueCents: 0,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitDrawerAction() {
    if (!drawerAction) return
    if (drawerAction !== 'paid_in' && !hasManagerDrawerAccess) {
      setError('Manager role required for this drawer action')
      return
    }

    const amountCents = parseCurrencyToCents(drawerAmount || '0')
    if (drawerAction === 'no_sale' && !drawerNotes.trim()) {
      setError('Notes are required for no-sale drawer opens')
      return
    }
    if (drawerAction !== 'no_sale' && amountCents <= 0 && drawerAction !== 'adjustment') {
      setError('Enter a positive amount')
      return
    }

    const payload = {
      action: drawerAction,
      ...(drawerAction === 'no_sale'
        ? {}
        : { amount_cents: drawerAction === 'adjustment' ? amountCents : Math.abs(amountCents) }),
      notes: drawerNotes,
      session_id: staffSession?.session_id,
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/kiosk/order/drawer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to record drawer movement')
        setSubmitting(false)
        return
      }

      setDrawerSummary(data.summary)
      setDrawerAction(null)
      setDrawerAmount('')
      setDrawerNotes('')
      await loadDrawer().catch(() => {})
    } catch {
      setError('Network error while recording drawer movement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-stone-400">Loading order register...</p>
  }

  return (
    <div className="w-full max-w-7xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-stone-100">Kiosk Register</h2>
              <p className="text-sm text-stone-400">Tap items to build the order</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items"
                className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2 pl-9 pr-3 text-sm text-stone-100"
              />
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                categoryFilter === null
                  ? 'bg-brand-500 text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(categoryFilter === category ? null : category)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  categoryFilter === category
                    ? 'bg-brand-500 text-white'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {PRODUCT_CATEGORY_LABELS[category as ProductCategory] ?? category}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-8 text-center text-stone-500">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => openCustomizer(product)}
                  className="overflow-hidden rounded-xl border border-stone-700 bg-stone-800 text-left transition active:scale-[0.98]"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-28 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-stone-700 text-xs uppercase tracking-wide text-stone-400">
                      No image
                    </div>
                  )}
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-stone-100">
                      {product.name}
                    </p>
                    <p className="text-base font-bold text-brand-400">
                      {formatCurrency(product.price_cents)}
                    </p>
                    {Array.isArray(product.modifiers) && product.modifiers.length > 0 && (
                      <p className="text-xs text-stone-400">Tap to customize</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-100">Cash Drawer</h3>
              <Wallet className="h-4 w-4 text-stone-400" />
            </div>
            {drawerSummary ? (
              <>
                <p className="text-sm text-stone-400">Expected Cash</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(drawerSummary.expectedCashCents)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Opening {formatCurrency(drawerSummary.openingCashCents)} · Net{' '}
                  {formatCurrency(drawerSummary.movementNetCents)}
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-500">No open register session</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDrawerAction('paid_in')}
                className="rounded-lg bg-stone-800 px-2 py-2 text-xs text-stone-200 hover:bg-stone-700"
              >
                Paid In
              </button>
              <button
                onClick={() => setDrawerAction('paid_out')}
                disabled={!hasManagerDrawerAccess}
                className="rounded-lg bg-stone-800 px-2 py-2 text-xs text-stone-200 hover:bg-stone-700"
              >
                Paid Out
              </button>
              <button
                onClick={() => setDrawerAction('adjustment')}
                disabled={!hasManagerDrawerAccess}
                className="rounded-lg bg-stone-800 px-2 py-2 text-xs text-stone-200 hover:bg-stone-700"
              >
                Adjust
              </button>
              <button
                onClick={() => setDrawerAction('no_sale')}
                disabled={!hasManagerDrawerAccess}
                className="rounded-lg bg-stone-800 px-2 py-2 text-xs text-stone-200 hover:bg-stone-700"
              >
                No Sale
              </button>
            </div>
            {!hasManagerDrawerAccess && (
              <p className="mt-2 text-xs text-amber-400">
                Manager role required for paid out, adjustment, and no-sale.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-100">Cart</h3>
              {cart.length > 0 && (
                <button className="text-xs text-stone-400 hover:text-stone-200" onClick={clearCart}>
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">Add items to start checkout</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-stone-800 bg-stone-950 p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-stone-100">{item.product.name}</p>
                        {item.modifiersApplied.length > 0 && (
                          <p className="text-xs text-stone-400">
                            {item.modifiersApplied.map((m) => `${m.name}: ${m.option}`).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="rounded p-1 text-stone-500 hover:bg-stone-800 hover:text-red-400"
                        title="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded bg-stone-800 p-1 text-stone-300 hover:bg-stone-700"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm text-stone-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded bg-stone-800 p-1 text-stone-300 hover:bg-stone-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-stone-100">
                        {formatCurrency(item.unitPriceCents * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="space-y-1 border-t border-stone-800 pt-3">
                  <div className="flex justify-between text-sm text-stone-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-400">
                    <span>Estimated tax</span>
                    <span>{formatCurrency(estimatedTaxCents)}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">Tip ($)</label>
                    <input
                      value={tipInput}
                      onChange={(e) => setTipInput(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-sm text-stone-100"
                    />
                  </div>

                  <div className="flex justify-between text-base font-bold text-stone-100">
                    <span>Total</span>
                    <span>{formatCurrency(totalDueCents)}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">Cash tendered ($)</label>
                    <input
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-sm text-stone-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => submitCheckout('cash')}
                      disabled={submitting || cashPaymentBlocked}
                      className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <Banknote className="h-4 w-4" /> Cash
                    </button>
                    <button
                      onClick={() => submitCheckout('card')}
                      disabled={submitting || checkoutBlockedByTax}
                      className="flex items-center justify-center gap-1 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
                    >
                      <CreditCard className="h-4 w-4" /> Card
                    </button>
                  </div>
                  {taxBlockingMessage && (
                    <p className="text-xs text-amber-400">{taxBlockingMessage}</p>
                  )}
                  {insufficientCashTendered && (
                    <p className="text-xs text-amber-400">Cash tendered must cover total due.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {drawerMovements.length > 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <h3 className="mb-2 text-sm font-semibold text-stone-200">Recent Drawer Movements</h3>
          <div className="space-y-1">
            {drawerMovements.slice(0, 8).map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between text-xs text-stone-400"
              >
                <span className="capitalize">
                  {String(movement.movement_type).replace('_', ' ')}
                </span>
                <span className={movement.amount_cents >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatCurrency(movement.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-950 px-4 py-2 text-sm text-red-300">{error}</div>}

      {queuedCount > 0 && (
        <p className="text-xs text-yellow-500">
          {queuedCount} checkout(s) queued offline and will retry automatically
        </p>
      )}

      {lastSale && (
        <div className="rounded-lg border border-emerald-700 bg-emerald-900/20 px-4 py-3">
          <p className="text-sm font-medium text-emerald-400">
            Sale {lastSale.saleNumber} complete
          </p>
          <p className="text-xs text-stone-300">
            Total {formatCurrency(lastSale.totalCents)}
            {lastSale.changeDueCents > 0
              ? ` · Change due ${formatCurrency(lastSale.changeDueCents)}`
              : ''}
          </p>
        </div>
      )}

      {customizingProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-4">
            <h3 className="text-lg font-semibold text-stone-100">
              Customize {customizingProduct.name}
            </h3>
            <div className="mt-3 space-y-3">
              {(customizingProduct.modifiers || []).map((modifier) => (
                <div key={modifier.name} className="space-y-1">
                  <p className="text-sm font-medium text-stone-300">{modifier.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {(modifier.options || []).map((option) => (
                      <button
                        key={`${modifier.name}:${option.label}`}
                        onClick={() =>
                          setModifierSelections((prev) => ({
                            ...prev,
                            [modifier.name]: option.label,
                          }))
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-xs ${
                          modifierSelections[modifier.name] === option.label
                            ? 'bg-brand-500 text-white'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {option.label}
                        {option.price_delta_cents !== 0 &&
                          ` (${option.price_delta_cents > 0 ? '+' : ''}${formatCurrency(option.price_delta_cents)})`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmCustomizer}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-400"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stone-700 bg-stone-900 p-4">
            <h3 className="text-lg font-semibold capitalize text-stone-100">
              {drawerAction.replace('_', ' ')}
            </h3>
            <div className="mt-3 space-y-2">
              {drawerAction !== 'no_sale' && (
                <div>
                  <label className="mb-1 block text-xs text-stone-400">Amount ($)</label>
                  <input
                    value={drawerAmount}
                    onChange={(e) => setDrawerAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-stone-400">
                  {drawerAction === 'no_sale' ? 'Notes (required)' : 'Notes (optional)'}
                </label>
                <input
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
                  placeholder={drawerAction === 'no_sale' ? 'Reason for drawer open' : 'Reason'}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDrawerAction(null)
                  setDrawerAmount('')
                  setDrawerNotes('')
                }}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={submitDrawerAction}
                disabled={submitting}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
