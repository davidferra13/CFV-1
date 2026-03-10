'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Plus, ArrowDown, ArrowUp, Warning, Clock, Trash } from '@/components/ui/icons'
import type {
  ContainerInventoryItem,
  ContainerTransaction,
  ContainerType,
  ContainerMaterial,
  TransactionType,
} from '@/lib/meal-prep/container-actions'
import { addContainerType, recordTransaction } from '@/lib/meal-prep/container-actions'

// ============================================
// Constants
// ============================================

const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  small_round: 'Small Round',
  medium_round: 'Medium Round',
  large_rect: 'Large Rectangle',
  soup_cup: 'Soup Cup',
  salad_bowl: 'Salad Bowl',
  custom: 'Custom',
}

const MATERIAL_LABELS: Record<ContainerMaterial, string> = {
  plastic: 'Plastic',
  glass: 'Glass',
  aluminum: 'Aluminum',
  compostable: 'Compostable',
}

const MATERIAL_COLORS: Record<ContainerMaterial, string> = {
  plastic: 'bg-sky-900/50 text-sky-300',
  glass: 'bg-emerald-900/50 text-emerald-300',
  aluminum: 'bg-stone-700 text-stone-300',
  compostable: 'bg-lime-900/50 text-lime-300',
}

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  purchase: 'Purchased',
  deploy: 'Deployed',
  return: 'Returned',
  retire: 'Retired',
  lost: 'Lost',
}

const TX_TYPE_ICONS: Record<TransactionType, typeof Plus> = {
  purchase: Plus,
  deploy: ArrowUp,
  return: ArrowDown,
  retire: Trash,
  lost: Warning,
}

// ============================================
// Props
// ============================================

interface ContainerDashboardProps {
  inventory: ContainerInventoryItem[]
  transactions: ContainerTransaction[]
}

// ============================================
// Component
// ============================================

export function ContainerDashboard({
  inventory: initialInventory,
  transactions: initialTransactions,
}: ContainerDashboardProps) {
  const [inventory, setInventory] = useState(initialInventory)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [pending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [txForm, setTxForm] = useState<{
    containerTypeId: string
    type: TransactionType
  } | null>(null)
  const [txQuantity, setTxQuantity] = useState(1)
  const [txNotes, setTxNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [newType, setNewType] = useState<ContainerType>('medium_round')
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [newMaterial, setNewMaterial] = useState<ContainerMaterial>('plastic')
  const [newReusable, setNewReusable] = useState(true)
  const [newTotal, setNewTotal] = useState(0)
  const [newCost, setNewCost] = useState('')
  const [newNotes, setNewNotes] = useState('')

  function handleAddType() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await addContainerType({
          container_type: newType,
          custom_label: newType === 'custom' ? newCustomLabel : undefined,
          material: newMaterial,
          is_reusable: newReusable,
          total_owned: newTotal,
          cost_per_unit_cents: newCost ? Math.round(parseFloat(newCost) * 100) : null,
          notes: newNotes || null,
        })
        if (result.error) {
          setError(result.error)
          return
        }
        // Refresh by re-rendering; the page revalidation will handle it
        setShowAddForm(false)
        setNewType('medium_round')
        setNewCustomLabel('')
        setNewMaterial('plastic')
        setNewReusable(true)
        setNewTotal(0)
        setNewCost('')
        setNewNotes('')
        // Optimistic: add to local state
        if (result.id) {
          setInventory((prev) => [
            ...prev,
            {
              id: result.id!,
              chef_id: '',
              container_type: newType,
              custom_label: newType === 'custom' ? newCustomLabel : null,
              material: newMaterial,
              is_reusable: newReusable,
              total_owned: newTotal,
              currently_available: newTotal,
              deployed_count: 0,
              retired_count: 0,
              cost_per_unit_cents: newCost ? Math.round(parseFloat(newCost) * 100) : null,
              notes: newNotes || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
        }
      } catch {
        setError('Failed to add container type')
      }
    })
  }

  function handleRecordTransaction() {
    if (!txForm) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await recordTransaction({
          containerTypeId: txForm.containerTypeId,
          type: txForm.type,
          quantity: txQuantity,
          notes: txNotes || undefined,
        })
        if (result.error) {
          setError(result.error)
          return
        }
        setTxForm(null)
        setTxQuantity(1)
        setTxNotes('')
        // Force page refresh via revalidation
        window.location.reload()
      } catch {
        setError('Failed to record transaction')
      }
    })
  }

  function getDisplayName(item: ContainerInventoryItem): string {
    if (item.container_type === 'custom' && item.custom_label) {
      return item.custom_label
    }
    return CONTAINER_TYPE_LABELS[item.container_type] || item.container_type
  }

  function getAvailabilityPercent(item: ContainerInventoryItem): number {
    if (item.total_owned === 0) return 100
    return Math.round((item.currently_available / item.total_owned) * 100)
  }

  function isLowStock(item: ContainerInventoryItem): boolean {
    return item.total_owned > 0 && item.currently_available < item.total_owned * 0.2
  }

  // Summary stats
  const totalContainers = inventory.reduce((sum, i) => sum + i.total_owned, 0)
  const totalDeployed = inventory.reduce((sum, i) => sum + i.deployed_count, 0)
  const totalAvailable = inventory.reduce((sum, i) => sum + i.currently_available, 0)
  const lowStockCount = inventory.filter(isLowStock).length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{totalContainers}</p>
          <p className="text-xs text-stone-500">Total Owned</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalAvailable}</p>
          <p className="text-xs text-stone-500">Available</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{totalDeployed}</p>
          <p className="text-xs text-stone-500">Deployed</p>
        </Card>
        <Card className="p-4 text-center">
          <p
            className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-stone-400'}`}
          >
            {lowStockCount}
          </p>
          <p className="text-xs text-stone-500">Low Stock</p>
        </Card>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Container type cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">Container Types</h2>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Type
          </Button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-medium text-stone-300">New Container Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ContainerType)}
                  className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                >
                  {Object.entries(CONTAINER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {newType === 'custom' && (
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Custom Label</label>
                  <input
                    type="text"
                    value={newCustomLabel}
                    onChange={(e) => setNewCustomLabel(e.target.value)}
                    placeholder="e.g. Bento Box"
                    className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-stone-500 block mb-1">Material</label>
                <select
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value as ContainerMaterial)}
                  className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                >
                  {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Initial Stock</label>
                <input
                  type="number"
                  min={0}
                  value={newTotal}
                  onChange={(e) => setNewTotal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Cost per Unit ($)</label>
                <input
                  type="text"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reusable"
                  checked={newReusable}
                  onChange={(e) => setNewReusable(e.target.checked)}
                  className="rounded bg-stone-800 border-stone-700"
                />
                <label htmlFor="reusable" className="text-sm text-stone-300">
                  Reusable
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={pending} onClick={handleAddType}>
                Add Container Type
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Inventory cards */}
        {inventory.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-stone-500 text-sm">
            No container types added yet. Click "Add Type" to get started.
          </div>
        )}

        {inventory.map((item) => {
          const pct = getAvailabilityPercent(item)
          const low = isLowStock(item)

          return (
            <Card key={item.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-stone-400" />
                  <div>
                    <h3 className="font-medium text-stone-200">{getDisplayName(item)}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="default" className={MATERIAL_COLORS[item.material]}>
                        {MATERIAL_LABELS[item.material]}
                      </Badge>
                      {item.is_reusable && <Badge variant="info">Reusable</Badge>}
                      {low && <Badge variant="error">Low Stock</Badge>}
                    </div>
                  </div>
                </div>
                {item.cost_per_unit_cents != null && (
                  <span className="text-xs text-stone-500">
                    ${(item.cost_per_unit_cents / 100).toFixed(2)}/unit
                  </span>
                )}
              </div>

              {/* Counts */}
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <p className="text-stone-100 font-semibold">{item.total_owned}</p>
                  <p className="text-xs text-stone-500">Total</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-semibold">{item.currently_available}</p>
                  <p className="text-xs text-stone-500">Available</p>
                </div>
                <div>
                  <p className="text-amber-400 font-semibold">{item.deployed_count}</p>
                  <p className="text-xs text-stone-500">Deployed</p>
                </div>
                <div>
                  <p className="text-stone-500 font-semibold">{item.retired_count}</p>
                  <p className="text-xs text-stone-500">Retired</p>
                </div>
              </div>

              {/* Availability bar */}
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    low ? 'bg-red-500' : pct > 50 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTxForm({ containerTypeId: item.id, type: 'return' })}
                >
                  <ArrowDown className="w-3.5 h-3.5 mr-1" />
                  Record Return
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTxForm({ containerTypeId: item.id, type: 'deploy' })}
                >
                  <ArrowUp className="w-3.5 h-3.5 mr-1" />
                  Deploy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTxForm({ containerTypeId: item.id, type: 'purchase' })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Purchase
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Transaction form modal */}
      {txForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-stone-200">
              {TX_TYPE_LABELS[txForm.type]} Containers
            </h3>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={txQuantity}
                onChange={(e) => setTxQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={pending}
                onClick={handleRecordTransaction}
              >
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTxForm(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Recent transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-200">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-stone-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 20).map((tx) => {
              const Icon = TX_TYPE_ICONS[tx.transaction_type as TransactionType] || Clock
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-lg text-sm"
                >
                  <Icon className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-stone-200">
                      {TX_TYPE_LABELS[tx.transaction_type as TransactionType] ||
                        tx.transaction_type}
                    </span>
                    <span className="text-stone-400"> x{tx.quantity}</span>
                    {tx.container_inventory && (
                      <span className="text-stone-500">
                        {' '}
                        (
                        {tx.container_inventory.custom_label ||
                          CONTAINER_TYPE_LABELS[
                            tx.container_inventory.container_type as ContainerType
                          ] ||
                          tx.container_inventory.container_type}
                        )
                      </span>
                    )}
                    {tx.client?.full_name && (
                      <span className="text-stone-500"> - {tx.client.full_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-stone-600 flex-shrink-0">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
