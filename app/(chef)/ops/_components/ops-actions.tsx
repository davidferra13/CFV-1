'use client'

// OpsActions - Service day lifecycle controls (start service, close, etc.)

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createServiceDay, transitionServiceDay } from '@/lib/restaurant/service-day-actions'
import { generatePrepRequirements } from '@/lib/restaurant/prep-generation-actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function OpsActions({
  serviceDayId,
  status,
}: {
  serviceDayId?: string | null
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [covers, setCovers] = useState('')

  function handleCreateServiceDay() {
    startTransition(async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const result = await createServiceDay({
          service_date: today,
          expected_covers: covers ? parseInt(covers) : undefined,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success('Service day created')
        setShowCreate(false)
        router.refresh()
      } catch (err) {
        toast.error('Failed to create service day')
      }
    })
  }

  function handleTransition(toStatus: 'prep' | 'active' | 'closed') {
    if (!serviceDayId) return
    startTransition(async () => {
      try {
        const result = await transitionServiceDay(serviceDayId, toStatus)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(
          `Service ${toStatus === 'closed' ? 'closed' : toStatus === 'active' ? 'started' : 'moved to prep'}`
        )
        router.refresh()
      } catch (err) {
        toast.error('Transition failed')
      }
    })
  }

  function handleGeneratePrep() {
    if (!serviceDayId) return
    startTransition(async () => {
      try {
        const result = await generatePrepRequirements(serviceDayId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`Generated ${result.generated} prep items`)
        router.refresh()
      } catch (err) {
        toast.error('Prep generation failed')
      }
    })
  }

  if (status === 'no_service') {
    if (showCreate) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={covers}
            onChange={(e) => setCovers(e.target.value)}
            placeholder="Expected covers"
            className="w-36 px-3 py-1.5 text-sm rounded-lg bg-stone-900 border border-stone-700 text-stone-200 placeholder:text-stone-600"
          />
          <Button variant="primary" onClick={handleCreateServiceDay} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
        </div>
      )
    }
    return (
      <Button variant="primary" onClick={() => setShowCreate(true)}>
        Start Service Day
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'planning' && (
        <>
          <Button variant="ghost" onClick={handleGeneratePrep} disabled={isPending}>
            Generate Prep
          </Button>
          <Button variant="primary" onClick={() => handleTransition('prep')} disabled={isPending}>
            Begin Prep
          </Button>
        </>
      )}
      {status === 'prep' && (
        <Button variant="primary" onClick={() => handleTransition('active')} disabled={isPending}>
          Open Service
        </Button>
      )}
      {status === 'active' && (
        <Button variant="danger" onClick={() => handleTransition('closed')} disabled={isPending}>
          Close Service
        </Button>
      )}
    </div>
  )
}
