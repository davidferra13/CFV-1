'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, CheckCircle, ChevronDown, ChevronUp, Users } from '@/components/ui/icons'
import type {
  DietarySummaryCounts,
  GuestDietaryEntry,
} from '@/lib/dinner-circles/guest-dietary-summary'
import { sendDietaryReminder } from '@/lib/dinner-circles/dietary-reminder-actions'

type DietaryCollectionNudgeProps = {
  eventId: string
  responded: number
  total: number
  summary: DietarySummaryCounts
  guests: GuestDietaryEntry[]
  shareUrl: string | null
}

function SummaryRow({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-200">{count}</span>
    </div>
  )
}

export function DietaryCollectionNudge({
  eventId,
  responded,
  total,
  summary,
  guests,
  shareUrl,
}: DietaryCollectionNudgeProps) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [reminderSent, setReminderSent] = useState(false)

  if (total === 0 && responded === 0) return null

  const allResponded = responded === total && total > 0
  const nonResponders = guests.filter((g) => !g.hasResponded)
  const progressPercent = total > 0 ? Math.round((responded / total) * 100) : 0

  function handleSendReminder() {
    startTransition(async () => {
      try {
        await sendDietaryReminder(eventId)
        setReminderSent(true)
      } catch {
        // Action failed silently; toast would be ideal but keeping simple
      }
    })
  }

  return (
    <Card className="border-stone-700 bg-stone-950/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-semibold text-stone-100">Guest Dietary Info</h3>
          </div>
          {allResponded && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Complete
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-400">
              {responded} of {total} guests submitted dietary info
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Reminder action */}
        {!allResponded && nonResponders.length > 0 && shareUrl && (
          <div className="mt-3">
            {reminderSent ? (
              <p className="text-xs text-emerald-400">
                Reminder sent to {nonResponders.length} non-responder
                {nonResponders.length !== 1 ? 's' : ''}.
              </p>
            ) : (
              <Button
                onClick={handleSendReminder}
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-1.5"
              >
                <Bell className="h-3.5 w-3.5" />
                {isPending
                  ? 'Sending...'
                  : `Send reminder to ${nonResponders.length} non-responder${nonResponders.length !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        )}

        {/* Summary counts */}
        {responded > 0 && (
          <div className="mt-3 space-y-0.5">
            <SummaryRow label="Allergies" count={summary.allergies} />
            <SummaryRow label="Vegetarian" count={summary.vegetarian} />
            <SummaryRow label="Vegan" count={summary.vegan} />
            <SummaryRow label="Gluten-free" count={summary.glutenFree} />
            <SummaryRow label="No restrictions" count={summary.noRestrictions} />
            {summary.other > 0 && <SummaryRow label="Other" count={summary.other} />}
          </div>
        )}

        {/* Expandable detail */}
        {guests.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              {expanded ? 'Hide details' : 'View all guests'}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {expanded && (
              <div className="mt-2 space-y-1.5">
                {guests.map((guest, idx) => {
                  const allItems = [
                    ...guest.restrictions,
                    ...guest.allergies.map((a) => `Allergy: ${a}`),
                  ]
                  return (
                    <div
                      key={idx}
                      className="rounded border border-stone-800 bg-stone-900/50 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-200">{guest.name}</span>
                        {!guest.hasResponded && (
                          <span className="text-[10px] uppercase tracking-wider text-stone-600">
                            Pending
                          </span>
                        )}
                      </div>
                      {allItems.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-stone-500">{allItems.join(', ')}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
