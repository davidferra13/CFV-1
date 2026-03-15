'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getWaitlistEntries,
  addToWaitlist,
  updateWaitlistEntry,
  removeFromWaitlist,
  convertWaitlistToEvent,
  getWaitlistStats,
  type WaitlistEntry,
  type WaitlistStatus,
  type WaitlistStats,
} from '@/lib/scheduling/waitlist-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

const STATUS_TABS: { label: string; value: WaitlistStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Booked', value: 'booked' },
  { label: 'Expired', value: 'expired' },
]

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  waiting: 'warning',
  contacted: 'info',
  booked: 'success',
  expired: 'error',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WaitlistManager() {
  const router = useRouter()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<WaitlistStats | null>(null)
  const [activeTab, setActiveTab] = useState<WaitlistStatus | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [formDate, setFormDate] = useState('')
  const [formDateEnd, setFormDateEnd] = useState('')
  const [formOccasion, setFormOccasion] = useState('')
  const [formGuests, setFormGuests] = useState('')
  const [formNotes, setFormNotes] = useState('')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const filter = activeTab === 'all' ? undefined : activeTab
      const [entriesData, statsData] = await Promise.all([
        getWaitlistEntries(filter),
        getWaitlistStats(),
      ])
      setEntries(entriesData)
      setStats(statsData)
    } catch (err) {
      setError('Failed to load waitlist data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  function resetForm() {
    setFormDate('')
    setFormDateEnd('')
    setFormOccasion('')
    setFormGuests('')
    setFormNotes('')
    setShowAddForm(false)
  }

  function handleAdd() {
    if (!formDate) return

    const previous = [...entries]
    startTransition(async () => {
      try {
        await addToWaitlist({
          requested_date: formDate,
          requested_date_end: formDateEnd || undefined,
          occasion: formOccasion || undefined,
          guest_count_estimate: formGuests ? parseInt(formGuests, 10) : undefined,
          notes: formNotes || undefined,
        })
        resetForm()
        await loadData()
      } catch (err) {
        setEntries(previous)
        setError('Failed to add to waitlist')
        console.error(err)
      }
    })
  }

  function handleMarkContacted(entryId: string) {
    const previous = [...entries]
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, status: 'contacted', contacted_at: new Date().toISOString() } : e
      )
    )
    startTransition(async () => {
      try {
        await updateWaitlistEntry(entryId, {
          status: 'contacted',
          contacted_at: new Date().toISOString(),
        })
        await loadData()
      } catch (err) {
        setEntries(previous)
        setError('Failed to update entry')
        console.error(err)
      }
    })
  }

  function handleConvert(entryId: string) {
    const previous = [...entries]
    startTransition(async () => {
      try {
        const eventId = await convertWaitlistToEvent(entryId)
        await loadData()
        router.push(`/events/${eventId}`)
      } catch (err) {
        setEntries(previous)
        setError('Failed to convert to event')
        console.error(err)
      }
    })
  }

  function handleRemove(entryId: string) {
    if (!confirm('Remove this entry from the waitlist?')) return

    const previous = [...entries]
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    startTransition(async () => {
      try {
        await removeFromWaitlist(entryId)
        await loadData()
      } catch (err) {
        setEntries(previous)
        setError('Failed to remove entry')
        console.error(err)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Waitlist</h2>
          {stats && <Badge variant="default">{stats.total} total</Badge>}
        </div>
        <Button variant="primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add to Waitlist'}
        </Button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{stats.waiting} waiting</span>
          <span>{stats.contacted} contacted</span>
          <span>{stats.booked} booked</span>
          <span>{stats.expired} expired</span>
          {stats.conversionRate > 0 && (
            <span>{stats.conversionRate.toFixed(0)}% conversion rate</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <h3 className="font-medium">Add to Waitlist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date (optional)</label>
              <input
                type="date"
                value={formDateEnd}
                onChange={(e) => setFormDateEnd(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Occasion</label>
              <input
                type="text"
                value={formOccasion}
                onChange={(e) => setFormOccasion(e.target.value)}
                placeholder="e.g. Birthday dinner"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Est. Guests</label>
              <input
                type="number"
                value={formGuests}
                onChange={(e) => setFormGuests(e.target.value)}
                placeholder="10"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Any relevant details..."
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={!formDate || isPending}>
              {isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading waitlist...</div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No waitlist entries{activeTab !== 'all' ? ` with status "${activeTab}"` : ''}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Client</th>
                <th className="pb-2 pr-4 font-medium">Date Range</th>
                <th className="pb-2 pr-4 font-medium">Occasion</th>
                <th className="pb-2 pr-4 font-medium">Guests</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Notes</th>
                <th className="pb-2 pr-4 font-medium">Added</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">{entry.client?.name ?? 'No client linked'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(entry.requested_date)}
                    {entry.requested_date_end && <> to {formatDate(entry.requested_date_end)}</>}
                  </td>
                  <td className="py-3 pr-4">{entry.occasion ?? '-'}</td>
                  <td className="py-3 pr-4">{entry.guest_count_estimate ?? '-'}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={STATUS_BADGE_VARIANT[entry.status] ?? 'default'}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 max-w-[200px] truncate">{entry.notes ?? '-'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {entry.status === 'waiting' && (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => handleMarkContacted(entry.id)}
                            disabled={isPending}
                          >
                            Contact
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleConvert(entry.id)}
                            disabled={isPending}
                          >
                            Convert
                          </Button>
                        </>
                      )}
                      {entry.status === 'contacted' && (
                        <Button
                          variant="ghost"
                          onClick={() => handleConvert(entry.id)}
                          disabled={isPending}
                        >
                          Convert
                        </Button>
                      )}
                      {entry.status !== 'booked' && (
                        <Button
                          variant="danger"
                          onClick={() => handleRemove(entry.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
