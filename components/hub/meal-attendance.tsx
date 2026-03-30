'use client'

import { useState, useEffect, useTransition } from 'react'
import type { HouseholdMember } from '@/lib/hub/household-actions'
import {
  getCircleHouseholdMembers,
  getMealAttendance,
  bulkSetMealAttendance,
} from '@/lib/hub/household-actions'

interface MealAttendanceProps {
  groupId: string
  mealEntryId: string
  compact?: boolean
}

const STATUS_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  in: {
    icon: '✓',
    label: 'Eating',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  out: { icon: '✗', label: 'Out', color: 'bg-stone-800 text-stone-500 border-stone-700' },
  maybe: { icon: '?', label: 'Maybe', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
}

const RELATIONSHIP_EMOJI: Record<string, string> = {
  partner: '💑',
  spouse: '💑',
  child: '👶',
  parent: '👴',
  sibling: '👫',
  assistant: '📋',
  house_manager: '🏠',
  nanny: '🧑‍🍼',
  other: '👤',
}

export function MealAttendance({ groupId, mealEntryId, compact }: MealAttendanceProps) {
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'in' | 'out' | 'maybe'>>({})
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    Promise.all([getCircleHouseholdMembers(groupId), getMealAttendance(mealEntryId)])
      .then(([members, records]) => {
        setHouseholdMembers(members)
        const map: Record<string, 'in' | 'out' | 'maybe'> = {}
        for (const r of records) {
          map[r.household_member_id] = r.status as 'in' | 'out' | 'maybe'
        }
        // Default everyone to 'in' if no record exists
        for (const m of members) {
          if (!(m.id in map)) map[m.id] = 'in'
        }
        setAttendance(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId, mealEntryId])

  const cycleStatus = (memberId: string) => {
    setAttendance((prev) => {
      const current = prev[memberId] ?? 'in'
      const next: 'in' | 'out' | 'maybe' =
        current === 'in' ? 'maybe' : current === 'maybe' ? 'out' : 'in'
      const updated: Record<string, 'in' | 'out' | 'maybe'> = { ...prev, [memberId]: next }

      // Auto-save on change
      startTransition(async () => {
        try {
          await bulkSetMealAttendance({ mealEntryId, attendance: updated })
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        } catch {
          // Revert on failure
          setAttendance(prev)
        }
      })

      return updated
    })
  }

  if (loading) {
    return <div className="h-6 w-20 animate-pulse rounded bg-stone-800" />
  }

  if (householdMembers.length === 0) return null

  const inCount = Object.values(attendance).filter((s) => s === 'in').length
  const maybeCount = Object.values(attendance).filter((s) => s === 'maybe').length

  // Compact view: show avatars, click to expand for toggle controls
  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 hover:bg-stone-800/60 transition-colors"
        title="Click to manage who's eating"
      >
        {householdMembers.map((m) => {
          const status = attendance[m.id] ?? 'in'
          const config = STATUS_ICONS[status]
          const initial = m.display_name[0].toUpperCase()
          return (
            <span
              key={m.id}
              title={`${m.display_name} (${m.relationship}): ${config.label}`}
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium ${config.color}`}
            >
              {status === 'out' ? '' : initial}
            </span>
          )
        })}
        <span className="ml-0.5 text-[10px] text-stone-500">
          {inCount}
          {maybeCount > 0 ? `+${maybeCount}?` : ''}
        </span>
      </button>
    )
  }

  // Full view: clickable toggle for each member
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
          Who&apos;s eating
        </span>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[10px] text-emerald-400">Saved</span>}
          {isPending && <span className="text-[10px] text-stone-500">Saving...</span>}
          {compact && expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[10px] text-stone-500 hover:text-stone-300"
            >
              Collapse
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {householdMembers.map((m) => {
          const status = attendance[m.id] ?? 'in'
          const config = STATUS_ICONS[status]
          const emoji = RELATIONSHIP_EMOJI[m.relationship] ?? '👤'
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => cycleStatus(m.id)}
              disabled={isPending}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${config.color}`}
              title={`${m.display_name}: ${config.label}. Click to change.`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="font-medium">{m.display_name}</span>
              <span className="text-[10px] opacity-70">{config.icon}</span>
            </button>
          )
        })}
      </div>
      {(inCount > 0 || maybeCount > 0) && (
        <p className="text-[10px] text-stone-500">
          {inCount} confirmed{maybeCount > 0 ? `, ${maybeCount} maybe` : ''}
        </p>
      )}
    </div>
  )
}
