'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveRevenueEntry } from './revenue-actions'

export function RevenueForm() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveRevenueEntry(formData)
        toast.success('Revenue saved')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save revenue')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="date"
          type="date"
          defaultValue={today}
          required
        />
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Total sales ($)"
          required
        />
      </div>
      <Input name="notes" placeholder="Notes (optional)" />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? 'Saving...' : 'Save Revenue'}
      </Button>
    </form>
  )
}
