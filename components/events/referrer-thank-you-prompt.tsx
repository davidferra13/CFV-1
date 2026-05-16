'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Check } from '@/components/ui/icons'
import { sendReferrerThankYou } from '@/lib/referrals/appreciation-actions'

interface ReferrerThankYouPromptProps {
  referralId: string
  referrerName: string | null
  chefName: string
}

export function ReferrerThankYouPrompt({
  referralId,
  referrerName,
  chefName,
}: ReferrerThankYouPromptProps) {
  const [sent, setSent] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (sent || dismissed) return null

  function handleSend() {
    startTransition(async () => {
      try {
        const result = await sendReferrerThankYou({ referralId })
        if (result.success) {
          setSent(true)
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
    <Card className="border-amber-700/30 bg-amber-950/20">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-200">
              Send a thank you to {referrerName || 'the referrer'}?
            </p>
            <p className="text-xs text-stone-400 mt-1">
              This booking came from a referral. A quick thank you goes a long way.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleSend} disabled={isPending} className="gap-1.5">
                {isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Send Thank You
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                disabled={isPending}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
