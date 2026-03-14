'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateFollowUpSequence } from '@/lib/prospecting/pipeline-actions'
import { Loader2, MailPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FollowUpSequenceButtonProps {
  prospectId: string
  hasDraftEmail: boolean
}

export function FollowUpSequenceButton({ prospectId, hasDraftEmail }: FollowUpSequenceButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        await generateFollowUpSequence(prospectId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate sequence')
      }
    })
  }

  if (!hasDraftEmail) {
    return (
      <span className="text-xs text-stone-500 italic">Enrich first to generate email sequence</span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Generating sequence...
          </>
        ) : (
          <>
            <MailPlus className="h-4 w-4 mr-1" />
            Generate Follow-Up Sequence
          </>
        )}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
