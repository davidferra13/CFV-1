'use client'

import { useState, useTransition } from 'react'
import type { MealReaction, MealFeedbackSummary } from '@/lib/hub/types'
import { submitMealFeedback, removeMealFeedback } from '@/lib/hub/meal-feedback-actions'

const QUICK_NOTES = [
  'Loved it!',
  'More of this please',
  'Too spicy for the kids',
  'Can we have this again?',
  'Not a favorite',
]

interface MealFeedbackProps {
  mealEntryId: string
  profileToken: string | null
  initialSummary: MealFeedbackSummary
  initialMyReaction: MealReaction | null
  isChefOrAdmin: boolean
}

export function MealFeedbackInline({
  mealEntryId,
  profileToken,
  initialSummary,
  initialMyReaction,
  isChefOrAdmin,
}: MealFeedbackProps) {
  const [summary, setSummary] = useState<MealFeedbackSummary>(initialSummary)
  const [myReaction, setMyReaction] = useState<MealReaction | null>(initialMyReaction)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggleReaction = (reaction: MealReaction) => {
    if (!profileToken) return

    const previousSummary = { ...summary }
    const previousReaction = myReaction

    if (myReaction === reaction) {
      // Un-react
      setMyReaction(null)
      setSummary((prev) => ({
        ...prev,
        [reaction]: Math.max(0, prev[reaction] - 1),
        total: Math.max(0, prev.total - 1),
      }))

      startTransition(async () => {
        try {
          const result = await removeMealFeedback({ mealEntryId, profileToken })
          if (!result.success) {
            setMyReaction(previousReaction)
            setSummary(previousSummary)
          }
        } catch {
          setMyReaction(previousReaction)
          setSummary(previousSummary)
        }
      })
    } else {
      // React (or switch reaction)
      setMyReaction(reaction)
      setSummary((prev) => {
        const updated = { ...prev }
        if (previousReaction) {
          updated[previousReaction] = Math.max(0, updated[previousReaction] - 1)
        } else {
          updated.total++
        }
        updated[reaction]++
        return updated
      })

      startTransition(async () => {
        try {
          const result = await submitMealFeedback({
            mealEntryId,
            profileToken,
            reaction,
          })
          if (!result.success) {
            setMyReaction(previousReaction)
            setSummary(previousSummary)
          }
        } catch {
          setMyReaction(previousReaction)
          setSummary(previousSummary)
        }
      })
    }
  }

  const submitNote = () => {
    if (!profileToken || !noteText.trim()) return

    const reaction = myReaction ?? 'neutral'

    startTransition(async () => {
      try {
        const result = await submitMealFeedback({
          mealEntryId,
          profileToken,
          reaction,
          note: noteText.trim(),
        })
        if (result.success) {
          setMyReaction(reaction)
          setShowNote(false)
          setNoteText('')
          // Add note to local summary
          setSummary((prev) => ({
            ...prev,
            notes: [...prev.notes, { profile_name: 'You', note: noteText.trim(), reaction }],
          }))
        }
      } catch {
        // Silently fail on note
      }
    })
  }

  const hasAnyFeedback = summary.total > 0
  const positiveCount = summary.loved + summary.liked
  const negativeCount = summary.disliked

  return (
    <div className="mt-1.5 border-t border-stone-700/50 pt-1.5">
      <div className="flex items-center gap-2">
        {/* Summary counts */}
        {hasAnyFeedback && (
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
            {positiveCount > 0 && (
              <span className="flex items-center gap-0.5">
                <ThumbUpIcon className="h-2.5 w-2.5 text-emerald-500" />
                {positiveCount}
              </span>
            )}
            {negativeCount > 0 && (
              <span className="flex items-center gap-0.5">
                <ThumbDownIcon className="h-2.5 w-2.5 text-red-400" />
                {negativeCount}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        {profileToken && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => toggleReaction('loved')}
              disabled={isPending}
              className={`rounded-full p-1 transition-colors ${
                myReaction === 'loved'
                  ? 'bg-emerald-900/50 text-emerald-400'
                  : 'text-stone-600 hover:bg-stone-700 hover:text-stone-400'
              }`}
              title="Loved it"
            >
              <ThumbUpIcon className="h-3 w-3" filled={myReaction === 'loved'} />
            </button>
            <button
              type="button"
              onClick={() => toggleReaction('disliked')}
              disabled={isPending}
              className={`rounded-full p-1 transition-colors ${
                myReaction === 'disliked'
                  ? 'bg-red-900/50 text-red-400'
                  : 'text-stone-600 hover:bg-stone-700 hover:text-stone-400'
              }`}
              title="Not for me"
            >
              <ThumbDownIcon className="h-3 w-3" filled={myReaction === 'disliked'} />
            </button>
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="rounded-full p-1 text-stone-600 hover:bg-stone-700 hover:text-stone-400"
              title="Add a note"
            >
              <NoteIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Note input with quick presets */}
      {showNote && profileToken && (
        <div className="mt-1.5 space-y-1">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1">
            {QUICK_NOTES.map((qn) => (
              <button
                key={qn}
                type="button"
                onClick={() => setNoteText(qn)}
                className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                  noteText === qn
                    ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                    : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                }`}
              >
                {qn}
              </button>
            ))}
          </div>
          {/* Custom input */}
          <div className="flex gap-1">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Or type your own..."
              maxLength={200}
              className="flex-1 rounded bg-stone-700 px-2 py-0.5 text-[10px] text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && noteText.trim()) submitNote()
                if (e.key === 'Escape') setShowNote(false)
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={submitNote}
              disabled={!noteText.trim() || isPending}
              className="rounded bg-[var(--hub-primary,#e88f47)] px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes preview (latest note) */}
      {summary.notes.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-[10px] text-stone-500 hover:text-stone-400"
          >
            {summary.notes.length === 1
              ? `"${summary.notes[0].note}"`
              : `${summary.notes.length} notes`}
          </button>

          {/* Expanded notes (chef view or anyone who clicks) */}
          {showNotes && (
            <div className="mt-1 space-y-0.5">
              {summary.notes.map((n, i) => (
                <div key={i} className="flex items-start gap-1 text-[10px] text-stone-500">
                  <span className="font-medium text-stone-400 shrink-0">{n.profile_name}:</span>
                  <span>"{n.note}"</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons (inline SVG for zero dependencies)
// ---------------------------------------------------------------------------

function ThumbUpIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
      />
    </svg>
  )
}

function ThumbDownIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"
      />
    </svg>
  )
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
      />
    </svg>
  )
}
