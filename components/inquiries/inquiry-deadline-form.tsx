'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateInquiry } from '@/lib/inquiries/actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

type Props = {
  inquiryId: string
  currentDeadline: string | null
  currentNextAction: string | null
}

export function InquiryDeadlineForm({ inquiryId, currentDeadline, currentNextAction }: Props) {
  const router = useRouter()
  const [deadline, setDeadline] = useState(toLocalDateTimeInput(currentDeadline))
  const [nextAction, setNextAction] = useState(currentNextAction || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = useMemo(() => {
    const originalDeadline = toLocalDateTimeInput(currentDeadline)
    const originalAction = currentNextAction || ''
    return deadline !== originalDeadline || nextAction !== originalAction
  }, [deadline, nextAction, currentDeadline, currentNextAction])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateInquiry(inquiryId, {
        follow_up_due_at: deadline ? new Date(deadline).toISOString() : null,
        next_action_required: nextAction.trim() || null,
        next_action_by: nextAction.trim() ? 'chef' : null,
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deadline')
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    setLoading(true)
    setError(null)
    try {
      await updateInquiry(inquiryId, {
        follow_up_due_at: null,
      })
      setDeadline('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear deadline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 border-t border-stone-700 pt-4">
      <p className="text-sm font-medium text-stone-300">Set Follow-up Deadline</p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Due At</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-md border border-stone-600 bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Next Action</label>
          <input
            type="text"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Follow up about menu confirmation"
            className="w-full rounded-md border border-stone-600 bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={handleClear} disabled={loading}>
          Clear
        </Button>
        <Button type="submit" disabled={loading || !hasChanges}>
          {loading ? 'Saving...' : 'Save Deadline'}
        </Button>
      </div>
    </form>
  )
}
