'use client'

import { useState, useTransition, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Archive,
  Eye,
} from 'lucide-react'
import type { EquipmentItem, EquipmentCategory, EquipmentStatus } from '@/lib/equipment/types'
import {
  changeEquipmentStatus,
  updateEquipmentQuantity,
  confirmInferredItem,
  dismissInferredItem,
} from '@/lib/equipment/intelligence-actions'
import { EquipmentAddModal } from './equipment-add-modal'
import { EquipmentDetailPanel } from './equipment-detail-panel'

const STATUS_CONFIG: Record<
  EquipmentStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  active: { label: 'Active', variant: 'success' },
  stored: { label: 'Stored', variant: 'default' },
  broken: { label: 'Broken', variant: 'error' },
  needs_replacement: { label: 'Needs Replacement', variant: 'warning' },
  borrowed: { label: 'Borrowed', variant: 'info' },
  lent_out: { label: 'Lent Out', variant: 'info' },
  retired: { label: 'Retired', variant: 'default' },
  missing: { label: 'Missing', variant: 'error' },
}

const CATEGORY_LABELS: Record<string, string> = {
  cookware: 'Cookware',
  knives: 'Knives',
  smallwares: 'Smallwares',
  appliances: 'Appliances',
  serving: 'Serving',
  transport: 'Transport',
  linen: 'Linens',
  other: 'Other',
}

interface Props {
  initialItems: EquipmentItem[]
  categories: EquipmentCategory[]
  summary: {
    active_count: number
    stored_count: number
    needs_attention: number
    loaned: number
    unconfirmed_inferences: number
    total: number
  }
}

export function EquipmentHubClient({ initialItems, categories, summary }: Props) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.canonical_name?.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter)
    }
    if (statusFilter) {
      result = result.filter((i) => i.status === statusFilter)
    }
    return result
  }, [items, search, categoryFilter, statusFilter])

  // Group by category for grid view
  const grouped = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>()
    for (const item of filtered) {
      const cat = item.category || 'other'
      const existing = map.get(cat) ?? []
      existing.push(item)
      map.set(cat, existing)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  async function handleStatusChange(id: string, newStatus: EquipmentStatus) {
    startTransition(async () => {
      try {
        await changeEquipmentStatus(id, newStatus)
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)))
      } catch (err) {
        console.error('[equipment] Status change failed', err)
      }
    })
  }

  async function handleQuantityChange(id: string, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const newQty = Math.max(1, (item.quantity_owned ?? 1) + delta)
    startTransition(async () => {
      try {
        await updateEquipmentQuantity(id, newQty)
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity_owned: newQty } : i)))
      } catch (err) {
        console.error('[equipment] Quantity update failed', err)
      }
    })
  }

  async function handleConfirmInferred(id: string) {
    startTransition(async () => {
      try {
        await confirmInferredItem(id)
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, item_source: 'manual' as const, confirmed_at: new Date().toISOString() }
              : i
          )
        )
      } catch (err) {
        console.error('[equipment] Confirm failed', err)
      }
    })
  }

  async function handleDismissInferred(id: string) {
    startTransition(async () => {
      try {
        await dismissInferredItem(id)
        setItems((prev) => prev.filter((i) => i.id !== id))
      } catch (err) {
        console.error('[equipment] Dismiss failed', err)
      }
    })
  }

  const categoryChips = Object.entries(CATEGORY_LABELS)

  return (
    <>
      {/* Summary bar */}
      {summary.total > 0 && (
        <div className="flex gap-4 mb-6 flex-wrap text-sm">
          <span className="text-stone-400">
            <span className="text-stone-100 font-medium">{summary.active_count}</span> active
          </span>
          {summary.stored_count > 0 && (
            <span className="text-stone-400">
              <span className="text-stone-100 font-medium">{summary.stored_count}</span> stored
            </span>
          )}
          {summary.needs_attention > 0 && (
            <span className="text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              {summary.needs_attention} need attention
            </span>
          )}
          {summary.loaned > 0 && <span className="text-stone-400">{summary.loaned} loaned</span>}
          {summary.unconfirmed_inferences > 0 && (
            <span className="text-brand-400">{summary.unconfirmed_inferences} inferred</span>
          )}
        </div>
      )}

      {/* Top bar: search, filters, view toggle, add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-stone-700 text-stone-500'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border ${viewMode === 'list' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-stone-700 text-stone-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            categoryFilter === null
              ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          All
        </button>
        {categoryChips.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              categoryFilter === key
                ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-stone-300 font-medium mb-2">
            {items.length === 0 ? 'No equipment yet' : 'No matches'}
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            {items.length === 0
              ? 'Add your first piece of equipment to start tracking your kit.'
              : 'Try a different search or filter.'}
          </p>
          {items.length === 0 && (
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Equipment
            </Button>
          )}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat} ({catItems.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    onStatusChange={handleStatusChange}
                    onQuantityChange={handleQuantityChange}
                    onConfirm={handleConfirmInferred}
                    onDismiss={handleDismissInferred}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="border border-stone-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900/50">
                <th className="text-left px-4 py-2 text-stone-400 font-medium">Name</th>
                <th className="text-left px-4 py-2 text-stone-400 font-medium hidden sm:table-cell">
                  Category
                </th>
                <th className="text-center px-4 py-2 text-stone-400 font-medium">Qty</th>
                <th className="text-left px-4 py-2 text-stone-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="border-b border-stone-800/50 hover:bg-stone-800/30 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-100">{item.name}</span>
                      {item.item_source === 'inferred' && !item.confirmed_at && (
                        <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                          (inferred)
                        </span>
                      )}
                      {item.brand && <span className="text-stone-500 text-xs">{item.brand}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-400 hidden sm:table-cell">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </td>
                  <td className="px-4 py-3 text-center text-stone-300">
                    {item.quantity_owned ?? 1}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_CONFIG[item.status]?.variant ?? 'default'}>
                      {STATUS_CONFIG[item.status]?.label ?? item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <EquipmentAddModal
          onClose={() => setShowAddModal(false)}
          onAdded={(newItem) => {
            setItems((prev) => [...prev, newItem])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <EquipmentDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onStatusChange={handleStatusChange}
          onQuantityChange={handleQuantityChange}
          onConfirm={handleConfirmInferred}
          onDismiss={handleDismissInferred}
        />
      )}
    </>
  )
}

// ============================================
// EQUIPMENT CARD
// ============================================

function EquipmentCard({
  item,
  onClick,
  onStatusChange,
  onQuantityChange,
  onConfirm,
  onDismiss,
  isPending,
}: {
  item: EquipmentItem
  onClick: () => void
  onStatusChange: (id: string, status: EquipmentStatus) => void
  onQuantityChange: (id: string, delta: number) => void
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
  isPending: boolean
}) {
  const isInferred = item.item_source === 'inferred' && !item.confirmed_at
  const statusConf = STATUS_CONFIG[item.status]

  return (
    <Card
      className={`p-4 cursor-pointer hover:border-stone-600 transition group ${
        isInferred ? 'border-brand-800/50 border-dashed' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-stone-100 font-medium truncate">{item.name}</h3>
            {isInferred && (
              <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded shrink-0">
                inferred
              </span>
            )}
          </div>
          {(item.brand || item.size_label) && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">
              {[item.brand, item.size_label].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
        <Badge variant={statusConf?.variant ?? 'default'} className="shrink-0">
          {statusConf?.label ?? item.status}
        </Badge>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuantityChange(item.id, -1)
            }}
            disabled={isPending || (item.quantity_owned ?? 1) <= 1}
            className="w-6 h-6 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-30 text-xs flex items-center justify-center"
          >
            -
          </button>
          <span className="text-sm text-stone-300 w-8 text-center">{item.quantity_owned ?? 1}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuantityChange(item.id, 1)
            }}
            disabled={isPending}
            className="w-6 h-6 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 text-xs flex items-center justify-center"
          >
            +
          </button>
        </div>

        {/* Inferred item actions */}
        {isInferred && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onConfirm(item.id)}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition"
            >
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Confirm
            </button>
            <button
              onClick={() => onDismiss(item.id)}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 transition"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
