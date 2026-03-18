'use client'

// Inline AAR Widget - quick debrief form for recently completed events
// Shows on dashboard when events are completed but no AAR has been filed
// Simplified version of the full AAR form (calm, prep, what went well/wrong)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle } from '@/components/ui/icons'
import type { EventNeedingAAR } from '@/lib/dashboard/actions'

interface Props {
  events: EventNeedingAAR[]
}

const RATING_LABELS = ['Rough', 'Tough', 'OK', 'Good', 'Great']

function RatingSelector({
  name,
  label,
  value,
  onChange,
}: {
  name: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-400 mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
              value === n
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value > 0 && <p className="text-xxs text-stone-500 mt-0.5">{RATING_LABELS[value - 1]}</p>}
    </div>
  )
}

export function InlineAARWidget({ events }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  // Form state
  const [calmRating, setCalmRating] = useState(0)
  const [prepRating, setPrepRating] = useState(0)
  const [wentWell, setWentWell] = useState('')
  const [wentWrong, setWentWrong] = useState('')
  const [forgottenItems, setForgottenItems] = useState('')

  const visibleEvents = events.filter((e) => !dismissed.has(e.id) && !completed.has(e.id))

  if (visibleEvents.length === 0) return null

  function resetForm() {
    setCalmRating(0)
    setPrepRating(0)
    setWentWell('')
    setWentWrong('')
    setForgottenItems('')
  }

  async function handleSubmit(eventId: string) {
    if (calmRating === 0 || prepRating === 0) return

    startTransition(async () => {
      try {
        const { createAAR } = await import('@/lib/aar/actions')
        await createAAR({
          event_id: eventId,
          calm_rating: calmRating,
          preparation_rating: prepRating,
          what_went_well: wentWell.trim() || undefined,
          what_went_wrong: wentWrong.trim() || undefined,
          forgotten_items: forgottenItems
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          general_notes: 'Quick AAR from dashboard',
        })

        setCompleted((prev) => new Set([...prev, eventId]))
        setExpandedId(null)
        resetForm()
        router.refresh()
      } catch {
        // Keep form open on error
      }
    })
  }

  return (
    <Card className="border-amber-700">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-stone-200">
            Quick Debrief ({visibleEvents.length})
          </span>
          <span className="text-xs text-stone-500">~3 min each</span>
        </div>

        <div className="space-y-2">
          {visibleEvents.map((evt) => {
            const isExpanded = expandedId === evt.id

            return (
              <div key={evt.id} className="rounded-lg bg-stone-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{evt.occasion}</p>
                    <p className="text-xs text-stone-500">
                      {evt.clientName} · {evt.hoursSinceCompletion}h ago
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isExpanded && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            resetForm()
                            setExpandedId(evt.id)
                          }}
                          className="text-xs text-brand-500 hover:text-brand-400 font-medium"
                        >
                          Quick debrief
                        </button>
                        <Link
                          href={`/events/${evt.id}/aar`}
                          className="text-xs text-stone-500 hover:text-stone-300"
                        >
                          Full AAR
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDismissed((prev) => new Set([...prev, evt.id]))}
                          className="text-xs text-stone-600 hover:text-stone-400"
                        >
                          Later
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <RatingSelector
                        name="calm"
                        label="How calm were you?"
                        value={calmRating}
                        onChange={setCalmRating}
                      />
                      <RatingSelector
                        name="prep"
                        label="How prepared?"
                        value={prepRating}
                        onChange={setPrepRating}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-400 block mb-1">
                        What went well?
                      </label>
                      <input
                        type="text"
                        value={wentWell}
                        onChange={(e) => setWentWell(e.target.value)}
                        placeholder="e.g. The risotto timing was perfect"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-400 block mb-1">
                        What went wrong?
                      </label>
                      <input
                        type="text"
                        value={wentWrong}
                        onChange={(e) => setWentWrong(e.target.value)}
                        placeholder="e.g. Sauce started too late"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-400 block mb-1">
                        Forgot anything? (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={forgottenItems}
                        onChange={(e) => setForgottenItems(e.target.value)}
                        placeholder="e.g. serving spoons, ice"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSubmit(evt.id)}
                        disabled={isPending || calmRating === 0 || prepRating === 0}
                      >
                        {isPending ? 'Saving...' : 'Submit AAR'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandedId(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Completed confirmation */}
        {completed.size > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>
              {completed.size} debrief{completed.size > 1 ? 's' : ''} filed
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
