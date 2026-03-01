// Charity Hub — aggregates all charity-related entities across the system.
// Read-only visibility layer. No new data creation — just surfaces existing records
// that match charity keywords (charity, nonprofit, fundraiser, donation, etc.)

import Link from 'next/link'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requireAdmin } from '@/lib/auth/admin'
import {
  getCharityEvents,
  getCharityMenus,
  getCharityFinancials,
  getCharityMisc,
} from '@/lib/charity/actions'
import { getCharityHoursSummary } from '@/lib/charity/hours-actions'
import { CHARITY_KEYWORDS } from '@/lib/charity/charity-keywords'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CharitySection } from '@/components/charity/charity-section'
import { Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Charity Hub - ChefFlow' }

// ─── Status badge variant helper ──────────────────────────────────────────────

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
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CharityHubPage() {
  await requireChef()
  await requireAdmin()

  const [events, menus, financials, misc, hoursSummary] = await Promise.all([
    getCharityEvents().catch(() => []),
    getCharityMenus().catch(() => []),
    getCharityFinancials().catch(() => []),
    getCharityMisc().catch(() => []),
    getCharityHoursSummary().catch(() => ({
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      hoursByOrg: [],
    })),
  ])

  const totalCount = events.length + menus.length + financials.length + misc.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Charity Hub</h1>
          <p className="text-sm text-stone-500 mt-1">
            All charity, nonprofit, and fundraiser-related activity across your account
          </p>
        </div>
        <Link href="/charity/hours">
          <Button variant="primary">
            <Clock className="w-4 h-4 mr-1.5" />
            Log Charity Hours
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      {(totalCount > 0 || hoursSummary.totalHours > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{events.length}</p>
            <p className="text-xs text-stone-500 mt-1">Events</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{menus.length}</p>
            <p className="text-xs text-stone-500 mt-1">Menus</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{financials.length}</p>
            <p className="text-xs text-stone-500 mt-1">Financial Entries</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{misc.length}</p>
            <p className="text-xs text-stone-500 mt-1">Misc Mentions</p>
          </Card>
          <Link href="/charity/hours" className="block">
            <Card className="p-4 text-center hover:bg-stone-800/50 transition-colors h-full">
              <p className="text-2xl font-bold text-stone-100">{hoursSummary.totalHours}</p>
              <p className="text-xs text-stone-500 mt-1">Volunteer Hours</p>
            </Card>
          </Link>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <Card className="p-10 text-center">
          <p className="text-lg font-medium text-stone-400">No charity-related items found</p>
          <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
            When events, menus, financial entries, or notes mention keywords like{' '}
            <span className="text-stone-400">{CHARITY_KEYWORDS.slice(0, 6).join(', ')}</span>, they
            will appear here automatically.
          </p>
        </Card>
      )}

      {/* ── Charity Events ────────────────────────────────────────────────── */}
      <CharitySection title="Charity-Related Events" count={events.length}>
        <div className="divide-y divide-stone-800">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex items-center justify-between py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">
                  {e.occasion || 'Untitled Event'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-stone-500">{formatDate(e.event_date)}</span>
                  {e.client_name && (
                    <span className="text-xs text-stone-500">· {e.client_name}</span>
                  )}
                  {e.guest_count != null && e.guest_count > 0 && (
                    <span className="text-xs text-stone-500">· {e.guest_count} guests</span>
                  )}
                </div>
              </div>
              <Badge variant={eventStatusVariant(e.status)}>{e.status}</Badge>
            </Link>
          ))}
        </div>
      </CharitySection>

      {/* ── Charity Menus ─────────────────────────────────────────────────── */}
      <CharitySection title="Charity-Related Menus" count={menus.length}>
        <div className="divide-y divide-stone-800">
          {menus.map((m) => (
            <Link
              key={m.id}
              href={m.event_id ? `/events/${m.event_id}` : '/menus'}
              className="flex items-center justify-between py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">{m.name}</p>
                {m.description && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{m.description}</p>
                )}
              </div>
              <span className="text-xs text-stone-500 flex-shrink-0 ml-4">
                {formatDate(m.created_at)}
              </span>
            </Link>
          ))}
        </div>
      </CharitySection>

      {/* ── Charity Financials ────────────────────────────────────────────── */}
      <CharitySection title="Charity-Related Financial Entries" count={financials.length}>
        <div className="divide-y divide-stone-800">
          {financials.map((le) => (
            <Link
              key={le.id}
              href="/finance/ledger"
              className="flex items-center justify-between py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-stone-200">
                  {le.description || 'Ledger Entry'}
                </p>
                <span className="text-xs text-stone-500">{formatDate(le.created_at)}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-medium text-stone-200">{formatCents(le.amount_cents)}</p>
                <Badge variant="default">{le.entry_type}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </CharitySection>

      {/* ── Misc Mentions ─────────────────────────────────────────────────── */}
      <CharitySection title="Misc Mentions (Notes, Tags, Inquiries)" count={misc.length}>
        <div className="divide-y divide-stone-800">
          {misc.map((item) => (
            <Link
              key={item.id}
              href={item.link_href}
              className="flex items-center justify-between py-3 hover:bg-stone-800/30 -mx-1 px-1 rounded transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{item.label}</Badge>
                  <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                </div>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.snippet}</p>
              </div>
            </Link>
          ))}
        </div>
      </CharitySection>
    </div>
  )
}
