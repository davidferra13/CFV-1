'use client'

// Packing List
// Shows what equipment the chef needs to bring for an event based on
// the gap between the client's kitchen inventory and the chef's own equipment.
// Includes a checklist for tracking what's been packed.

import { useState, useTransition, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Package } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  generatePackingList,
  type PackingListItem,
  type KitchenCategory,
} from '@/lib/clients/kitchen-inventory-actions'

// ─── Props ───────────────────────────────────────────────────────────────────

interface PackingListProps {
  eventId: string
  clientId: string
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<KitchenCategory, { label: string; emoji: string }> = {
  cookware: { label: 'Cookware', emoji: '🍳' },
  appliance: { label: 'Appliances', emoji: '🔌' },
  utensil: { label: 'Utensils', emoji: '🔪' },
  storage: { label: 'Storage', emoji: '📦' },
  servingware: { label: 'Servingware', emoji: '🍽️' },
  other: { label: 'Other', emoji: '📋' },
}

const CATEGORY_ORDER: KitchenCategory[] = [
  'cookware',
  'appliance',
  'utensil',
  'storage',
  'servingware',
  'other',
]

const REASON_LABELS: Record<string, string> = {
  client_missing: 'Client does not have',
  client_poor_condition: 'Client has (poor condition)',
  client_insufficient_qty: 'Client has insufficient quantity',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PackingList({ eventId, clientId }: PackingListProps) {
  const [items, setItems] = useState<PackingListItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load packing list
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await generatePackingList(clientId)
        if (!cancelled) {
          setItems(data)
          setError(null)
          // Restore checked state from localStorage
          const stored = localStorage.getItem(`packing-list-${eventId}`)
          if (stored) {
            try {
              setChecked(new Set(JSON.parse(stored)))
            } catch {
              /* ignore bad data */
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError('Could not generate packing list')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientId, eventId])

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      // Persist to localStorage
      localStorage.setItem(`packing-list-${eventId}`, JSON.stringify([...next]))
      return next
    })
  }

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<KitchenCategory, PackingListItem[]>>(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.category === cat)
      return acc
    },
    {} as Record<KitchenCategory, PackingListItem[]>
  )

  const totalItems = items.length
  const checkedCount = checked.size
  const allChecked = totalItems > 0 && checkedCount >= totalItems

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Generating packing list...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Packing List
        </CardTitle>
        {totalItems > 0 && (
          <div className="flex items-center gap-2">
            {allChecked ? (
              <Badge variant="success">All packed</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {checkedCount}/{totalItems} packed
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Empty state */}
        {totalItems === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500 opacity-70" />
            <p>Nothing extra to bring.</p>
            <p className="mt-1">
              The client's kitchen has everything you need, or no kitchen inventory has been
              recorded yet.
            </p>
          </div>
        )}

        {/* Grouped checklist */}
        {CATEGORY_ORDER.map((cat) => {
          const catItems = grouped[cat]
          if (catItems.length === 0) return null

          return (
            <div key={cat}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
              </h4>
              <div className="space-y-1">
                {catItems.map((item, idx) => {
                  const key = `${item.category}::${item.item_name}::${idx}`
                  const isChecked = checked.has(key)

                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                        isChecked ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(key)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={isChecked ? 'line-through' : 'font-medium'}>
                            {item.item_name}
                          </span>
                          {item.needed_quantity > 1 && (
                            <span className="text-xs text-muted-foreground">
                              x{item.needed_quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.chef_has && (
                            <Badge variant="warning">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Need to source
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {REASON_LABELS[item.reason] ?? item.reason}
                          </span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Items the chef needs to source externally */}
        {items.some((i) => !i.chef_has) && (
          <div className="rounded-md border border-yellow-600/30 bg-yellow-950/20 p-3">
            <p className="text-sm font-medium text-yellow-500">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              Some items need to be sourced
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Items marked "Need to source" are not in your equipment list. You may need to rent,
              buy, or borrow them.
            </p>
          </div>
        )}

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="border-t pt-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Packing progress</span>
              <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(checkedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
