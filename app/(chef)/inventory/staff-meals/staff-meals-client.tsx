'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { logStaffMeal } from '@/lib/inventory/staff-meal-actions'

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = { initialMeals: any[] }

export function StaffMealsClient({ initialMeals }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState('')
  const [staffCount, setStaffCount] = useState('1')
  const [mealDate, setMealDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<
    { ingredientName: string; quantity: string; unit: string; costCents: string }[]
  >([{ ingredientName: '', quantity: '', unit: '', costCents: '' }])

  function addItemRow() {
    setItems((prev) => [...prev, { ingredientName: '', quantity: '', unit: '', costCents: '' }])
  }

  function updateItem(idx: number, field: string, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items
      .filter((i) => i.ingredientName.trim() && i.quantity)
      .map((i) => ({
        ingredientName: i.ingredientName.trim(),
        quantity: parseFloat(i.quantity),
        unit: i.unit.trim() || 'each',
        costCents: i.costCents ? Math.round(parseFloat(i.costCents) * 100) : undefined,
      }))

    startTransition(async () => {
      try {
        await logStaffMeal({
          description: description.trim() || 'Staff meal',
          staffCount: parseInt(staffCount) || 1,
          mealDate: (mealDate || undefined) as any,
          notes: notes.trim() || undefined,
          items: validItems,
        })
        setShowForm(false)
        setDescription('')
        setStaffCount('1')
        setNotes('')
        setItems([{ ingredientName: '', quantity: '', unit: '', costCents: '' }])
        window.location.reload()
      } catch (err) {
        console.error('Failed to log staff meal', err)
      }
    })
  }

  const totalCost = initialMeals.reduce((sum, m) => sum + (m.totalCostCents ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{initialMeals.length}</p>
          <p className="text-xs text-stone-500">Total Meals</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{formatCents(totalCost)}</p>
          <p className="text-xs text-stone-500">Total Cost</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">
            {initialMeals.length > 0
              ? formatCents(Math.round(totalCost / initialMeals.length))
              : '-'}
          </p>
          <p className="text-xs text-stone-500">Avg Cost/Meal</p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-stone-500">
          {initialMeals.length} meal{initialMeals.length !== 1 ? 's' : ''} logged
        </span>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log Staff Meal'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-stone-100">Log Staff Meal</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Meal description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
              />
              <input
                type="number"
                placeholder="Staff count"
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
                min="1"
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
              />
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Ingredients Used
              </label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ingredient"
                    value={item.ingredientName}
                    onChange={(e) => updateItem(idx, 'ingredientName', e.target.value)}
                    className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    step="0.01"
                    className="w-20 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    className="w-20 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                  />
                  <input
                    type="number"
                    placeholder="Cost $"
                    value={item.costCents}
                    onChange={(e) => updateItem(idx, 'costCents', e.target.value)}
                    step="0.01"
                    className="w-24 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-stone-500 hover:text-red-400 text-sm px-1"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItemRow}
                className="text-sm text-brand-500 hover:text-brand-400 mt-1"
              >
                + Add ingredient
              </button>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200 resize-none"
            />

            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              Log Meal
            </Button>
          </form>
        </Card>
      )}

      {/* Meal list */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Staff</th>
                <th className="text-right px-4 py-3 font-medium">Cost</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {initialMeals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                    No staff meals logged yet. Track what the team eats to understand true food
                    costs.
                  </td>
                </tr>
              ) : (
                initialMeals.map((meal: any) => (
                  <tr key={meal.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                      {meal.mealDate ? new Date(meal.mealDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-100 font-medium">{meal.description}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{meal.staffCount}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(meal.totalCostCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">
                      {meal.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
