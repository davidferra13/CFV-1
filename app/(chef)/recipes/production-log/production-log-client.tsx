'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GlobalProductionLogEntry } from '@/lib/recipes/production-log-actions'
import { format, isPast, isBefore, addDays } from 'date-fns'

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  sauce: 'warning',
  protein: 'error',
  starch: 'default',
  vegetable: 'success',
  dessert: 'info',
  pasta: 'warning',
  soup: 'info',
  salad: 'success',
}

type Props = {
  entries: GlobalProductionLogEntry[]
}

export function ProductionLogClient({ entries }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'fresh' | 'use-soon' | 'expired'>('all')

  const getShelfStatus = (entry: GlobalProductionLogEntry) => {
    const now = new Date()
    const discardDate = entry.discard_at ? new Date(entry.discard_at) : null
    const bestBeforeDate = entry.best_before ? new Date(entry.best_before) : null

    if (discardDate) {
      if (isPast(discardDate)) return 'expired'
      if (isBefore(discardDate, addDays(now, 2))) return 'use-soon'
      return 'fresh'
    }
    if (bestBeforeDate) {
      if (isPast(bestBeforeDate)) return 'use-soon'
      return 'fresh'
    }
    return null
  }

  const filtered = entries.filter((entry) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const matchesName = entry.recipe_name.toLowerCase().includes(q)
      const matchesBy = entry.produced_by?.toLowerCase().includes(q)
      const matchesNotes = entry.batch_notes?.toLowerCase().includes(q)
      if (!matchesName && !matchesBy && !matchesNotes) return false
    }

    // Status filter
    if (filterStatus !== 'all') {
      const status = getShelfStatus(entry)
      if (status !== filterStatus) return false
    }

    return true
  })

  // Stats
  const totalProductions = entries.length
  const expiredCount = entries.filter((e) => getShelfStatus(e) === 'expired').length
  const useSoonCount = entries.filter((e) => getShelfStatus(e) === 'use-soon').length
  const uniqueRecipes = new Set(entries.map((e) => e.recipe_id)).size

  const statusColors = {
    fresh: 'border-l-green-500',
    'use-soon': 'border-l-amber-500',
    expired: 'border-l-red-500',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Production Log</h1>
          <p className="text-stone-400 mt-1">
            Every recipe production across your kitchen - who made what, when, and shelf life.
          </p>
        </div>
        <Link href="/recipes">
          <Button variant="ghost">Back to Recipes</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-stone-100">{totalProductions}</p>
            <p className="text-xs text-stone-500">Total Productions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-stone-100">{uniqueRecipes}</p>
            <p className="text-xs text-stone-500">Unique Recipes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{useSoonCount}</p>
            <p className="text-xs text-stone-500">Use Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-400">{expiredCount}</p>
            <p className="text-xs text-stone-500">Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by recipe, person, or notes..."
          className="max-w-sm"
        />
        <div className="flex gap-1">
          {(['all', 'fresh', 'use-soon', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-brand-500/20 text-brand-400 font-medium'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {status === 'all'
                ? 'All'
                : status === 'fresh'
                  ? 'Fresh'
                  : status === 'use-soon'
                    ? 'Use Soon'
                    : 'Expired'}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filtered.length} Production{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              {entries.length === 0
                ? 'No production records yet. Log your first production from any recipe detail page.'
                : 'No entries match your filters.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => {
                const shelfStatus = getShelfStatus(entry)
                const discardDate = entry.discard_at ? new Date(entry.discard_at) : null
                const bestBeforeDate = entry.best_before ? new Date(entry.best_before) : null

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border border-stone-700 bg-stone-900/30 border-l-4 ${
                      shelfStatus ? statusColors[shelfStatus] : 'border-l-stone-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/recipes/${entry.recipe_id}`}
                            className="font-medium text-stone-100 hover:text-brand-500 hover:underline"
                          >
                            {entry.recipe_name}
                          </Link>
                          <Badge variant={CATEGORY_COLORS[entry.recipe_category] || 'default'}>
                            {entry.recipe_category}
                          </Badge>
                          <span className="text-sm text-stone-300">
                            {entry.quantity} {entry.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-stone-500">
                          <span>{format(new Date(entry.produced_at), 'PPp')}</span>
                          {entry.produced_by && <span>by {entry.produced_by}</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                          {entry.best_before && (
                            <span
                              className={
                                bestBeforeDate && isPast(bestBeforeDate) ? 'text-amber-400' : ''
                              }
                            >
                              Best before: {format(new Date(entry.best_before), 'PPp')}
                            </span>
                          )}
                          {entry.discard_at && (
                            <span
                              className={
                                discardDate && isPast(discardDate) ? 'text-red-400 font-medium' : ''
                              }
                            >
                              Discard by: {format(new Date(entry.discard_at), 'PPp')}
                            </span>
                          )}
                        </div>
                        {entry.batch_notes && (
                          <p className="text-sm text-stone-400">{entry.batch_notes}</p>
                        )}
                      </div>
                      {shelfStatus === 'expired' && <Badge variant="error">Expired</Badge>}
                      {shelfStatus === 'use-soon' && <Badge variant="warning">Use Soon</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
