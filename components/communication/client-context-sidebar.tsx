'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addClientNote } from '@/lib/notes/actions'
import type { ClientThreadContext } from '@/lib/communication/client-context'

const tierColors: Record<string, string> = {
  champion: 'bg-emerald-900/60 text-emerald-300 ring-emerald-500/30',
  loyal: 'bg-brand-900/60 text-brand-300 ring-brand-500/30',
  at_risk: 'bg-amber-900/60 text-amber-300 ring-amber-500/30',
  dormant: 'bg-stone-800 text-stone-400 ring-stone-600/30',
  new: 'bg-sky-900/60 text-sky-300 ring-sky-500/30',
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  })
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tierLabel(tier: string): string {
  return tier.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ClientContextSidebar({ context }: { context: ClientThreadContext }) {
  const [noteText, setNoteText] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleAddNote = () => {
    if (!noteText.trim()) return
    startTransition(async () => {
      try {
        await addClientNote({
          client_id: context.clientId,
          note_text: noteText.trim(),
          category: 'general',
        })
        setNoteText('')
        setShowNoteForm(false)
      } catch {
        // Toast would be ideal; for now the pending state unblocks
      }
    })
  }

  const hasDietary = context.dietaryRestrictions.length > 0 || context.allergies.length > 0

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4 space-y-4 sticky top-4">
      {/* Client Identity */}
      <div>
        <h3 className="text-sm font-semibold text-stone-100 truncate">{context.fullName}</h3>
        {context.healthTier && (
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tierColors[context.healthTier] ?? tierColors.new}`}
            >
              {tierLabel(context.healthTier)}
            </span>
            {context.healthScore !== null && (
              <span className="text-xs text-stone-400">Score {context.healthScore}</span>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-stone-700" />

      {/* Quick Stats */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="text-stone-500">Events</span>
          <span className="text-stone-200 text-right">{context.totalEvents}</span>
          <span className="text-stone-500">Total Spent</span>
          <span className="text-stone-200 text-right">
            {formatCurrency(context.totalSpentCents)}
          </span>
          <span className="text-stone-500">Last Event</span>
          <span className="text-stone-200 text-right">
            {context.lastEventDate ? formatRelativeDate(context.lastEventDate) : 'None'}
          </span>
          {context.openInquiries > 0 && (
            <>
              <span className="text-stone-500">Open Inquiries</span>
              <span className="text-amber-400 text-right">{context.openInquiries}</span>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      {context.upcomingEvents.length > 0 && (
        <>
          <div className="h-px bg-stone-700" />
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Upcoming</h4>
            <div className="space-y-1">
              {context.upcomingEvents.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/events/${evt.id}`}
                  className="block text-xs text-stone-300 hover:text-brand-300 truncate"
                >
                  {evt.occasion ?? 'Event'}{' '}
                  <span className="text-stone-500">
                    ({formatShortDate(evt.eventDate)}
                    {evt.guestCount ? `, ${evt.guestCount} guests` : ''})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Dietary / Allergies */}
      {hasDietary && (
        <>
          <div className="h-px bg-stone-700" />
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wide">Dietary</h4>
            <div className="flex flex-wrap gap-1">
              {context.dietaryRestrictions.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-300"
                >
                  {r}
                </span>
              ))}
              {context.allergies.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300 ring-1 ring-inset ring-red-500/30"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recent Notes */}
      {context.recentNotes.length > 0 && (
        <>
          <div className="h-px bg-stone-700" />
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Recent Notes
            </h4>
            <div className="space-y-1">
              {context.recentNotes.map((note) => (
                <p
                  key={note.id}
                  className="text-xs text-stone-400 line-clamp-2"
                  title={note.noteText}
                >
                  &ldquo;{note.noteText}&rdquo;
                </p>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-stone-700" />

      {/* Quick Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Link
            href={`/clients/${context.clientId}`}
            className="flex-1 rounded-lg bg-stone-700 px-2.5 py-1.5 text-center text-xs font-medium text-stone-200 hover:bg-stone-600 transition-colors"
          >
            View Profile
          </Link>
          <Link
            href={`/events/new?clientId=${context.clientId}`}
            className="flex-1 rounded-lg bg-stone-700 px-2.5 py-1.5 text-center text-xs font-medium text-stone-200 hover:bg-stone-600 transition-colors"
          >
            + Event
          </Link>
        </div>

        {showNoteForm ? (
          <div className="space-y-1.5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Quick note..."
              rows={2}
              className="w-full resize-none rounded-lg border border-stone-600 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddNote()
                }
              }}
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isPending || !noteText.trim()}
                className="flex-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoteForm(false)
                  setNoteText('')
                }}
                className="rounded-lg bg-stone-700 px-2.5 py-1 text-xs text-stone-400 hover:bg-stone-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNoteForm(true)}
            className="w-full rounded-lg bg-stone-700 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-600 transition-colors"
          >
            + Note
          </button>
        )}
      </div>
    </div>
  )
}
