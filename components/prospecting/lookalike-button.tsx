'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { lookalikeProspect } from '@/lib/prospecting/scrub-actions'
import { Loader2, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LookalikeButtonProps {
  prospectId: string
  prospectName: string
}

export function LookalikeButton({ prospectId, prospectName }: LookalikeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  function handleLookalike() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await lookalikeProspect(prospectId)
        setResult(
          `Found ${res.totalGenerated} similar prospects${res.enriched ? `, ${res.enriched} enriched` : ''}`
        )
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lookalike search failed'
        setResult(message)
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleLookalike} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Finding similar...
          </>
        ) : (
          <>
            <Target className="h-4 w-4 mr-1" />
            Find Lookalikes
          </>
        )}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
