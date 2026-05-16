'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Camera, Heart, Users, PartyPopper } from '@/components/ui/icons'
import { sendReferrerThankYou } from '@/lib/referrals/appreciation-actions'
import type {
  DietarySummaryCounts,
  GuestDietaryEntry,
} from '@/lib/dinner-circles/guest-dietary-summary'

interface PostEventChecklistProps {
  eventId: string
  photoCount: number
  referralId?: string | null
  referrerName?: string | null
  chefName: string
  dietaryResponded: number
  dietaryTotal: number
  dietarySummary?: DietarySummaryCounts | null
  dietaryGuests?: GuestDietaryEntry[]
  dietaryShareUrl?: string | null
}

export function PostEventChecklist({
  eventId,
  photoCount,
  referralId,
  referrerName,
  chefName,
  dietaryResponded,
  dietaryTotal,
}: PostEventChecklistProps) {
  const [dismissed, setDismissed] = useState(false)
  const [thankYouSent, setThankYouSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [allDoneCollapsed, setAllDoneCollapsed] = useState(false)

  const storageKey = `post-event-checklist-${eventId}-dismissed`

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      setDismissed(true)
    }
  }, [storageKey])

  // Determine which items are applicable
  const showPhotos = true // always applicable
  const showThankReferrer = !!referralId
  const showDietary = dietaryTotal > 0

  const applicableCount = [showPhotos, showThankReferrer, showDietary].filter(Boolean).length

  if (applicableCount === 0 || dismissed) return null

  // Completion states
  const photosComplete = photoCount > 0
  const thankYouComplete = thankYouSent
  const dietaryComplete = dietaryTotal > 0 && dietaryResponded === dietaryTotal

  const completedCount = [
    showPhotos && photosComplete,
    showThankReferrer && thankYouComplete,
    showDietary && dietaryComplete,
  ].filter(Boolean).length

  const allComplete = completedCount === applicableCount

  // Auto-collapse after 5 seconds when all done
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setAllDoneCollapsed(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [allComplete])

  if (allDoneCollapsed) return null

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, '1')
    }
    setDismissed(true)
  }

  function handleSendThankYou() {
    if (!referralId) return
    startTransition(async () => {
      try {
        const result = await sendReferrerThankYou({ referralId })
        if (result.success) {
          setThankYouSent(true)
          toast.success(`Thank you sent to ${referrerName || 'referrer'}`)
        } else {
          toast.error(result.error || 'Failed to send thank you')
        }
      } catch {
        toast.error('Something went wrong')
      }
    })
  }

  return (
    <Card className="border-stone-700/50 bg-stone-900/50">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-200">
            {allComplete ? (
              <span className="flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-green-400" />
                All done!
              </span>
            ) : (
              'After the Event'
            )}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {completedCount} of {applicableCount} complete
            </span>
            {!allComplete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-stone-500"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {showPhotos && (
            <ChecklistRow
              icon={<Camera className="w-4 h-4" />}
              label="Upload event photos"
              complete={photosComplete}
              action={
                <Link href={`/events/${eventId}/photos`}>
                  <Button size="sm" variant="secondary" className="h-7 text-xs">
                    Upload
                  </Button>
                </Link>
              }
            />
          )}

          {showThankReferrer && (
            <ChecklistRow
              icon={<Heart className="w-4 h-4" />}
              label={`Send thank you to ${referrerName || 'referrer'}`}
              complete={thankYouComplete}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={handleSendThankYou}
                  disabled={isPending}
                >
                  {isPending ? 'Sending...' : 'Send'}
                </Button>
              }
            />
          )}

          {showDietary && (
            <ChecklistRow
              icon={<Users className="w-4 h-4" />}
              label="Dietary responses collected"
              complete={dietaryComplete}
              action={
                <span className="text-xs text-stone-400">
                  {dietaryResponded}/{dietaryTotal} responded
                </span>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistRow({
  icon,
  label,
  complete,
  action,
}: {
  icon: React.ReactNode
  label: string
  complete: boolean
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-stone-800/40">
      <div className={complete ? 'text-green-400' : 'text-stone-500'}>{icon}</div>
      <span
        className={`flex-1 text-sm ${complete ? 'text-stone-400 line-through' : 'text-stone-200'}`}
      >
        {label}
      </span>
      {complete ? <Check className="w-4 h-4 text-green-400" /> : action}
    </div>
  )
}
