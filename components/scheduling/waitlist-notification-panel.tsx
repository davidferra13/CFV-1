'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  notifyWaitlistOpening,
  updateWaitlistEntry,
  type WaitlistEntry,
} from '@/lib/scheduling/waitlist-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WaitlistNotificationPanelProps {
  date: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WaitlistNotificationPanel({ date }: WaitlistNotificationPanelProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await notifyWaitlistOpening(date)
        if (!cancelled) {
          setEntries(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to check waitlist for this date')
          console.error(err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [date])

  function handleNotify(entryId: string) {
    const previous = new Set(notifiedIds)
    setNotifiedIds((prev) => new Set([...prev, entryId]))

    startTransition(async () => {
      try {
        await updateWaitlistEntry(entryId, {
          status: 'contacted',
          contacted_at: new Date().toISOString(),
        })
        // Update local state to reflect the status change
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, status: 'contacted', contacted_at: new Date().toISOString() }
              : e
          )
        )
      } catch (err) {
        setNotifiedIds(previous)
        setError('Failed to mark as contacted')
        console.error(err)
      }
    })
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Checking waitlist for {formatDate(date)}...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No one on the waitlist for {formatDate(date)}.
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Waitlist Matches for {formatDate(date)}</h3>
        <Badge variant="warning">{entries.length} waiting</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        A slot opened up on this date. These clients expressed interest:
      </p>
      <ul className="divide-y">
        {entries.map((entry) => {
          const isNotified = notifiedIds.has(entry.id) || entry.status === 'contacted'
          return (
            <li
              key={entry.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{entry.client?.name ?? 'Unknown client'}</p>
                {entry.client?.email && (
                  <p className="text-xs text-muted-foreground">{entry.client.email}</p>
                )}
                {entry.occasion && (
                  <p className="text-xs text-muted-foreground">{entry.occasion}</p>
                )}
                {entry.guest_count_estimate && (
                  <p className="text-xs text-muted-foreground">
                    ~{entry.guest_count_estimate} guests
                  </p>
                )}
              </div>
              <div>
                {isNotified ? (
                  <Badge variant="success">Contacted</Badge>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleNotify(entry.id)}
                    disabled={isPending}
                  >
                    Notify
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
