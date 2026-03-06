'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface GuestUpgradePromptProps {
  profileToken: string
  guestName: string
}

/**
 * Subtle prompt shown to guest users encouraging them to create a full account.
 * Non-blocking, dismissible, positioned at the bottom of the circle page.
 */
export function GuestUpgradePrompt({ profileToken, guestName }: GuestUpgradePromptProps) {
  return (
    <Card className="border-amber-700/30 bg-gradient-to-r from-stone-900 to-amber-950/10">
      <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-stone-200">
            Hey {guestName}, want to save your preferences for next time?
          </p>
          <p className="mt-0.5 text-xs text-stone-400">
            Create a free account to keep your dietary info, get event invites, and book your own
            dinners.
          </p>
        </div>
        <a href={`/auth/signup?upgrade=${profileToken}`} className="shrink-0">
          <Button variant="primary" size="sm">
            Create Free Account
          </Button>
        </a>
      </CardContent>
    </Card>
  )
}
