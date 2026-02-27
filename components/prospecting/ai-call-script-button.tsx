'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateAICallScript } from '@/lib/prospecting/pipeline-actions'
import { Loader2, PhoneCall } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AICallScriptButtonProps {
  prospectId: string
}

export function AICallScriptButton({ prospectId }: AICallScriptButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        await generateAICallScript(prospectId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate script')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Writing script...
          </>
        ) : (
          <>
            <PhoneCall className="h-4 w-4 mr-1" />
            Generate AI Call Script
          </>
        )}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
