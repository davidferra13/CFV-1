'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createSeasonalItem,
  updateSeasonalItem,
  deleteSeasonalItem,
  type SeasonalItem,
} from '@/lib/bakery/seasonal-actions'

const CATEGORY_COLORS: Record<string, string> = {
  cookie: 'bg-amber-200 dark:bg-amber-800',
  pie: 'bg-orange-200 dark:bg-orange-800',
  cake: 'bg-pink-200 dark:bg-pink-800',
  bread: 'bg-yellow-200 dark:bg-yellow-800',
  pastry: 'bg-purple-200 dark:bg-purple-800',
  seasonal_special: 'bg-green-200 dark:bg-green-800',
}

const CATEGORY_LABELS: Record<string, string> = {
  cookie: 'Cookie',
  pie: 'Pie',
  cake: 'Cake',
  bread: 'Bread',
  pastry: 'Pastry',
  seasonal_special: 'Seasonal Special',
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.ceil((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))
}

export function SeasonalCalendar({
  initialItems,
  initialYear,
}: {
  initialItems: SeasonalItem[]
  initialYear: number
}) {
  const [items, setItems] = useState(initialItems)
  const [year, setYear] = useState(initialYear)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'seasonal_special',
    price_cents_display: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  // Compute active and upcoming items
  const today = new Date().toISOString().split('T')[0]

  const activeItems = useMemo(
    () => items.filter((i) => i.is_active && i.start_date <= today && i.end_date >= today),
    [items, today]
  )

  const upcomingItems = useMemo(
    () =>
      items
        .filter((i) => i.is_active && i.start_date > today)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 10),
    [items, today]
  )

  // Month view: items that overlap with the selected month
  const monthItems = useMemo(() => {
    if (selectedMonth === null) return []
    const monthStart = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const nextMonth =
      selectedMonth === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(selectedMonth + 2).padStart(2, '0')}-01`
    const lastDay = new Date(new Date(nextMonth).getTime() - 86400000).toISOString().split('T')[0]
    return items.filter((i) => i.start_date <= lastDay && i.end_date >= monthStart)
  }, [items, selectedMonth, year])

  // ============================================================
  // Handlers
  // ============================================================

  function handleCreate() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Start and end dates are required')
      return
    }
    if (form.start_date > form.end_date) {
      toast.error('End date must be after start date')
      return
    }

    const priceCents = Math.round(Number(form.price_cents_display || '0') * 100)

    startTransition(async () => {
      try {
        const item = await createSeasonalItem({
          name: form.name,
          description: form.description || null,
          category: form.category,
          price_cents: priceCents,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes || null,
        })
        setItems([...items, item as SeasonalItem])
        setShowForm(false)
        setForm({
          name: '',
          description: '',
          category: 'seasonal_special',
          price_cents_display: '',
          start_date: '',
          end_date: '',
          notes: '',
        })
        toast.success('Seasonal item created')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create item')
      }
    })
  }

  function handleToggleActive(item: SeasonalItem) {
    const previous = [...items]
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)))

    startTransition(async () => {
      try {
        await updateSeasonalItem(item.id, { is_active: !item.is_active })
        toast.success(item.is_active ? 'Item disabled' : 'Item enabled')
      } catch (err) {
        setItems(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this seasonal item?')) return

    const previous = [...items]
    setItems(items.filter((i) => i.id !== id))

    startTransition(async () => {
      try {
        await deleteSeasonalItem(id)
        toast.success('Seasonal item deleted')
      } catch (err) {
        setItems(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Active Items Highlight */}
      {activeItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currently In Season</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 py-2 rounded-lg ${CATEGORY_COLORS[item.category]} text-sm font-medium`}
                >
                  {item.name}
                  {item.price_cents > 0 && (
                    <span className="ml-2 opacity-75">{formatCents(item.price_cents)}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Items */}
      {upcomingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Coming Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingItems.map((item) => {
                const daysUntil = daysBetween(today, item.start_date)
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[item.category]}`} />
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="info">{CATEGORY_LABELS[item.category]}</Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {daysUntil} day{daysUntil !== 1 ? 's' : ''} until start
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year Navigation + Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={() => setYear(year - 1)}>
            {year - 1}
          </Button>
          <span className="text-lg font-semibold">{year}</span>
          <Button variant="ghost" onClick={() => setYear(year + 1)}>
            {year + 1}
          </Button>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Seasonal Item'}
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Seasonal Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Pumpkin Spice Muffins"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="cookie">Cookie</option>
                  <option value="pie">Pie</option>
                  <option value="cake">Cake</option>
                  <option value="bread">Bread</option>
                  <option value="pastry">Pastry</option>
                  <option value="seasonal_special">Seasonal Special</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date *</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.price_cents_display}
                  onChange={(e) => setForm({ ...form, price_cents_display: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Item'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 12-Month Year View */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {MONTH_NAMES.map((month, idx) => {
          const monthStart = `${year}-${String(idx + 1).padStart(2, '0')}-01`
          const nextMonth =
            idx === 11 ? `${year + 1}-01-01` : `${year}-${String(idx + 2).padStart(2, '0')}-01`
          const lastDay = new Date(new Date(nextMonth).getTime() - 86400000)
            .toISOString()
            .split('T')[0]
          const monthItemCount = items.filter(
            (i) => i.start_date <= lastDay && i.end_date >= monthStart
          ).length
          const isSelected = selectedMonth === idx
          const isCurrent = new Date().getFullYear() === year && new Date().getMonth() === idx

          return (
            <Card
              key={idx}
              className={`cursor-pointer transition-colors hover:border-blue-400 ${
                isSelected ? 'border-blue-500 border-2' : ''
              } ${isCurrent ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
              onClick={() => setSelectedMonth(isSelected ? null : idx)}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{month}</span>
                  {monthItemCount > 0 && <Badge variant="info">{monthItemCount}</Badge>}
                </div>
                {/* Mini item bars */}
                <div className="space-y-1">
                  {items
                    .filter((i) => i.start_date <= lastDay && i.end_date >= monthStart)
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`h-2 rounded-full ${CATEGORY_COLORS[item.category]} ${
                          !item.is_active ? 'opacity-40' : ''
                        }`}
                        title={item.name}
                      />
                    ))}
                  {items.filter((i) => i.start_date <= lastDay && i.end_date >= monthStart).length >
                    3 && (
                    <p className="text-xs text-muted-foreground">
                      +
                      {items.filter((i) => i.start_date <= lastDay && i.end_date >= monthStart)
                        .length - 3}{' '}
                      more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Month Detail View */}
      {selectedMonth !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {MONTH_NAMES[selectedMonth]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No seasonal items this month</p>
            ) : (
              <div className="space-y-3">
                {monthItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between p-3 rounded-lg border ${
                      !item.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[item.category]}`} />
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="info">{CATEGORY_LABELS[item.category]}</Badge>
                        {!item.is_active && <Badge variant="default">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.start_date} to {item.end_date}
                        {item.price_cents > 0 && ` - ${formatCents(item.price_cents)}`}
                      </p>
                      {item.description && <p className="text-sm mt-1">{item.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleToggleActive(item)}
                        disabled={isPending}
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
