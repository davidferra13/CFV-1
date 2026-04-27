'use client'

/**
 * PriceWatchList - Manage ingredient price alerts.
 * Add ingredients with target prices; get alerted when prices drop below.
 */

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getPriceWatchList,
  addPriceWatch,
  removePriceWatch,
  checkPriceWatchAlerts,
  type PriceWatch,
  type PriceWatchAlert,
} from '@/lib/openclaw/price-watch-actions'

export function PriceWatchList() {
  const [watches, setWatches] = useState<PriceWatch[]>([])
  const [alerts, setAlerts] = useState<PriceWatchAlert[]>([])
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUnit, setNewUnit] = useState('lb')
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const [watchData, alertData] = await Promise.all([
          getPriceWatchList(),
          checkPriceWatchAlerts(),
        ])
        setWatches(watchData)
        setAlerts(alertData)
      } catch {
        // Non-critical widget: fail silently, show empty state
      }
    })
  }, [])

  const handleAdd = () => {
    setAddError(null)
    const cents = Math.round(parseFloat(newPrice) * 100)
    if (!newName.trim() || isNaN(cents) || cents <= 0) {
      setAddError('Enter a valid ingredient name and price')
      return
    }

    startTransition(async () => {
      try {
        const result = await addPriceWatch({
          ingredientName: newName.trim(),
          targetPriceCents: cents,
          priceUnit: newUnit,
        })
        if (result.success) {
          setNewName('')
          setNewPrice('')
          setShowAdd(false)
          const updated = await getPriceWatchList()
          setWatches(updated)
        } else {
          setAddError(result.error || 'Failed to add')
        }
      } catch {
        toast.error('Something went wrong')
      }
    })
  }

  const handleRemove = (watchId: string) => {
    const previous = watches
    setWatches((prev) => prev.filter((w) => w.id !== watchId))
    startTransition(async () => {
      try {
        await removePriceWatch(watchId)
      } catch {
        setWatches(previous)
        setAddError('Failed to remove watch')
      }
    })
  }

  // Map alerts by ingredient name for easy lookup
  const alertMap = new Map(alerts.map((a) => [a.ingredientName.toLowerCase(), a]))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Price Watch List</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              Get alerted when ingredients hit your target price
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : '+ Add Watch'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add form */}
        {showAdd && (
          <div className="p-3 rounded-lg border border-stone-700 bg-stone-900/50 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ingredient name (e.g. salmon)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 text-sm bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-200 placeholder:text-stone-600"
              />
              <div className="flex items-center gap-1">
                <span className="text-stone-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-20 text-sm bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-stone-200 placeholder:text-stone-600"
                />
                <span className="text-stone-500 text-sm">/</span>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="text-sm bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-stone-300"
                >
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="each">each</option>
                  <option value="dozen">dozen</option>
                  <option value="gallon">gallon</option>
                  <option value="bunch">bunch</option>
                </select>
              </div>
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                Add
              </Button>
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
          </div>
        )}

        {/* Active alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-emerald-400">
              Price targets hit ({alerts.length})
            </p>
            {alerts.map((alert) => (
              <div
                key={alert.watchId}
                className="flex items-center justify-between text-sm p-2 rounded bg-emerald-950/30 border border-emerald-800/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-xs">{'\u2193'}</span>
                  <span className="text-stone-200">{alert.ingredientName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 font-medium">
                    {formatCurrency(alert.currentPriceCents)}/{alert.priceUnit}
                  </span>
                  <span className="text-stone-500">
                    target: {formatCurrency(alert.targetPriceCents)}
                  </span>
                  <span className="text-stone-500">{alert.store}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Watch list */}
        {watches.length > 0 ? (
          <div className="space-y-1">
            {watches.map((watch) => {
              const alert = alertMap.get(watch.ingredientName.toLowerCase())
              return (
                <div key={watch.id} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    {alert ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-stone-700" />
                    )}
                    <span className="text-stone-300">{watch.ingredientName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-500">
                      target: {formatCurrency(watch.targetPriceCents)}/{watch.priceUnit}
                    </span>
                    <button
                      onClick={() => handleRemove(watch.id)}
                      className="text-xs text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isPending}
                    >
                      remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          !showAdd && (
            <p className="text-sm text-stone-500 text-center py-2">
              No price watches yet. Add ingredients you buy regularly.
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}
