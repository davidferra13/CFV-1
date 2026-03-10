'use client'

import { useState, useTransition } from 'react'
import {
  createBakeryOrder,
  type CreateOrderInput,
  type FlavorLayer,
} from '@/lib/bakery/order-actions'
import { useRouter } from 'next/navigation'

const ORDER_TYPES = ['cake', 'cupcakes', 'pastry', 'bread', 'cookies', 'custom'] as const
const CAKE_SIZES = ['6 inch', '8 inch', '10 inch', '12 inch', 'sheet', 'tiered'] as const
const FROSTING_TYPES = [
  'buttercream',
  'fondant',
  'ganache',
  'cream_cheese',
  'whipped',
  'naked',
] as const
const DIETARY_OPTIONS = [
  'gluten_free',
  'vegan',
  'nut_free',
  'dairy_free',
  'sugar_free',
  'keto',
] as const
const CAKE_FLAVORS = [
  'vanilla',
  'chocolate',
  'red velvet',
  'lemon',
  'carrot',
  'marble',
  'funfetti',
  'strawberry',
  'coconut',
  'banana',
]
const FILLING_OPTIONS = [
  'none',
  'raspberry',
  'strawberry',
  'lemon curd',
  'chocolate ganache',
  'cream cheese',
  'bavarian cream',
  'caramel',
  'peanut butter',
  'cookie butter',
]

function formatDietaryLabel(d: string) {
  return d.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  clients?: { id: string; full_name: string }[]
}

export function CakeOrderForm({ clients = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<CreateOrderInput['order_type']>('cake')
  const [size, setSize] = useState<string>('')
  const [servings, setServings] = useState<number | ''>('')
  const [layers, setLayers] = useState<number>(1)
  const [flavors, setFlavors] = useState<FlavorLayer[]>([
    { layer: 1, cake_flavor: 'vanilla', filling: 'none' },
  ])
  const [frostingType, setFrostingType] = useState<string>('')
  const [designNotes, setDesignNotes] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [colorInput, setColorInput] = useState('')
  const [dietary, setDietary] = useState<string[]>([])
  const [inscription, setInscription] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [deliveryRequested, setDeliveryRequested] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [priceDollars, setPriceDollars] = useState('')
  const [depositDollars, setDepositDollars] = useState('')
  const [notes, setNotes] = useState('')

  const showSizeLayers = orderType === 'cake' || orderType === 'custom'
  const showFlavors = orderType === 'cake' || orderType === 'cupcakes' || orderType === 'custom'
  const showFrosting = orderType === 'cake' || orderType === 'cupcakes' || orderType === 'custom'

  function handleLayerChange(count: number) {
    setLayers(count)
    const newFlavors: FlavorLayer[] = []
    for (let i = 1; i <= count; i++) {
      const existing = flavors.find((f) => f.layer === i)
      newFlavors.push(existing ?? { layer: i, cake_flavor: 'vanilla', filling: 'none' })
    }
    setFlavors(newFlavors)
  }

  function updateFlavor(layer: number, field: 'cake_flavor' | 'filling', value: string) {
    setFlavors((prev) => prev.map((f) => (f.layer === layer ? { ...f, [field]: value } : f)))
  }

  function addColor() {
    const trimmed = colorInput.trim()
    if (trimmed && !colors.includes(trimmed)) {
      setColors([...colors, trimmed])
      setColorInput('')
    }
  }

  function removeColor(c: string) {
    setColors(colors.filter((x) => x !== c))
  }

  function toggleDietary(d: string) {
    setDietary((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function handleClientSelect(id: string) {
    setClientId(id || null)
    if (id) {
      const client = clients.find((c) => c.id === id)
      if (client) setCustomerName(client.full_name)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }
    if (!pickupDate) {
      setError('Pickup date is required')
      return
    }

    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100)
    const depositCents = Math.round(parseFloat(depositDollars || '0') * 100)

    const input: CreateOrderInput = {
      client_id: clientId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      customer_email: customerEmail.trim() || null,
      order_type: orderType,
      size: showSizeLayers && size ? size : null,
      servings: servings ? Number(servings) : null,
      layers: showSizeLayers ? layers : null,
      flavors: showFlavors ? flavors : null,
      frosting_type:
        showFrosting && frostingType ? (frostingType as CreateOrderInput['frosting_type']) : null,
      design_notes: designNotes.trim() || null,
      design_image_url: null,
      colors: colors.length > 0 ? colors : null,
      dietary: dietary.length > 0 ? dietary : null,
      inscription: inscription.trim() || null,
      pickup_date: pickupDate,
      pickup_time: pickupTime || null,
      delivery_requested: deliveryRequested,
      delivery_address: deliveryRequested ? deliveryAddress.trim() || null : null,
      price_cents: priceCents,
      deposit_cents: depositCents,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      try {
        await createBakeryOrder(input)
        setSuccess(true)
        router.push('/bakery/orders')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create order')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-700 p-4 text-emerald-300">
          Order created successfully!
        </div>
      )}

      {/* Customer Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Customer Info
        </h2>

        {clients.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">
              Link to existing client
            </label>
            <select
              value={clientId ?? ''}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            >
              <option value="">New customer</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
        </div>
      </section>

      {/* Order Type */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          What are we making?
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
                orderType === t
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Size / Servings / Layers (conditional) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Size and Servings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {showSizeLayers && (
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
              >
                <option value="">Select size</option>
                {CAKE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">
              {orderType === 'cookies' ? 'Quantity' : 'Servings'}
            </label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
          {showSizeLayers && (
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Layers</label>
              <input
                type="number"
                min={1}
                max={6}
                value={layers}
                onChange={(e) => handleLayerChange(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
              />
            </div>
          )}
        </div>
      </section>

      {/* Flavor Builder */}
      {showFlavors && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
            Flavors
          </h2>
          {flavors.map((f) => (
            <div key={f.layer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="text-sm text-stone-400 font-medium sm:pt-6">Layer {f.layer}</div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Cake Flavor</label>
                <select
                  value={f.cake_flavor}
                  onChange={(e) => updateFlavor(f.layer, 'cake_flavor', e.target.value)}
                  className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
                >
                  {CAKE_FLAVORS.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Filling</label>
                <select
                  value={f.filling}
                  onChange={(e) => updateFlavor(f.layer, 'filling', e.target.value)}
                  className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
                >
                  {FILLING_OPTIONS.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Frosting */}
      {showFrosting && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
            Frosting
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {FROSTING_TYPES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrostingType(f)}
                className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
                  frostingType === f
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Design */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Design and Decoration
        </h2>
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Design Notes</label>
          <textarea
            value={designNotes}
            onChange={(e) => setDesignNotes(e.target.value)}
            rows={3}
            placeholder="Describe the look, theme, decorations..."
            className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Colors</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {colors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-stone-700 px-3 py-1 text-sm text-stone-200"
              >
                {c}
                <button
                  type="button"
                  onClick={() => removeColor(c)}
                  className="text-stone-400 hover:text-red-400"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addColor()
                }
              }}
              placeholder="Add a color"
              className="flex-1 rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
            <button
              type="button"
              onClick={addColor}
              className="rounded-lg bg-stone-700 px-4 py-2 text-stone-300 hover:bg-stone-600"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Inscription</label>
          <input
            type="text"
            value={inscription}
            onChange={(e) => setInscription(e.target.value)}
            placeholder='e.g. "Happy Birthday Sarah!"'
            className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
          />
        </div>
      </section>

      {/* Dietary */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Dietary Restrictions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DIETARY_OPTIONS.map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dietary.includes(d)}
                onChange={() => toggleDietary(d)}
                className="rounded border-stone-600 bg-stone-800 text-amber-600"
              />
              <span className="text-sm text-stone-300">{formatDietaryLabel(d)}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Pickup / Delivery */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Pickup / Delivery
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Pickup Date *</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Pickup Time</label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deliveryRequested}
            onChange={(e) => setDeliveryRequested(e.target.checked)}
            className="rounded border-stone-600 bg-stone-800 text-amber-600"
          />
          <span className="text-sm text-stone-300">Delivery requested</span>
        </label>

        {deliveryRequested && (
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">
              Delivery Address
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
        )}
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">
              Quote Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">
              Deposit Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={depositDollars}
              onChange={(e) => setDepositDollars(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
            />
          </div>
        </div>
        {priceDollars && depositDollars && (
          <p className="text-sm text-stone-400">
            Balance due after deposit:{' '}
            {formatCents(
              Math.round(parseFloat(priceDollars || '0') * 100) -
                Math.round(parseFloat(depositDollars || '0') * 100)
            )}
          </p>
        )}
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-200 border-b border-stone-700 pb-2">
          Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes..."
          className="w-full rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-2"
        />
      </section>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? 'Creating...' : 'Create Order'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/bakery/orders')}
          className="rounded-lg bg-stone-700 px-6 py-3 font-semibold text-stone-300 hover:bg-stone-600 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
