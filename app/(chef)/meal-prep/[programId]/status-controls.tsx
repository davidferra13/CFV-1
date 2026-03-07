'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Pause, Play, XCircle } from '@/components/ui/icons'
import {
  pauseMealPrepProgram,
  resumeMealPrepProgram,
  endMealPrepProgram,
} from '@/lib/meal-prep/program-actions'

interface ProgramStatusControlsProps {
  programId: string
  status: string
}

export function ProgramStatusControls({ programId, status }: ProgramStatusControlsProps) {
  const [pending, startTransition] = useTransition()
  const [confirmEnd, setConfirmEnd] = useState(false)
  const router = useRouter()

  if (status === 'ended') return null

  function handlePause() {
    startTransition(async () => {
      try {
        await pauseMealPrepProgram(programId)
        router.refresh()
      } catch {
        // revalidation handles refresh
      }
    })
  }

  function handleResume() {
    startTransition(async () => {
      try {
        await resumeMealPrepProgram(programId)
        router.refresh()
      } catch {
        // revalidation handles refresh
      }
    })
  }

  function handleEnd() {
    startTransition(async () => {
      try {
        await endMealPrepProgram(programId)
        router.push('/meal-prep')
      } catch {
        // revalidation handles refresh
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {status === 'active' && (
        <Button variant="secondary" size="sm" disabled={pending} onClick={handlePause}>
          <Pause className="w-4 h-4 mr-1" />
          Pause
        </Button>
      )}

      {status === 'paused' && (
        <Button variant="primary" size="sm" disabled={pending} onClick={handleResume}>
          <Play className="w-4 h-4 mr-1" />
          Resume
        </Button>
      )}

      {!confirmEnd ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmEnd(true)}>
          <XCircle className="w-4 h-4 mr-1" />
          End
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button variant="danger" size="sm" disabled={pending} onClick={handleEnd}>
            Confirm End
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmEnd(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
