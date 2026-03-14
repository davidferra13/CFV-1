'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { runAutoPipelineRules } from '@/lib/prospecting/pipeline-actions'
import { Loader2, Zap } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'

export function AutoPipelineRulesButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await runAutoPipelineRules()
        const parts: string[] = []
        if (res.staleToLost > 0) parts.push(`${res.staleToLost} stale → lost`)
        if (res.followUpBumped > 0) parts.push(`${res.followUpBumped} follow-ups bumped`)
        setResult(parts.length > 0 ? parts.join(', ') : 'No changes needed')
        router.refresh()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleRun} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Running rules...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-1" />
            Auto-Clean
          </>
        )}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
