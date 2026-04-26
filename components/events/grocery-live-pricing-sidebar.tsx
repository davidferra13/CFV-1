'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatCurrency } from '@/lib/utils/currency'
import { hasPricingCoverage } from '@/lib/pricing/coverage-check'
import { useFormatContext } from '@/lib/hooks/use-format-context'
import {
  previewManualGroceryPricing,
  type ManualGroceryDraftItemInput,
  type ManualGroceryDraftPriceResult,
} from '@/lib/grocery/pricing-actions'

type DraftRow = {
  id: string
  name: string
  quantity: string
  unit: string
  category: string
}

const CATEGORY_OPTIONS = [
  'other',
  'protein',
  'produce',
  'dairy',
  'pantry',
  'spice',
  'oil',
  'baking',
  'frozen',
  'canned',
  'fresh_herb',
  'dry_herb',
  'condiment',
  'beverage',
  'specialty',
]

function createDraftRow(): DraftRow {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: '',
    quantity: '1',
    unit: 'each',
    category: 'other',
  }
}

function normalizeRows(rows: DraftRow[]): ManualGroceryDraftItemInput[] {
  const normalized: ManualGroceryDraftItemInput[] = []

  for (const row of rows) {
    const name = row.name.trim()
    if (!name) continue

    const parsedQty = Number.parseFloat(row.quantity)
    const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1
    const unit = row.unit.trim() || 'each'
    const category = row.category.trim() || 'other'

    normalized.push({
      name,
      quantity,
      unit,
      category,
    })
  }

  return normalized
}

type Props = {
  eventId: string
}

export function GroceryLivePricingSidebar({ eventId }: Props) {
  const fmtCtx = useFormatContext()
  const [rows, setRows] = useState<DraftRow[]>([createDraftRow()])
  const [result, setResult] = useState<ManualGroceryDraftPriceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const requestIdRef = useRef(0)

  const debouncedRows = useDebounce(rows, 750)
  const debouncedItems = useMemo(() => normalizeRows(debouncedRows), [debouncedRows])
  const currentItems = useMemo(() => normalizeRows(rows), [rows])

  function addRow() {
    setRows((prev) => [...prev, createDraftRow()])
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId)
      return next.length > 0 ? next : [createDraftRow()]
    })
  }

  function updateRow(rowId: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  function runEstimate(items: ManualGroceryDraftItemInput[]) {
    if (items.length === 0) {
      setResult(null)
      setError(null)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setError(null)

    startTransition(async () => {
      try {
        const next = await previewManualGroceryPricing(items)
        if (requestIdRef.current !== requestId) return
        setResult(next)
      } catch {
        if (requestIdRef.current !== requestId) return
        setError('Live pricing failed. Check API keys, then try refresh.')
      }
    })
  }

  useEffect(() => {
    runEstimate(debouncedItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedItems])

  const hasRowsWithNames = currentItems.length > 0
  const pricedCount = result?.pricedItemCount ?? 0
  const requestedCount = result?.requestedItemCount ?? 0

  if (!hasPricingCoverage(fmtCtx.currency)) {
    return (
      <aside className="space-y-4 xl:sticky xl:top-24 self-start">
        <Card className="p-4">
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-6 text-center">
            <p className="text-sm text-stone-400">
              Automated pricing is available for USD regions. Enter your ingredient costs manually
              on each recipe.
            </p>
          </div>
        </Card>
      </aside>
    )
  }

  return (
    <aside className="space-y-4 xl:sticky xl:top-24 self-start">
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Live Pricing Sidebar</h3>
          <p className="mt-1 text-xs text-stone-400">
            Manual mode for scratch lists. Add items and watch estimated spend update automatically.
          </p>
          <p className="mt-1 text-xs-tight text-stone-500">Event: {eventId.slice(0, 8)}...</p>
        </div>

        <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-md border border-stone-700 bg-stone-900 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-stone-300">Item {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Remove
                </button>
              </div>
              <Input
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                placeholder="Ingredient name"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                  placeholder="Qty"
                />
                <Input
                  value={row.unit}
                  onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  placeholder="Unit"
                />
                <select
                  value={row.category}
                  onChange={(e) => updateRow(row.id, { category: e.target.value })}
                  className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={addRow}>
            Add Item
          </Button>
          <Button
            variant="ghost"
            onClick={() => runEstimate(currentItems)}
            disabled={!hasRowsWithNames || isPending}
          >
            {isPending ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-950 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-md border border-stone-700 bg-stone-900 p-3">
          <p className="text-xs text-stone-400">Running Estimate</p>
          <p className="mt-1 text-xl font-bold text-stone-100">
            {formatCurrency(result?.averageTotalCents ?? 0)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Coverage: {pricedCount}/{requestedCount} items priced
          </p>
          <p className="mt-1 text-xs-tight text-stone-500">
            {result?.mealMeConfigured
              ? 'MealMe active: includes local-store pricing where available.'
              : 'MealMe not configured: local-store source is currently unavailable.'}
          </p>
        </div>

        {result && result.items.length > 0 && (
          <div className="rounded-md border border-stone-700 bg-stone-900 p-3 space-y-2">
            <p className="text-xs font-medium text-stone-300">Priced Items</p>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {result.items.map((item, index) => (
                <div
                  key={`${item.name}-${item.unit}-${index}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-stone-300">
                    {item.name} ({item.quantity} {item.unit})
                  </span>
                  <span
                    className={`font-medium ${item.averageCents === null ? 'text-amber-500' : 'text-stone-100'}`}
                  >
                    {item.averageCents === null ? 'No data' : formatCurrency(item.averageCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </aside>
  )
}
