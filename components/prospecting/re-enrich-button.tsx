'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { reEnrichProspect } from '@/lib/prospecting/scrub-actions'
import { Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReEnrichButtonProps {
  prospectId: string
}

export function ReEnrichButton({ prospectId }: ReEnrichButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const router = useRouter()

  function handleReEnrich() {
    setDone(false)
    startTransition(async () => {
      try {
        await reEnrichProspect(prospectId)
        setDone(true)
        router.refresh()
      } catch (err) {
        console.error('[re-enrich] Failed:', err)
      }
    })
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleReEnrich} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Re-enriching...
        </>
      ) : done ? (
        <>
          <RefreshCw className="h-4 w-4 mr-1" />
          Re-enriched!
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-1" />
          Re-Enrich
        </>
      )}
    </Button>
  )
}
