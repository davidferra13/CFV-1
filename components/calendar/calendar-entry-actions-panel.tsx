'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, DollarSign, Mail, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/lib/hooks/use-confirm'
import {
  deleteCalendarEntry,
  markCalendarEntryComplete,
  notifyClientsOfPublicSignal,
  updateCalendarEntry,
  type ChefCalendarEntry,
} from '@/lib/calendar/entry-actions'

type Props = {
  entry: ChefCalendarEntry
}

type ActionResult = {
  success?: boolean
  error?: string
  notified?: number
}

function dollarsToCents(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const normalized = trimmed.replace(/[$,]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  return Math.round(Number(normalized) * 100)
}

function formatDollars(cents: number | null) {
  if (cents === null) return ''
  return (cents / 100).toFixed(2)
}

function getActionError(result: ActionResult | void, fallback: string) {
  if (result && result.success === false) return result.error ?? fallback
  return null
}

export function CalendarEntryActionsPanel({ entry }: Props) {
  const router = useRouter()
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actualRevenue, setActualRevenue] = useState(formatDollars(entry.actual_revenue_cents))
  const { confirm, ConfirmDialog } = useConfirm()

  const canNotifyClients = entry.entry_type === 'target_booking' && entry.is_public

  function runAction(action: () => Promise<void>) {
    setError(null)
    setIsWorking(true)
    void (async () => {
      try {
        await action()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Calendar action failed'
        setError(message)
        toast.error(message)
      } finally {
        setIsWorking(false)
      }
    })
  }

  function getActualRevenueCents() {
    const cents = dollarsToCents(actualRevenue)
    if (cents === null) {
      setError('Enter actual revenue as dollars and cents.')
      return null
    }
    return cents
  }

  function handleMarkComplete() {
    runAction(async () => {
      const actualRevenueCents = entry.is_revenue_generating ? getActualRevenueCents() : undefined
      if (actualRevenueCents === null) return

      const result = await markCalendarEntryComplete(entry.id, actualRevenueCents)
      const actionError = getActionError(result, 'Failed to mark entry complete')
      if (actionError) {
        setError(actionError)
        toast.error(actionError)
        return
      }

      toast.success('Calendar entry marked complete')
      router.refresh()
    })
  }

  function handleSaveActualRevenue() {
    runAction(async () => {
      const actualRevenueCents = getActualRevenueCents()
      if (actualRevenueCents === null || actualRevenueCents === undefined) {
        setError('Enter actual revenue before saving.')
        return
      }

      await updateCalendarEntry(entry.id, {
        actual_revenue_cents: actualRevenueCents,
      })

      toast.success('Actual revenue saved')
      router.refresh()
    })
  }

  function handleNotifyClients() {
    runAction(async () => {
      const result = await notifyClientsOfPublicSignal(entry.id)
      const actionError = getActionError(result, 'Failed to notify clients')
      if (actionError) {
        setError(actionError)
        toast.error(actionError)
        return
      }

      const notified = result?.notified ?? 0
      toast.success(notified === 1 ? '1 client notified' : `${notified} clients notified`)
      router.refresh()
    })
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete this calendar entry?',
      description: 'This removes the entry from your calendar.',
      confirmLabel: 'Delete Entry',
      variant: 'danger',
    })
    if (!ok) return

    runAction(async () => {
      const result = await deleteCalendarEntry(entry.id)
      const actionError = getActionError(result, 'Failed to delete calendar entry')
      if (actionError) {
        setError(actionError)
        toast.error(actionError)
        return
      }

      toast.success('Calendar entry deleted')
      router.push('/calendar')
      router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
      <ConfirmDialog />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Actions</h2>
        </div>
        {!entry.is_completed && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={isWorking}
            onClick={handleMarkComplete}
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Mark Complete
          </Button>
        )}
      </div>

      {entry.is_revenue_generating && (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/60 p-4">
          <label
            htmlFor="calendar-entry-actual-revenue"
            className="text-sm font-medium text-stone-300"
          >
            Actual revenue
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <DollarSign
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
              <input
                id="calendar-entry-actual-revenue"
                type="text"
                inputMode="decimal"
                value={actualRevenue}
                onChange={(event) => setActualRevenue(event.target.value)}
                placeholder="0.00"
                className="min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-9 py-2 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isWorking}
              onClick={handleSaveActualRevenue}
            >
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              Save Revenue
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canNotifyClients && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isWorking}
            onClick={handleNotifyClients}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Notify Clients
          </Button>
        )}
        <Button type="button" variant="danger" size="sm" loading={isWorking} onClick={handleDelete}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete Entry
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  )
}
