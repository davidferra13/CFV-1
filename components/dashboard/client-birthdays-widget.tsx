'use client'

// Client Birthdays/Anniversaries Widget
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Gift } from '@/components/ui/icons'
import { generateBirthdayDraft } from '@/lib/daily-ops/draft-engine'
import type { UpcomingBirthday } from '@/lib/dashboard/widget-actions'

interface Props {
  birthdays: UpcomingBirthday[]
}

interface DraftState {
  body: string
  copied: boolean
}

export function ClientBirthdaysWidget({ birthdays }: Props) {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()

  if (birthdays.length === 0) return null

  const key = (b: UpcomingBirthday) => `${b.clientId}-${b.milestone}`

  const handleDraft = (b: UpcomingBirthday) => {
    const k = key(b)
    if (drafts[k] || generating[k]) return
    setGenerating((prev) => ({ ...prev, [k]: true }))
    startTransition(async () => {
      try {
        const result = await generateBirthdayDraft(
          b.clientId,
          b.milestone.toLowerCase().includes('anniversary') ? 'anniversary' : 'birthday'
        )
        setDrafts((prev) => ({ ...prev, [k]: { body: result.body, copied: false } }))
      } catch {
        setDrafts((prev) => ({
          ...prev,
          [k]: { body: 'Could not generate draft. Try again.', copied: false },
        }))
      } finally {
        setGenerating((prev) => ({ ...prev, [k]: false }))
      }
    })
  }

  const handleCopy = (k: string, body: string) => {
    navigator.clipboard.writeText(body).then(() => {
      setDrafts((prev) => ({ ...prev, [k]: { ...prev[k], copied: true } }))
      setTimeout(() => {
        setDrafts((prev) => ({ ...prev, [k]: { ...prev[k], copied: false } }))
      }, 2000)
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-brand-500 shrink-0" />
        <h3 className="text-sm font-semibold text-stone-100">Upcoming Milestones</h3>
        <span className="text-xs text-stone-400 ml-auto">{birthdays.length} coming up</span>
      </div>
      <div className="space-y-3">
        {birthdays.map((b) => {
          const k = key(b)
          const urgency =
            b.daysUntil <= 2
              ? 'text-red-400'
              : b.daysUntil <= 5
                ? 'text-amber-400'
                : 'text-stone-400'
          const draft = drafts[k]
          const isGenerating = generating[k]

          return (
            <div key={k} className="rounded-md">
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-100 truncate">{b.clientName}</p>
                  <p className="text-xs text-stone-500">{b.milestone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-semibold ${urgency}`}>
                    {b.daysUntil === 0
                      ? 'Today!'
                      : b.daysUntil === 1
                        ? 'Tomorrow'
                        : `${b.daysUntil} days`}
                  </span>
                  {!draft && (
                    <button
                      type="button"
                      onClick={() => handleDraft(b)}
                      disabled={isGenerating}
                      className="text-xs text-brand-400 hover:text-brand-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? 'Drafting...' : 'Draft note'}
                    </button>
                  )}
                </div>
              </div>

              {draft && (
                <div className="mx-1 mb-1 rounded-md border border-stone-700 bg-stone-900/60 p-3 space-y-2">
                  <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {draft.body}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(k, draft.body)}
                      className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      {draft.copied ? 'Copied!' : 'Copy'}
                    </button>
                    <Link
                      href={`/clients/${b.clientId}?tab=messages`}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Open messages
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setDrafts((prev) => {
                          const next = { ...prev }
                          delete next[k]
                          return next
                        })
                      }
                      className="text-xs text-stone-600 hover:text-stone-400 transition-colors ml-auto"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-3">
        Send a personal note to strengthen the relationship
      </p>
    </Card>
  )
}
