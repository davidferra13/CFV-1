'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { triggerGmailSync } from '@/lib/gmail/actions'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

export function SyncNowButton() {
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const handleSync = () => {
    setLastResult(null)
    startTransition(async () => {
      try {
        const result = await triggerGmailSync()
        const parts: string[] = []
        if (result.inquiriesCreated > 0) parts.push(`${result.inquiriesCreated} new inquiries`)
        if (result.messagesLogged > 0) parts.push(`${result.messagesLogged} messages`)
        if (result.processed > 0 && parts.length === 0) parts.push(`${result.processed} processed`)
        setLastResult(parts.length > 0 ? parts.join(', ') : 'Up to date')
        trackedRouterRefresh(router, {
          pathname,
          source: 'gmail-sync-now',
          entity: 'gmail',
          event: 'manual_sync',
          reason: parts.length > 0 ? parts.join(', ') : 'up-to-date',
        })
      } catch {
        setLastResult('Sync failed')
        toast.error('Gmail sync failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending}
        onClick={handleSync}
        title="Sync Gmail now"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Syncing...' : 'Sync Now'}
      </Button>
      {lastResult && <span className="text-xs text-stone-400">{lastResult}</span>}
    </div>
  )
}
