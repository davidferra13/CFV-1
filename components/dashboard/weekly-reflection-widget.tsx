'use client'

// WeeklyReflectionWidget - Contextual reflection prompt on the dashboard.
// Shows last week's headline stats and a dismissible "what went well?" prompt.
// Appears on Monday or the day after the last event of the week.
// Dismissal persisted per ISO-week in localStorage.

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { WeeklyRetroSummary } from '@/lib/scheduling/weekly-retro-summary-action'

// ── Helpers ──────────────────────────────────────────────────────────

/** ISO week number for a given date. */
function isoWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function dismissalKey(): string {
  const now = new Date()
  return `cf-retro-dismiss-${now.getFullYear()}-W${isoWeekNumber(now)}`
}

function isDismissedThisWeek(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(dismissalKey()) === '1'
}

function dismissForWeek(): void {
  localStorage.setItem(dismissalKey(), '1')
}

/** Should the widget show today? Monday, or Saturday/Sunday (day after typical last event). */
function isReflectionDay(): boolean {
  const day = new Date().getDay()
  // 0 = Sunday, 1 = Monday, 6 = Saturday
  return day === 0 || day === 1 || day === 6
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`
}

// ── Component ────────────────────────────────────────────────────────

type Props = {
  summary: WeeklyRetroSummary
}

export function WeeklyReflectionWidget({ summary }: Props) {
  const [dismissed, setDismissed] = useState(true) // Start hidden, check client-side
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Only show on reflection days and if not dismissed
    if (!isReflectionDay()) return
    if (isDismissedThisWeek()) return
    if (!summary.hasActivity) return
    setDismissed(false)
  }, [summary.hasActivity])

  if (dismissed) return null

  const handleDismiss = () => {
    dismissForWeek()
    setDismissed(true)
  }

  const { eventsCompleted, totalRevenueCents, repeatClientPercent, totalGuests } = summary

  return (
    <Card className="border border-indigo-900/40 bg-indigo-950/30 overflow-hidden">
      <CardContent className="pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-200">Weekly Reflection</h3>
            <span className="text-xs text-stone-500">
              {formatDateRange(summary.weekStart, summary.weekEnd)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-2 py-1 rounded hover:bg-stone-800"
            aria-label="Dismiss reflection for this week"
          >
            Dismiss
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <p className="text-xl font-bold text-stone-100">{eventsCompleted}</p>
            <p className="text-xs text-stone-500">event{eventsCompleted !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-stone-100">{formatCents(totalRevenueCents)}</p>
            <p className="text-xs text-stone-500">revenue</p>
          </div>
          <div>
            <p className="text-xl font-bold text-stone-100">{repeatClientPercent}%</p>
            <p className="text-xs text-stone-500">repeat clients</p>
          </div>
          <div>
            <p className="text-xl font-bold text-stone-100">{totalGuests}</p>
            <p className="text-xs text-stone-500">guests served</p>
          </div>
        </div>

        {/* Reflection prompt */}
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full text-left text-sm text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-2 rounded-md hover:bg-indigo-950/50"
          >
            What went well? What to improve?
          </button>
        ) : (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-stone-400">
              Take a moment to reflect on last week. What patterns stood out? What would you do
              differently?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700"
              >
                Got it, dismiss
              </button>
              <a
                href="/meal-prep/retro"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-md bg-indigo-950/50 hover:bg-indigo-950/80"
              >
                Open full retro
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
