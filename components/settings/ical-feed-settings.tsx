'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, RefreshCw, Calendar } from '@/components/ui/icons'
import { toggleICalFeed, regenerateICalFeedToken } from '@/lib/integrations/ical/ical-actions'
import { toast } from 'sonner'

export function ICalFeedSettings({
  enabled: initialEnabled,
  feedUrl: initialFeedUrl,
}: {
  enabled: boolean
  feedUrl: string | null
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const prev = enabled
    const prevUrl = feedUrl
    setEnabled(!prev)

    startTransition(async () => {
      try {
        await toggleICalFeed(!prev)
        if (!prev) {
          // Re-fetch to get the feed URL
          const { getICalFeedStatus } = await import('@/lib/integrations/ical/ical-actions')
          const status = await getICalFeedStatus()
          setFeedUrl(status.feedUrl)
        }
        toast.success(!prev ? 'Calendar feed enabled' : 'Calendar feed disabled')
      } catch {
        setEnabled(prev)
        setFeedUrl(prevUrl)
        toast.error('Failed to update calendar feed')
      }
    })
  }

  function handleCopy() {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl)
      toast.success('Feed URL copied to clipboard')
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await regenerateICalFeedToken()
        setFeedUrl(result.feedUrl)
        toast.success('Feed token regenerated — update your calendar subscriptions')
      } catch {
        toast.error('Failed to regenerate feed token')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand-400" />
            <CardTitle>iCal Feed</CardTitle>
          </div>
          <Badge variant={enabled ? 'success' : 'default'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-400">
          Generate a subscribe-by-URL calendar feed that works with Apple Calendar, Outlook, and
          Google Calendar. Your events automatically sync — no manual exports needed.
        </p>

        <div className="flex gap-2">
          <Button
            variant={enabled ? 'secondary' : 'primary'}
            onClick={handleToggle}
            disabled={isPending}
          >
            {enabled ? 'Disable Feed' : 'Enable Feed'}
          </Button>
        </div>

        {enabled && feedUrl && (
          <div className="space-y-3">
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Feed URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-stone-300 break-all">{feedUrl}</code>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xs text-stone-500">
                Add this URL as a calendar subscription in your calendar app. Events refresh
                automatically every 5 minutes.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isPending}
              className="text-stone-500"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Regenerate Token
            </Button>
            <p className="text-xs text-stone-600">
              Regenerating the token will break existing subscriptions. Only do this if you suspect
              the URL has been shared with someone it shouldn&apos;t have been.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
