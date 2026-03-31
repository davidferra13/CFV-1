'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getClientTriggerCompletionStatus,
  type TriggerCompletionStatus,
} from '@/lib/loyalty/actions'
import { TRIGGER_CATEGORY_LABELS, type TriggerCategory } from '@/lib/loyalty/trigger-registry'

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function EmptyCircle() {
  return <div className="h-5 w-5 rounded-full border-2 border-stone-600 shrink-0" />
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-5 w-5 rounded-full bg-stone-800 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-stone-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-stone-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function AchievementRow({ trigger }: { trigger: TriggerCompletionStatus }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-800/50 last:border-b-0">
      {trigger.completed ? <CheckIcon /> : <EmptyCircle />}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            trigger.completed ? 'text-stone-500 line-through' : 'text-stone-300'
          }`}
        >
          {trigger.label}
        </p>
        {!trigger.completed && (
          <p className="text-xs text-stone-500 mt-0.5">{trigger.description}</p>
        )}
      </div>
      <span
        className={`text-xs font-semibold shrink-0 ${
          trigger.completed ? 'text-emerald-600' : 'text-brand-400'
        }`}
      >
        {trigger.completed ? 'Earned' : `+${trigger.points} pts`}
      </span>
    </div>
  )
}

function BonusRow({ trigger }: { trigger: TriggerCompletionStatus }) {
  const freqHint = trigger.frequency === 'per_event' ? 'per event' : 'every time'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-800/50 last:border-b-0">
      <div className="h-5 w-5 flex items-center justify-center shrink-0">
        <div className="h-2 w-2 rounded-full bg-brand-500/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-300">{trigger.label}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-semibold text-brand-400">+{trigger.points} pts</span>
        <p className="text-[10px] text-stone-600">{freqHint}</p>
      </div>
    </div>
  )
}

interface EarningQuestBoardProps {
  fallback: React.ReactNode
}

export function EarningQuestBoard({ fallback }: EarningQuestBoardProps) {
  const [triggers, setTriggers] = useState<TriggerCompletionStatus[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await getClientTriggerCompletionStatus()
        if (!cancelled) {
          setTriggers(result)
          setLoading(false)
        }
      } catch (err) {
        console.error('[EarningQuestBoard] Failed to load triggers:', err)
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Error or no data: fall back to standard HowToEarnPanel
  if (error || (!loading && (!triggers || triggers.length === 0))) {
    return <>{fallback}</>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ways to Earn</CardTitle>
          <p className="text-sm text-stone-500 mt-1">Complete actions to earn bonus points</p>
        </CardHeader>
        <CardContent>
          <SkeletonRows />
        </CardContent>
      </Card>
    )
  }

  const oneTime = triggers!.filter((t) => t.frequency === 'one_time')
  const repeatable = triggers!.filter((t) => t.frequency !== 'one_time')

  // Group repeatable by category
  const byCategory = new Map<string, TriggerCompletionStatus[]>()
  for (const t of repeatable) {
    const list = byCategory.get(t.category) || []
    list.push(t)
    byCategory.set(t.category, list)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ways to Earn</CardTitle>
        <p className="text-sm text-stone-500 mt-1">Complete actions to earn bonus points</p>
      </CardHeader>
      <CardContent>
        {/* One-time achievements */}
        {oneTime.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
              Achievements
            </p>
            {oneTime.map((t) => (
              <AchievementRow key={t.triggerKey} trigger={t} />
            ))}
          </div>
        )}

        {/* Repeatable bonus actions */}
        {byCategory.size > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
              Bonus Actions
            </p>
            {Array.from(byCategory.entries()).map(([cat, items]) => (
              <div key={cat} className="mb-3 last:mb-0">
                <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-1">
                  {TRIGGER_CATEGORY_LABELS[cat as TriggerCategory] || cat}
                </p>
                {items.map((t) => (
                  <BonusRow key={t.triggerKey} trigger={t} />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
