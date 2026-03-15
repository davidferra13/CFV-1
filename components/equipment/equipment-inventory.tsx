'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  getChefEquipment,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  type Equipment,
  type EquipmentCategory,
} from '@/lib/equipment/packing-actions'

const CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'cookware', label: 'Cookware' },
  { value: 'bakeware', label: 'Bakeware' },
  { value: 'knives', label: 'Knives' },
  { value: 'utensils', label: 'Utensils' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'serving', label: 'Serving' },
  { value: 'transport', label: 'Transport' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
  cookware: 'bg-orange-100 text-orange-800',
  bakeware: 'bg-amber-100 text-amber-800',
  knives: 'bg-red-100 text-red-800',
  utensils: 'bg-blue-100 text-blue-800',
  appliances: 'bg-purple-100 text-purple-800',
  serving: 'bg-green-100 text-green-800',
  transport: 'bg-gray-100 text-gray-800',
  cleaning: 'bg-cyan-100 text-cyan-800',
  specialty: 'bg-pink-100 text-pink-800',
  other: 'bg-slate-100 text-slate-800',
}

interface EquipmentInventoryProps {
  initialEquipment?: Equipment[]
}

export default function EquipmentInventory({ initialEquipment }: EquipmentInventoryProps) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment ?? [])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<EquipmentCategory | ''>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<EquipmentCategory>('cookware')
  const [formQuantity, setFormQuantity] = useState(1)
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    if (!initialEquipment) {
      startTransition(async () => {
        try {
          const data = await getChefEquipment()
          setEquipment(data)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load equipment')
        }
      })
    }
  }, [initialEquipment])

  const resetForm = () => {
    setFormName('')
    setFormCategory('cookware')
    setFormQuantity(1)
    setFormNotes('')
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!formName.trim()) {
      setError('Equipment name is required')
      return
    }
    const previousEquipment = equipment
    setError(null)
    startTransition(async () => {
      try {
        const newItem = await addEquipment({
          name: formName,
          category: formCategory,
          quantity: formQuantity,
          notes: formNotes || undefined,
        })
        setEquipment((prev) => [...prev, newItem].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
        resetForm()
      } catch (err) {
        setEquipment(previousEquipment)
        setError(err instanceof Error ? err.message : 'Failed to add equipment')
      }
    })
  }

  const handleUpdate = (id: string) => {
    const previousEquipment = equipment
    setError(null)
    startTransition(async () => {
      try {
        await updateEquipment(id, {
          name: formName,
          category: formCategory,
          quantity: formQuantity,
          notes: formNotes || undefined,
        })
        setEquipment((prev) =>
          prev.map((eq) =>
            eq.id === id
              ? { ...eq, name: formName, category: formCategory, quantity: formQuantity, notes: formNotes || null }
              : eq
          )
        )
        resetForm()
      } catch (err) {
        setEquipment(previousEquipment)
        setError(err instanceof Error ? err.message : 'Failed to update equipment')
      }
    })
  }

  const handleDelete = (id: string) => {
    const previousEquipment = equipment
    setEquipment((prev) => prev.filter((eq) => eq.id !== id))
    setError(null)
    startTransition(async () => {
      try {
        await deleteEquipment(id)
      } catch (err) {
        setEquipment(previousEquipment)
        setError(err instanceof Error ? err.message : 'Failed to delete equipment')
      }
    })
  }

  const startEdit = (eq: Equipment) => {
    setEditingId(eq.id)
    setFormName(eq.name)
    setFormCategory(eq.category)
    setFormQuantity(eq.quantity)
    setFormNotes(eq.notes ?? '')
    setShowAddForm(false)
  }

  // Filter + search
  const filtered = equipment.filter((eq) => {
    if (filterCategory && eq.category !== filterCategory) return false
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, Equipment[]>>((acc, eq) => {
    if (!acc[eq.category]) acc[eq.category] = []
    acc[eq.category].push(eq)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Equipment Inventory</h2>
        <button
          onClick={() => { resetForm(); setShowAddForm(true) }}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Add Equipment
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Search and filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search equipment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as EquipmentCategory | '')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-medium">Add Equipment</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="col-span-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as EquipmentCategory)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={formQuantity}
              onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              placeholder="Qty"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="col-span-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Equipment list grouped by category */}
      {Object.keys(grouped).length === 0 && !isPending && (
        <p className="text-sm text-gray-500 py-8 text-center">
          {equipment.length === 0
            ? 'No equipment added yet. Add your gear to start building packing lists.'
            : 'No equipment matches your search.'}
        </p>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h3 className="text-sm font-medium text-gray-600 capitalize flex items-center gap-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category as EquipmentCategory] || ''}`}>
                {category}
              </span>
              <span className="text-gray-400">({items.length})</span>
            </h3>
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
              {items.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between px-3 py-2">
                  {editingId === eq.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="col-span-2 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as EquipmentCategory)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          className="col-span-2 rounded border border-gray-300 px-2 py-1 text-sm"
                          placeholder="Notes"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(eq.id)}
                          disabled={isPending}
                          className="rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700"
                        >
                          Save
                        </button>
                        <button onClick={resetForm} className="rounded border px-2 py-1 text-xs text-gray-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{eq.name}</span>
                        {eq.quantity > 1 && (
                          <span className="ml-1 text-xs text-gray-500">x{eq.quantity}</span>
                        )}
                        {eq.notes && (
                          <p className="text-xs text-gray-500 truncate">{eq.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(eq)}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id)}
                          disabled={isPending}
                          className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {isPending && equipment.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">Loading equipment...</p>
      )}
    </div>
  )
}
