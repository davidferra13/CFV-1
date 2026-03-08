'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BulkSelectTable, type BulkAction } from '@/components/ui/bulk-select-table'
import { formatCurrency } from '@/lib/utils/currency'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

type FollowUpCandidate = {
  id: string
  full_name: string
  email: string | null
  lastEventDate: string | null
  totalEvents: number
  totalSpentCents: number
}

type Props = {
  clients: FollowUpCandidate[]
}

type PriorityFilter = 'all' | 'overdue' | 'at-risk' | 'check-in'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyLabel(days: number): { label: Exclude<PriorityFilter, 'all'>; style: string } {
  if (days > 180) return { label: 'overdue', style: 'bg-red-950 text-red-300' }
  if (days > 90) return { label: 'at-risk', style: 'bg-amber-950 text-amber-300' }
  return { label: 'check-in', style: 'bg-sky-950 text-sky-300' }
}

function buildDefaultBody(recipientCount: number) {
  return recipientCount === 1
    ? "Hi,\n\nI wanted to check in and see how you've been since your last event. If you'd like to plan another dinner or talk through ideas for an upcoming occasion, I'm happy to help.\n\nBest,\n"
    : "Hi,\n\nI wanted to check in and see how things have been since your last event. If you'd like to plan another dinner or talk through ideas for an upcoming occasion, I'm happy to help.\n\nBest,\n"
}

export function FollowUpsClient({ clients }: Props) {
  const { state, setState, reset } = usePersistentViewState('clients.followups', {
    strategy: 'url',
    defaults: {
      search: '',
      priority: 'all' as PriorityFilter,
    },
  })
  const [composerRecipients, setComposerRecipients] = useState<FollowUpCandidate[]>([])
  const [subject, setSubject] = useState('Checking in after your last event')
  const [body, setBody] = useState(buildDefaultBody(1))

  const filteredCandidates = useMemo(() => {
    const search = String(state.search || '')
      .trim()
      .toLowerCase()
    const priority = String(state.priority || 'all') as PriorityFilter

    return clients.filter((client) => {
      if (!client.lastEventDate) return false

      const days = daysSince(client.lastEventDate)
      const urgency = urgencyLabel(days)

      if (priority !== 'all' && urgency.label !== priority) {
        return false
      }

      if (!search) return true

      return [client.full_name, client.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
  }, [clients, state.priority, state.search])

  const hasActiveFilters = Boolean(state.search || state.priority !== 'all')

  function openComposer(selectedIds: string[]) {
    const recipients = filteredCandidates.filter((client) => selectedIds.includes(client.id))
    const withEmail = recipients.filter((client) => client.email)

    if (withEmail.length === 0) {
      toast.error('Selected clients do not have email addresses')
      return
    }

    setComposerRecipients(withEmail)
    setSubject('Checking in after your last event')
    setBody(buildDefaultBody(withEmail.length))
  }

  async function handleLaunchMailApp() {
    const emails = composerRecipients
      .map((recipient) => recipient.email?.trim())
      .filter((email): email is string => Boolean(email))

    if (emails.length === 0) {
      toast.error('No valid email addresses selected')
      return
    }

    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    // Mailto URLs get unreliable once the recipient list becomes very long.
    if (mailto.length > 1800) {
      try {
        await navigator.clipboard.writeText(emails.join(', '))
        toast.success('Copied selected email addresses. Paste them into your email app BCC field.')
      } catch {
        toast.error('Too many recipients for a mail draft. Try a smaller batch.')
      }
      return
    }

    window.open(mailto, '_blank', 'noopener,noreferrer')
    toast.success(
      `Opened your email app for ${emails.length} client${emails.length === 1 ? '' : 's'}`
    )
    setComposerRecipients([])
  }

  const bulkActions: BulkAction[] = [
    {
      label: 'Draft Email',
      onClick: async (selectedIds) => {
        openComposer(selectedIds)
      },
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Search
            </label>
            <Input
              type="search"
              value={String(state.search || '')}
              onChange={(event) => setState({ search: event.target.value })}
              placeholder="Client name or email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Priority
            </label>
            <select
              value={String(state.priority || 'all')}
              onChange={(event) => setState({ priority: event.target.value as PriorityFilter })}
              className="h-10 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200"
            >
              <option value="all">All priorities</option>
              <option value="overdue">Overdue</option>
              <option value="at-risk">At Risk</option>
              <option value="check-in">Check In</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="min-h-[44px] w-full"
              onClick={() => reset()}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
          </div>

          <div className="flex items-end">
            <Button href="/clients" variant="secondary" size="md" className="min-h-[44px] w-full">
              View Clients
            </Button>
          </div>
        </div>
      </Card>

      {composerRecipients.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-stone-100">
                  Draft follow-up for {composerRecipients.length} client
                  {composerRecipients.length === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Opens your email app with selected recipients in BCC.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Subject
                  </label>
                  <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    className="min-h-[180px] w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-sm text-stone-200"
                  />
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-3 rounded-xl border border-stone-700 bg-stone-900/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Recipients
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {composerRecipients.map((recipient) => (
                  <div key={recipient.id} className="rounded-lg border border-stone-800 px-3 py-2">
                    <p className="text-sm font-medium text-stone-100">{recipient.full_name}</p>
                    <p className="text-xs text-stone-400">{recipient.email}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="md"
                  className="min-h-[44px]"
                  onClick={handleLaunchMailApp}
                  disabled={!subject.trim() || !body.trim()}
                >
                  Open Email Draft
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="min-h-[44px]"
                  onClick={() => setComposerRecipients([])}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <p className="text-sm text-stone-400">
        Showing {filteredCandidates.length} of {clients.length} clients
      </p>

      {filteredCandidates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium text-stone-300">
            No follow-up candidates match the current filters.
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Clear the filters to see all eligible clients again.
          </p>
        </Card>
      ) : (
        <BulkSelectTable
          items={filteredCandidates}
          bulkActions={bulkActions}
          renderHeader={() => (
            <>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Last Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Days Since
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400 md:table-cell">
                Email
              </th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-400 lg:table-cell">
                Total Events
              </th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-400 lg:table-cell">
                Lifetime Spend
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Priority
              </th>
            </>
          )}
          renderRow={(client) => {
            const lastEventDate = client.lastEventDate ? new Date(client.lastEventDate) : null
            const days = client.lastEventDate ? daysSince(client.lastEventDate) : 0
            const urgency = urgencyLabel(days)

            return (
              <>
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-brand-600 hover:text-brand-300 hover:underline"
                  >
                    {client.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-stone-400">
                  {lastEventDate ? lastEventDate.toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-stone-400">{days} days</td>
                <td className="hidden px-4 py-3 text-sm text-stone-400 md:table-cell">
                  {client.email || '-'}
                </td>
                <td className="hidden px-4 py-3 text-right text-sm text-stone-400 lg:table-cell">
                  {client.totalEvents}
                </td>
                <td className="hidden px-4 py-3 text-right text-sm text-stone-400 lg:table-cell">
                  {client.totalSpentCents > 0 ? formatCurrency(client.totalSpentCents) : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${urgency.style}`}>
                    {urgency.label === 'at-risk'
                      ? 'At Risk'
                      : urgency.label === 'check-in'
                        ? 'Check In'
                        : 'Overdue'}
                  </span>
                </td>
              </>
            )
          }}
        />
      )}
    </div>
  )
}
