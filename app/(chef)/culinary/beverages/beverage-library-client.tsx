'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BeverageForm } from '@/components/beverages/beverage-form'
import { deleteBeverage } from '@/lib/beverages/actions'
import type { Beverage, BeverageType } from '@/lib/beverages/actions'
import { formatCurrency } from '@/lib/utils/currency'

const TABS: { key: BeverageType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wine', label: 'Wine' },
  { key: 'cocktail', label: 'Cocktails' },
  { key: 'mocktail', label: 'Mocktails' },
  { key: 'beer', label: 'Beer' },
  { key: 'spirit', label: 'Spirits' },
  { key: 'non-alcoholic', label: 'Non-Alcoholic' },
]

const TYPE_BADGE_VARIANT: Record<BeverageType, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  wine: 'error',
  cocktail: 'warning',
  mocktail: 'success',
  beer: 'warning',
  spirit: 'info',
  'non-alcoholic': 'default',
}

type Props = {
  initialBeverages: Beverage[]
}

export function BeverageLibraryClient({ initialBeverages }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<BeverageType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingBeverage, setEditingBeverage] = useState<Beverage | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const beverages = initialBeverages

  // Filter
  const filtered = beverages.filter((b) => {
    if (activeTab !== 'all' && b.type !== activeTab) return false
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleFormComplete() {
    setShowForm(false)
    setEditingBeverage(null)
    router.refresh()
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleteError(null)

    startTransition(async () => {
      try {
        await deleteBeverage(id)
        router.refresh()
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  function computeMargin(b: Beverage): string {
    const cost = b.cost_cents
    const sell = b.sell_price_cents ?? (cost != null ? Math.round(cost * (b.markup_percent ?? 200) / 100) : null)
    if (cost == null || sell == null || cost === 0) return 'N/A'
    const margin = ((sell - cost) / sell) * 100
    return `${margin.toFixed(0)}%`
  }

  function computeSellPrice(b: Beverage): number | null {
    if (b.sell_price_cents != null) return b.sell_price_cents
    if (b.cost_cents != null) return Math.round(b.cost_cents * (b.markup_percent ?? 200) / 100)
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">Beverage Library</h1>
            <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
              {beverages.length}
            </span>
          </div>
          <Button
            onClick={() => {
              setEditingBeverage(null)
              setShowForm(true)
            }}
          >
            Add Beverage
          </Button>
        </div>
        <p className="text-stone-500 mt-1">Wine, cocktails, and beverage pairings for your events</p>
      </div>

      {/* Form (add/edit) */}
      {(showForm || editingBeverage) && (
        <Card>
          <CardContent className="py-5">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              {editingBeverage ? `Edit: ${editingBeverage.name}` : 'New Beverage'}
            </h2>
            <BeverageForm
              beverage={editingBeverage ?? undefined}
              onComplete={handleFormComplete}
              onCancel={() => {
                setShowForm(false)
                setEditingBeverage(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {deleteError}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto w-full sm:w-64">
          <Input
            placeholder="Search beverages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">
            {beverages.length === 0 ? 'No beverages yet' : 'No beverages match your filters'}
          </p>
          <p className="text-stone-400 text-sm mb-4">
            {beverages.length === 0
              ? 'Build your beverage library to pair wines and cocktails with your menus'
              : 'Try adjusting your search or switching tabs'}
          </p>
          {beverages.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Add First Beverage
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const sellPrice = computeSellPrice(b)
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-4 space-y-3">
                  {/* Top row: name + type */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900 truncate">{b.name}</h3>
                      {b.subtype && (
                        <p className="text-xs text-stone-400 capitalize">{b.subtype}</p>
                      )}
                    </div>
                    <Badge variant={TYPE_BADGE_VARIANT[b.type]}>
                      {b.type}
                    </Badge>
                  </div>

                  {/* Wine details */}
                  {b.type === 'wine' && (b.region || b.vintage) && (
                    <p className="text-xs text-stone-500">
                      {[b.vintage, b.region].filter(Boolean).join(' - ')}
                    </p>
                  )}

                  {/* Description */}
                  {b.description && (
                    <p className="text-sm text-stone-500 line-clamp-2">{b.description}</p>
                  )}

                  {/* Pricing */}
                  <div className="flex items-center gap-4 text-sm">
                    {b.cost_cents != null && (
                      <div>
                        <span className="text-stone-400">Cost:</span>{' '}
                        <span className="font-medium text-stone-700">{formatCurrency(b.cost_cents)}</span>
                      </div>
                    )}
                    {sellPrice != null && (
                      <div>
                        <span className="text-stone-400">Sell:</span>{' '}
                        <span className="font-medium text-green-700">{formatCurrency(sellPrice)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-400">Margin:</span>{' '}
                      <span className="font-medium text-stone-700">{computeMargin(b)}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {b.tags && b.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-stone-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingBeverage(b)
                        setShowForm(false)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(b.id, b.name)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
