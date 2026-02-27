'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { batchReEnrich } from '@/lib/prospecting/scrub-actions'
import { Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BatchReEnrichButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  function handleBatchReEnrich() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await batchReEnrich()
        setResult(res.message)
        router.refresh()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Batch re-enrich failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="sm" onClick={handleBatchReEnrich} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Refreshing stale prospects...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Stale Prospects
          </>
        )}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
