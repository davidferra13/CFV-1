'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getExpenses, deleteExpense } from '@/lib/finance/expense-actions'
import type { Expense, ExpenseCategory, ExpenseFilters } from '@/lib/finance/expense-actions'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Food',
  equipment: 'Equipment',
  supplies: 'Supplies',
  mileage: 'Mileage',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  marketing: 'Marketing',
  rent: 'Rent',
  utilities: 'Utilities',
  professional_services: 'Professional Services',
  training: 'Training',
  other: 'Other',
}

const CATEGORY_VARIANTS: Record<ExpenseCategory, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  food: 'success',
  equipment: 'info',
  supplies: 'default',
  mileage: 'warning',
  insurance: 'error',
  subscriptions: 'info',
  marketing: 'warning',
  rent: 'error',
  utilities: 'default',
  professional_services: 'info',
  training: 'success',
  other: 'default',
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
]

type SortField = 'date' | 'amount_cents'
type SortDir = 'asc' | 'desc'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ExpenseListProps {
  onEdit?: (expense: Expense) => void
}

export function ExpenseList({ onEdit }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Load expenses
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const filters: ExpenseFilters = {}
        if (categoryFilter) filters.category = categoryFilter as ExpenseCategory
        if (dateFrom) filters.dateFrom = dateFrom
        if (dateTo) filters.dateTo = dateTo

        const data = await getExpenses(filters)
        if (!cancelled) {
          setExpenses(data)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ExpenseList] Failed to load expenses:', err)
          setError('Failed to load expenses. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [categoryFilter, dateFrom, dateTo])

  // Filter + sort in memory
  const displayed = useMemo(() => {
    let filtered = expenses

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.vendor && e.vendor.toLowerCase().includes(q))
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortField === 'date' ? a.date : a.amount_cents
      const bVal = sortField === 'date' ? b.date : b.amount_cents
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [expenses, search, sortField, sortDir])

  const total = useMemo(() => {
    return displayed.reduce((sum, e) => sum + e.amount_cents, 0)
  }, [displayed])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return

    const previous = expenses
    setExpenses((prev) => prev.filter((e) => e.id !== id))

    startTransition(async () => {
      try {
        await deleteExpense(id)
      } catch (err) {
        console.error('[ExpenseList] Delete failed:', err)
        setExpenses(previous)
        alert('Failed to delete expense. Please try again.')
      }
    })
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="Search description or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">Loading expenses...</div>
      ) : displayed.length === 0 ? (
        <div className="py-12 text-center text-sm text-stone-500">
          {expenses.length === 0
            ? 'No expenses recorded yet. Add your first expense to start tracking.'
            : 'No expenses match your filters.'}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort('date')}
                    className="flex items-center gap-1 hover:text-stone-900"
                  >
                    Date
                    {sortField === 'date' && (
                      <span className="text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort('amount_cents')}
                    className="flex items-center gap-1 hover:text-stone-900"
                  >
                    Amount
                    {sortField === 'amount_cents' && (
                      <span className="text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <div>
                      {expense.description}
                      {expense.is_recurring && (
                        <span className="ml-2 text-xs text-stone-400">
                          ({expense.recurrence_interval})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={CATEGORY_VARIANTS[expense.category]}>
                      {CATEGORY_LABELS[expense.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone-500">{expense.vendor || '-'}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatCents(expense.amount_cents)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Total */}
          <div className="flex justify-end border-t border-stone-200 pt-3">
            <div className="text-sm text-stone-500">
              {displayed.length} expense{displayed.length !== 1 ? 's' : ''} totaling{' '}
              <span className="font-semibold text-stone-900 font-mono">{formatCents(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
