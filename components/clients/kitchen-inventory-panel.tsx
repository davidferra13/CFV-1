'use client'

// Kitchen Inventory Panel
// Displays and manages a client's kitchen equipment inventory.
// Grouped by category with condition indicators and template support.

import { useState, useTransition, useEffect } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Edit2, Package } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getClientKitchenInventory,
  addKitchenItem,
  updateKitchenItem,
  deleteKitchenItem,
  applyKitchenTemplate,
  type KitchenItem,
  type KitchenCategory,
  type KitchenCondition,
} from '@/lib/clients/kitchen-inventory-actions'

// ─── Props ───────────────────────────────────────────────────────────────────

interface KitchenInventoryPanelProps {
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

const CONDITION_CONFIG: Record<
  KitchenCondition,
  { label: string; color: string; badge: 'success' | 'warning' | 'error' | 'default' }
> = {
  good: { label: 'Good', color: 'text-green-500', badge: 'success' },
  fair: { label: 'Fair', color: 'text-yellow-500', badge: 'warning' },
  poor: { label: 'Poor', color: 'text-red-500', badge: 'error' },
  missing: { label: 'Missing', color: 'text-gray-400', badge: 'default' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function KitchenInventoryPanel({ clientId }: KitchenInventoryPanelProps) {
  const [items, setItems] = useState<KitchenItem[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState<KitchenCategory>('cookware')
  const [formName, setFormName] = useState('')
  const [formQuantity, setFormQuantity] = useState(1)
  const [formCondition, setFormCondition] = useState<KitchenCondition>('good')
  const [formNotes, setFormNotes] = useState('')

  // Load data
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getClientKitchenInventory(clientId)
        if (!cancelled) {
          setItems(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError('Could not load kitchen inventory')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  function resetForm() {
    setFormCategory('cookware')
    setFormName('')
    setFormQuantity(1)
    setFormCondition('good')
    setFormNotes('')
    setShowAddForm(false)
    setEditingId(null)
  }

  function startEdit(item: KitchenItem) {
    setEditingId(item.id)
    setFormCategory(item.category)
    setFormName(item.item_name)
    setFormQuantity(item.quantity)
    setFormCondition(item.condition)
    setFormNotes(item.notes ?? '')
    setShowAddForm(false)
  }

  function handleAdd() {
    if (!formName.trim()) return
    const previous = [...items]
    startTransition(async () => {
      try {
        const newItem = await addKitchenItem(clientId, {
          category: formCategory,
          item_name: formName,
          quantity: formQuantity,
          condition: formCondition,
          notes: formNotes || undefined,
        })
        setItems((prev) =>
          [...prev, newItem].sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category)
            return a.item_name.localeCompare(b.item_name)
          })
        )
        resetForm()
      } catch (err) {
        setItems(previous)
        setError('Failed to add item')
      }
    })
  }

  function handleUpdate(itemId: string) {
    if (!formName.trim()) return
    const previous = [...items]
    startTransition(async () => {
      try {
        await updateKitchenItem(itemId, {
          category: formCategory,
          item_name: formName,
          quantity: formQuantity,
          condition: formCondition,
          notes: formNotes || undefined,
          last_verified_at: new Date().toISOString(),
        })
        setItems((prev) =>
          prev
            .map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    category: formCategory,
                    item_name: formName,
                    quantity: formQuantity,
                    condition: formCondition,
                    notes: formNotes || null,
                    last_verified_at: new Date().toISOString(),
                  }
                : i
            )
            .sort((a, b) => {
              if (a.category !== b.category) return a.category.localeCompare(b.category)
              return a.item_name.localeCompare(b.item_name)
            })
        )
        resetForm()
      } catch (err) {
        setItems(previous)
        setError('Failed to update item')
      }
    })
  }

  function handleDelete(itemId: string) {
    const previous = [...items]
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    startTransition(async () => {
      try {
        await deleteKitchenItem(itemId)
      } catch (err) {
        setItems(previous)
        setError('Failed to delete item')
      }
    })
  }

  function handleApplyTemplate(template: 'basic' | 'well-equipped' | 'minimal') {
    setShowTemplateMenu(false)
    startTransition(async () => {
      try {
        await applyKitchenTemplate(clientId, template)
        const data = await getClientKitchenInventory(clientId)
        setItems(data)
      } catch (err) {
        setError('Failed to apply template')
      }
    })
  }

  // Group items by category
  const grouped = CATEGORY_ORDER.reduce<Record<KitchenCategory, KitchenItem[]>>(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.category === cat)
      return acc
    },
    {} as Record<KitchenCategory, KitchenItem[]>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading kitchen inventory...</span>
        </CardContent>
      </Card>
    )
  }

  if (error && items.length === 0) {
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
          Kitchen Inventory
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              disabled={isPending}
            >
              Apply Template
            </Button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                <button
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleApplyTemplate('minimal')}
                >
                  Minimal (8 items)
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleApplyTemplate('basic')}
                >
                  Basic (17 items)
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleApplyTemplate('well-equipped')}
                >
                  Well-Equipped (45 items)
                </button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
            disabled={isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">{editingId ? 'Edit Item' : 'Add Item'}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as KitchenCategory)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  {CATEGORY_ORDER.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Item Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cast Iron Skillet"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Condition</label>
                <select
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value as KitchenCondition)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  {(['good', 'fair', 'poor', 'missing'] as KitchenCondition[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Non-stick coating worn"
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => (editingId ? handleUpdate(editingId) : handleAdd())}
                disabled={isPending || !formName.trim()}
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {editingId ? 'Save' : 'Add'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !showAddForm && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No kitchen inventory recorded yet.</p>
            <p className="mt-1">Add items manually or apply a template to get started.</p>
          </div>
        )}

        {/* Grouped items */}
        {CATEGORY_ORDER.map((cat) => {
          const catItems = grouped[cat]
          if (catItems.length === 0) return null

          return (
            <div key={cat}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label} ({catItems.length})
              </h4>
              <div className="space-y-1">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.item_name}</span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                      )}
                      <Badge variant={CONDITION_CONFIG[item.condition].badge}>
                        {CONDITION_CONFIG[item.condition].label}
                      </Badge>
                      {item.notes && (
                        <span className="text-xs text-muted-foreground">{item.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {item.last_verified_at && (
                        <span className="text-xs text-muted-foreground mr-2">
                          Verified {new Date(item.last_verified_at).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(item)}
                        disabled={isPending}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(item.id)}
                        disabled={isPending}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Summary */}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{items.length} total items</span>
            <div className="flex gap-3">
              {(['good', 'fair', 'poor', 'missing'] as KitchenCondition[]).map((c) => {
                const count = items.filter((i) => i.condition === c).length
                if (count === 0) return null
                return (
                  <span key={c} className={CONDITION_CONFIG[c].color}>
                    {count} {CONDITION_CONFIG[c].label.toLowerCase()}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
