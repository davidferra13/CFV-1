'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { declineInquiry } from '@/lib/inquiries/actions'
import { captureSoftCloseLeverage } from '@/lib/inquiries/soft-close-leverage-actions'
import { toast } from 'sonner'

const SOFT_CLOSE_DECLINE_REASON = 'Plans changed / maybe future'
const DEFAULT_TAG = 'warm-future-lead'

interface SoftCloseLeverageCardProps {
  inquiryId: string
  inquiryStatus: string
  declineReason: string | null
  /** Soft-close mode only shown when future interest is detected or inquiry is already declined for this reason */
  futureInterest: boolean
  /** Dietary restrictions from the inquiry, for merge offer */
  inquiryDietary: string[]
  /** Discussed dishes from the inquiry, for merge offer */
  inquiryDishes: string[]
  contactName: string | null
  /** Date the inquiry was created, for default note text */
  closedAt: string | null
  clientId: string | null
  contactEmail: string | null
}

function buildDefaultNote(contactName: string | null, closedAt: string | null): string {
  const name = contactName ?? 'Client'
  const date = closedAt
    ? new Date(closedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `Soft close on ${date}. ${name} said this trip changed, but explicitly wants to revisit on a future visit. Keep warm.`
}

export function SoftCloseLeverageCard({
  inquiryId,
  inquiryStatus,
  declineReason,
  futureInterest,
  inquiryDietary,
  inquiryDishes,
  contactName,
  closedAt,
  clientId,
  contactEmail,
}: SoftCloseLeverageCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State 2: leverage capture form
  const [tags, setTags] = useState<string>(DEFAULT_TAG)
  const [mergeDietary, setMergeDietary] = useState(inquiryDietary.length > 0)
  const [mergeDiscussedDishes, setMergeDiscussedDishes] = useState(inquiryDishes.length > 0)
  const [noteText, setNoteText] = useState(buildDefaultNote(contactName, closedAt))
  const [saveResult, setSaveResult] = useState<{
    clientId: string
    applied: {
      clientCreated: boolean
      tagsAdded: number
      dietaryMerged: boolean
      dishesMerged: boolean
      noteSaved: boolean
    }
  } | null>(null)

  // State 1: detected soft close, inquiry still open
  const isDetectedSoftClose =
    inquiryStatus === 'awaiting_chef' &&
    futureInterest &&
    declineReason !== SOFT_CLOSE_DECLINE_REASON

  // State 2: already declined for this specific reason
  const isDeclinedFuture =
    inquiryStatus === 'declined' && declineReason === SOFT_CLOSE_DECLINE_REASON

  if (!isDetectedSoftClose && !isDeclinedFuture) return null

  // ── State 1: guide the chef to close the current cycle ─────────────────────
  if (isDetectedSoftClose) {
    return (
      <Card className="p-5 border border-amber-700/40 bg-amber-950/20">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
          <div className="space-y-3 flex-1">
            <div>
              <p className="text-sm font-semibold text-amber-300">
                This is a soft close, not a response debt
              </p>
              <p className="text-sm text-stone-400 mt-1">
                The client paused their plans and left the door open. The right move is to close
                this cycle cleanly now and preserve the relationship. No reply is required unless
                you want to send a short courtesy note after closing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await declineInquiry(inquiryId, SOFT_CLOSE_DECLINE_REASON)
                      router.refresh()
                    } catch {
                      toast.error('Could not decline the inquiry. Please try again.')
                    }
                  })
                }}
              >
                {isPending ? 'Closing...' : 'Close as Plans Changed / Maybe Future'}
              </Button>
              <span className="text-xs text-stone-500">
                No response required unless you want to send a brief courtesy note after.
              </span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // ── State 2: leverage capture for declined-future inquiry ──────────────────
  const canSave = clientId !== null || (!!contactEmail && !!contactName)
  const cannotSaveReason = !canSave
    ? 'A client record must be linked or the inquiry must have a contact name and email before saving leverage context.'
    : null

  if (saveResult) {
    const { applied } = saveResult
    const parts: string[] = []
    if (applied.clientCreated) parts.push('client created')
    if (applied.tagsAdded > 0)
      parts.push(`${applied.tagsAdded} tag${applied.tagsAdded > 1 ? 's' : ''} added`)
    if (applied.dietaryMerged) parts.push('dietary merged')
    if (applied.dishesMerged) parts.push('dishes merged')
    if (applied.noteSaved) parts.push('note saved')

    return (
      <Card className="p-5 border border-green-700/40 bg-green-950/20">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="success">Warm lead saved</Badge>
            <span className="text-xs text-stone-400">{parts.join(', ')}</span>
          </div>
          <p className="text-xs text-stone-400">
            Client record updated.{' '}
            <a
              href={`/clients/${saveResult.clientId}`}
              className="text-brand-400 underline underline-offset-2"
            >
              View client
            </a>
          </p>
          <p className="text-xs text-stone-500 pt-1">
            Use the composer below to send a courtesy closeout if you would like. A mode is plain
            email. B mode includes the Dinner Circle link.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 border border-stone-700 bg-stone-900/50 space-y-5">
      <div>
        <p className="text-sm font-semibold text-stone-200">Warm lead capture</p>
        <p className="text-xs text-stone-400 mt-0.5">
          Save the future-booking value from this soft close onto the client record. Takes 30
          seconds and makes reactivation easy later.
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-300">Tags</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="warm-future-lead, anniversary, food-allergies..."
          className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="text-xs text-stone-500">
          Comma-separated. Already on the client record will be skipped.
        </p>
      </div>

      {/* Merge options */}
      <div className="space-y-2">
        {inquiryDietary.length > 0 && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mergeDietary}
              onChange={(e) => setMergeDietary(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-stone-300">
              Save dietary restrictions to client preferences
              <span className="text-stone-500 ml-1">({inquiryDietary.join(', ')})</span>
            </span>
          </label>
        )}

        {inquiryDishes.length > 0 && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mergeDiscussedDishes}
              onChange={(e) => setMergeDiscussedDishes(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-stone-300">
              Save discussed dishes to favorite dishes
              <span className="text-stone-500 ml-1">
                ({inquiryDishes.slice(0, 3).join(', ')}
                {inquiryDishes.length > 3 ? ` +${inquiryDishes.length - 3} more` : ''})
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Relationship note */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-300">Relationship note</label>
        <textarea
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-stone-500">Saved under relationship notes (chef-only).</p>
      </div>

      {/* Cannot save explanation */}
      {cannotSaveReason && <p className="text-xs text-amber-400">{cannotSaveReason}</p>}

      <Button
        variant="primary"
        size="sm"
        disabled={!canSave || isPending}
        onClick={() => {
          const parsedTags = tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)

          startTransition(async () => {
            try {
              const result = await captureSoftCloseLeverage({
                inquiryId,
                tags: parsedTags,
                mergeDietary,
                mergeDiscussedDishes,
                relationshipNote: noteText,
              })

              if (!result.success) {
                toast.error(result.error)
                return
              }

              setSaveResult({
                clientId: result.clientId,
                applied: {
                  clientCreated: result.applied.clientCreated,
                  tagsAdded: result.applied.tagsAdded,
                  dietaryMerged: result.applied.dietaryMerged,
                  dishesMerged: result.applied.dishesMerged,
                  noteSaved: result.applied.noteSaved,
                },
              })
            } catch {
              toast.error('Failed to save warm lead context. Please try again.')
            }
          })
        }}
      >
        {isPending ? 'Saving...' : 'Save Warm Lead Context'}
      </Button>

      <div className="border-t border-stone-800 pt-4 space-y-1">
        <p className="text-xs font-medium text-stone-400">Messaging path (optional)</p>
        <p className="text-xs text-stone-500">
          A = email-only closeout (default). Use the Load A / Load B buttons in the composer below
          to pre-fill.
        </p>
        <p className="text-xs text-stone-500">
          B = Dinner Circle closeout. Only available when a circle token exists, and only use it
          when you believe the link adds real value for this client.
        </p>
      </div>
    </Card>
  )
}
