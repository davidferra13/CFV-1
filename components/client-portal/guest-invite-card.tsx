'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Share2, Users, CheckCircle } from '@/components/ui/icons'
import { format, subDays } from 'date-fns'

type GuestInviteCardProps = {
  chefName: string
  shareUrl: string | null
  responded: number
  total: number
  eventDate: string | null
}

export function GuestInviteCard({
  chefName,
  shareUrl,
  responded,
  total,
  eventDate,
}: GuestInviteCardProps) {
  const [copied, setCopied] = useState(false)

  if (!shareUrl) return null

  const deadline = eventDate ? format(subDays(new Date(eventDate), 7), 'MMMM d, yyyy') : null

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text for manual copy
    }
  }

  async function handleShare() {
    if (!shareUrl) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Guest dietary info for ${chefName}`,
          text: 'Submit your dietary needs and preferences for the upcoming dinner.',
          url: shareUrl,
        })
      } catch {
        // User cancelled or share not supported
      }
    } else {
      handleCopy()
    }
  }

  const progressPercent = total > 0 ? Math.round((responded / total) * 100) : 0

  return (
    <Card className="border-brand-800/60 bg-brand-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900/50">
            <Users className="h-5 w-5 text-brand-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-100">
              Help {chefName} plan the perfect menu
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-400">
              Share this link with your guests so they can submit dietary needs and preferences.
            </p>
          </div>
        </div>

        {/* Progress tracker */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-300">
                {responded} of {total} guests have responded
              </span>
              {responded === total && responded > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  All responded
                </span>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Share actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="inline-flex items-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            variant="secondary"
            className="inline-flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Deadline suggestion */}
        {deadline && (
          <p className="mt-4 text-xs text-stone-500">
            We recommend collecting responses by {deadline}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
