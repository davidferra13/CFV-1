'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { triggerGmailSync } from '@/lib/gmail/actions'

export function SyncNowButton() {
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<string | null>(null)
  const router = useRouter()

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
        router.refresh()
      } catch {
        setLastResult('Sync failed')
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
