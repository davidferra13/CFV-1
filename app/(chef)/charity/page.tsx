import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Clock } from '@/components/ui/icons'
import { CharitySection } from '@/components/charity/charity-section'
import { requireChef } from '@/lib/auth/get-user'
import {
  getCharityEvents,
  getCharityFinancials,
  getCharityMenus,
  getCharityMisc,
} from '@/lib/charity/actions'
import { CHARITY_KEYWORDS } from '@/lib/charity/charity-keywords'
import { getCharityHoursSummary } from '@/lib/charity/hours-actions'

export const metadata: Metadata = { title: 'Community Impact' }

function eventStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'warning'
    case 'cancelled':
      return 'error'
    case 'confirmed':
    case 'paid':
      return 'info'
    default:
      return 'default'
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function CharityHubPage() {
  await requireChef()

  const [events, menus, financials, misc, hoursSummary] = await Promise.all([
    getCharityEvents().catch(() => []),
    getCharityMenus().catch(() => []),
    getCharityFinancials().catch(() => []),
    getCharityMisc().catch(() => []),
    getCharityHoursSummary(),
  ])

  const totalCount = events.length + menus.length + financials.length + misc.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-stone-100">Community Impact</h1>
          <p className="mt-1 text-sm text-stone-500">
            A quieter workspace for service work, nonprofit activity, and impact-related references
            across your account. This stays available without needing to dominate your profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings/credentials">
            <Button variant="ghost">Credentials settings</Button>
          </Link>
          <Link href="/charity/hours">
            <Button variant="primary">
              <Clock className="mr-1.5 h-4 w-4" />
              Open volunteer log
            </Button>
          </Link>
        </div>
      </div>

      {(totalCount > 0 || hoursSummary.totalHours > 0) && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{events.length}</p>
            <p className="mt-1 text-xs text-stone-500">Related events</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{menus.length}</p>
            <p className="mt-1 text-xs text-stone-500">Related menus</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{financials.length}</p>
            <p className="mt-1 text-xs text-stone-500">Financial references</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{misc.length}</p>
            <p className="mt-1 text-xs text-stone-500">Notes and mentions</p>
          </Card>
          <Link href="/charity/hours" className="block">
            <Card className="h-full p-4 text-center transition-colors hover:bg-stone-800/50">
              <p className="text-2xl font-bold text-stone-100">{hoursSummary.totalHours}</p>
              <p className="mt-1 text-xs text-stone-500">Volunteer hours</p>
            </Card>
          </Link>
        </div>
      )}

      {totalCount === 0 && hoursSummary.totalHours === 0 && (
        <Card className="p-10 text-center">
          <p className="text-lg font-medium text-stone-400">No community impact signals yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            When events, menus, financial entries, or notes mention keywords like{' '}
            <span className="text-stone-400">{CHARITY_KEYWORDS.slice(0, 6).join(', ')}</span>, they
            will quietly collect here for reference.
          </p>
        </Card>
      )}

      <CharitySection title="Impact-related events" count={events.length} defaultOpen={false}>
        <div className="divide-y divide-stone-800">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="mx-[-4px] flex items-center justify-between rounded px-1 py-3 transition-colors hover:bg-stone-800/30"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">
                  {event.occasion || 'Untitled event'}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-stone-500">{formatDate(event.event_date)}</span>
                  {event.client_name && (
                    <span className="text-xs text-stone-500">{event.client_name}</span>
                  )}
                  {event.guest_count != null && event.guest_count > 0 && (
                    <span className="text-xs text-stone-500">{event.guest_count} guests</span>
                  )}
                </div>
              </div>
              <Badge variant={eventStatusVariant(event.status)}>{event.status}</Badge>
            </Link>
          ))}
        </div>
      </CharitySection>

      <CharitySection title="Impact-related menus" count={menus.length} defaultOpen={false}>
        <div className="divide-y divide-stone-800">
          {menus.map((menu) => (
            <Link
              key={menu.id}
              href={menu.event_id ? `/events/${menu.event_id}` : '/menus'}
              className="mx-[-4px] flex items-center justify-between rounded px-1 py-3 transition-colors hover:bg-stone-800/30"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">{menu.name}</p>
                {menu.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{menu.description}</p>
                )}
              </div>
              <span className="ml-4 flex-shrink-0 text-xs text-stone-500">
                {formatDate(menu.created_at)}
              </span>
            </Link>
          ))}
        </div>
      </CharitySection>

      <CharitySection
        title="Impact-related financial entries"
        count={financials.length}
        defaultOpen={false}
      >
        <div className="divide-y divide-stone-800">
          {financials.map((entry) => (
            <Link
              key={entry.id}
              href="/finance/ledger"
              className="mx-[-4px] flex items-center justify-between rounded px-1 py-3 transition-colors hover:bg-stone-800/30"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">
                  {entry.description || 'Ledger entry'}
                </p>
                <span className="text-xs text-stone-500">{formatDate(entry.created_at)}</span>
              </div>
              <div className="ml-4 flex-shrink-0 text-right">
                <p className="text-sm font-medium text-stone-200">
                  {formatCents(entry.amount_cents)}
                </p>
                <Badge variant="default">{entry.entry_type}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </CharitySection>

      <CharitySection title="Related notes and mentions" count={misc.length} defaultOpen={false}>
        <div className="divide-y divide-stone-800">
          {misc.map((item) => (
            <Link
              key={item.id}
              href={item.link_href}
              className="mx-[-4px] flex items-center justify-between rounded px-1 py-3 transition-colors hover:bg-stone-800/30"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{item.label}</Badge>
                  <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-stone-400">{item.snippet}</p>
              </div>
            </Link>
          ))}
        </div>
      </CharitySection>
    </div>
  )
}
