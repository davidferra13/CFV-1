'use client'

// DemoDataManager — Load or clear sample data from settings / onboarding.
// Buttons trigger server actions. Shows status after each operation.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { seedDemoData, clearDemoData } from '@/lib/onboarding/demo-data'
import { Button } from '@/components/ui/button'

interface Props {
  hasDemoData: boolean
}

export function DemoDataManager({ hasDemoData: initialHas }: Props) {
  const [hasDemo, setHasDemo] = useState(initialHas)
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleLoad() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await seedDemoData()
        if (result.error === 'Demo data already exists') {
          setMessage('Sample data is already loaded.')
          setHasDemo(true)
        } else if (result.created) {
          setMessage(
            `Loaded ${result.clientsCreated} sample clients, ${result.eventsCreated} events, ${result.inquiriesCreated} inquiry.`
          )
          setHasDemo(true)
        } else {
          setMessage(result.error ?? 'Something went wrong.')
        }
      } catch (err) {
        toast.error('Failed to load sample data')
      }
    })
  }

  function handleClear() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await clearDemoData()
        if (result.cleared) {
          setMessage('Sample data cleared.')
          setHasDemo(false)
        } else {
          setMessage(result.error ?? 'Something went wrong.')
        }
      } catch (err) {
        toast.error('Failed to clear sample data')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-400">
        Load realistic sample clients, events, and an inquiry so you can explore ChefFlow before
        adding your own data. All sample records are clearly marked and can be removed at any time.
      </p>
      <div className="flex items-center gap-3">
        {!hasDemo ? (
          <Button variant="secondary" onClick={handleLoad}>
            Load Sample Data
          </Button>
        ) : (
          <Button variant="danger" onClick={handleClear}>
            Clear Sample Data
          </Button>
        )}
        {message && <p className="text-sm text-stone-500">{message}</p>}
      </div>
    </div>
  )
}
