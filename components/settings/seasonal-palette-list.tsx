// Seasonal Palette List — Client Component
// Displays all seasons as cards with active toggle and edit links.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setActiveSeason, createSeasonalPalette, deleteSeasonalPalette } from '@/lib/seasonal/actions'
import type { SeasonalPalette } from '@/lib/seasonal/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const SEASON_COLORS: Record<string, string> = {
  Winter: 'border-sky-200 bg-sky-50/50',
  Spring: 'border-emerald-200 bg-emerald-50/50',
  Summer: 'border-amber-200 bg-amber-50/50',
  Autumn: 'border-orange-200 bg-orange-50/50',
}

const SEASON_ICONS: Record<string, string> = {
  Winter: 'Snowflake',
  Spring: 'Sprout',
  Summer: 'Sun',
  Autumn: 'Leaf',
}

function formatDateRange(start: string, end: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  return `${months[sm - 1]} ${sd} - ${months[em - 1]} ${ed}`
}

export function SeasonalPaletteList({ palettes }: { palettes: SeasonalPalette[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  const handleSetActive = (paletteId: string) => {
    startTransition(async () => {
      await setActiveSeason(paletteId)
      router.refresh()
    })
  }

  const handleCreate = () => {
    if (!newName.trim() || !newStart || !newEnd) return
    startTransition(async () => {
      try {
        await createSeasonalPalette({
          season_name: newName.trim(),
          start_month_day: newStart,
          end_month_day: newEnd,
          sort_order: palettes.length,
        })
        setShowCreate(false)
        setNewName('')
        setNewStart('')
        setNewEnd('')
        router.refresh()
      } catch {
        // Error handled by server action
      }
    })
  }

  const handleDelete = (paletteId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteSeasonalPalette(paletteId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {palettes.map((palette) => {
          const colorClass = SEASON_COLORS[palette.season_name] || 'border-stone-200 bg-stone-50/50'

          return (
            <Card key={palette.id} className={`${colorClass} transition-all ${isPending ? 'opacity-50' : ''}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-stone-900 text-lg">{palette.season_name}</h3>
                    <p className="text-sm text-stone-500">
                      {formatDateRange(palette.start_month_day, palette.end_month_day)}
                    </p>
                  </div>
                  {palette.is_active && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>

                {palette.sensory_anchor ? (
                  <p className="text-sm text-stone-600 italic line-clamp-2 mb-3">
                    &ldquo;{palette.sensory_anchor}&rdquo;
                  </p>
                ) : (
                  <p className="text-sm text-stone-400 mb-3">No sensory anchor set</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-4">
                  <span>{palette.micro_windows.length} micro-window{palette.micro_windows.length !== 1 ? 's' : ''}</span>
                  <span>{palette.proven_wins.length} proven win{palette.proven_wins.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/settings/repertoire/${palette.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">Edit</Button>
                  </Link>
                  {!palette.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetActive(palette.id)}
                      disabled={isPending}
                    >
                      Set Active
                    </Button>
                  )}
                  {!['Winter', 'Spring', 'Summer', 'Autumn'].includes(palette.season_name) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(palette.id, palette.season_name)}
                      disabled={isPending}
                      className="text-red-500"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Custom Season */}
      {showCreate ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-stone-900">Add Custom Season</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Season Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Early Spring"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Start (MM-DD)</label>
                <input
                  type="text"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  placeholder="03-01"
                  maxLength={5}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">End (MM-DD)</label>
                <input
                  type="text"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  placeholder="04-15"
                  maxLength={5}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Season'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setShowCreate(true)}>
          + Add Custom Season
        </Button>
      )}
    </div>
  )
}
