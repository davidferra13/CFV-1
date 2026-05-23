// Chef Clients Hub Page
// Hub tiles for all client sub-sections + the clients list below.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStatsPage, getPendingInvitations } from '@/lib/clients/actions'
import { getClientHealthScores } from '@/lib/clients/health-score'
import { getRecurringClientIds } from '@/lib/scheduling/recurring-actions'
import { DomainSignals } from '@/components/cil/domain-signals'

export const metadata: Metadata = { title: 'Clients' }
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { NoClientsIllustration } from '@/components/ui/branded-illustrations'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ClientInvitationForm } from './client-invitation-form'
import { ClientsTable } from './clients-table'
import { PendingInvitationsTable } from './pending-invitations-table'
import { ClientInvitationPanel } from './client-invitation-panel'
import { RebookingBar } from '@/components/intelligence/rebooking-bar'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'
import { ChartLineUp, Gift, Bell, Leaf, Repeat, Handshake } from '@/components/ui/icons'

const hubTiles = [
  {
    href: '/clients/contribution',
    label: 'Client Contribution',
    description: 'Revenue, profit, risk, and review decisions',
    icon: ChartLineUp,
    accent: 'emerald',
  },
  {
    href: '/clients/insights/top-clients',
    label: 'Client Insights',
    description: 'Top clients, at-risk, frequent bookers',
    icon: ChartLineUp,
    accent: 'emerald',
  },
  {
    href: '/clients/loyalty',
    label: 'Loyalty and Rewards',
    description: 'Rewards, referral tracking, retention',
    icon: Gift,
    accent: 'amber',
  },
  {
    href: '/clients/communication/follow-ups',
    label: 'Follow-Ups',
    description: 'Pending touchpoints and actions',
    icon: Bell,
    accent: 'sky',
  },
  {
    href: '/clients/preferences/dietary-restrictions',
    label: 'Dietary Preferences',
    description: 'Allergies, restrictions, favorites',
    icon: Leaf,
    accent: 'rose',
  },
  {
    href: '/clients/recurring',
    label: 'Recurring Board',
    description: 'Clients on service schedules',
    icon: Repeat,
    accent: 'violet',
  },
  {
    href: '/partners',
    label: 'Partners and Referrals',
    description: 'Referral partners, generated events',
    icon: Handshake,
    accent: 'brand',
  },
] as const

const accentStyles = {
  emerald: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-950/80',
    iconText: 'text-emerald-400',
    hoverBorder: 'group-hover:border-emerald-600/40',
  },
  amber: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-950/80',
    iconText: 'text-amber-400',
    hoverBorder: 'group-hover:border-amber-600/40',
  },
  sky: {
    border: 'border-l-sky-500',
    iconBg: 'bg-sky-950/80',
    iconText: 'text-sky-400',
    hoverBorder: 'group-hover:border-sky-600/40',
  },
  rose: {
    border: 'border-l-rose-500',
    iconBg: 'bg-rose-950/80',
    iconText: 'text-rose-400',
    hoverBorder: 'group-hover:border-rose-600/40',
  },
  violet: {
    border: 'border-l-violet-500',
    iconBg: 'bg-violet-950/80',
    iconText: 'text-violet-400',
    hoverBorder: 'group-hover:border-violet-600/40',
  },
  brand: {
    border: 'border-l-brand-500',
    iconBg: 'bg-brand-950/80',
    iconText: 'text-brand-400',
    hoverBorder: 'group-hover:border-brand-600/40',
  },
} as const

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireChef()
  const params = await searchParams
  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Clients</h1>
          <p className="text-stone-400 mt-1">Directory, insights, loyalty, and communication</p>
        </div>
        <div className="flex gap-2">
          <Button href="/pulse" variant="ghost" size="sm">
            Who&apos;s waiting on me?
          </Button>
          <a
            href="/clients/csv-export"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Export CSV
          </a>
          <Button href="/clients/new" data-tour="add-client">
            + Add Client
          </Button>
        </div>
      </div>

      {/* Hub tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hubTiles.map((tile) => {
          const colors = accentStyles[tile.accent]
          const Icon = tile.icon
          return (
            <Link key={tile.href} href={tile.href} className="group block">
              <Card
                variant="glass"
                className={`h-full border-l-2 ${colors.border} ${colors.hoverBorder} transition-all duration-200 group-hover:bg-stone-800/60`}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg ${colors.iconBg} p-2.5`}>
                      <Icon className={`h-5 w-5 ${colors.iconText}`} weight="duotone" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-100 group-hover:text-stone-50 transition-colors">
                        {tile.label}
                      </p>
                      <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Client Intelligence Signals */}
      <WidgetErrorBoundary name="Client Signals" compact>
        <Suspense fallback={null}>
          <DomainSignals domain="clients" limit={3} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Rebooking Intelligence */}
      <WidgetErrorBoundary name="Rebooking Intelligence" compact>
        <Suspense fallback={null}>
          <RebookingBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Invitation Section (collapsible) */}
      <div id="invite">
        <WidgetErrorBoundary name="Client Invitation">
          <Suspense fallback={null}>
            <ClientInvitationPanel>
              <ClientInvitationForm />
              <Suspense
                fallback={<div className="text-sm text-stone-500 mt-4">Loading invitations...</div>}
              >
                <PendingInvitationsContent />
              </Suspense>
            </ClientInvitationPanel>
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* Clients List */}
      <Card data-info="client-table">
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SkeletonTable rows={5} />}>
            <ClientsListContent search={search} page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function PendingInvitationsContent() {
  const invitations = await getPendingInvitations()

  if (invitations.length === 0) {
    return <p className="text-sm text-stone-500">No pending invitations</p>
  }

  return <PendingInvitationsTable invitations={invitations} />
}

async function ClientsListContent({ search, page }: { search: string; page: number }) {
  const pageSize = 50
  const offset = (page - 1) * pageSize
  const [clientsResult, healthResult, recurringIds] = await Promise.all([
    safeFetch(() => getClientsWithStatsPage({ limit: pageSize, offset, search })),
    safeFetch(() => getClientHealthScores()),
    getRecurringClientIds().catch(() => new Set<string>()),
  ])

  if (clientsResult.error || !clientsResult.data) {
    return (
      <ErrorState
        title="Could not load clients"
        description={clientsResult.error ?? 'Client data was unavailable.'}
      />
    )
  }

  const { items: clients, total } = clientsResult.data

  const buildUrl = (nextPage: number) => {
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return `/clients${qs ? `?${qs}` : ''}`
  }

  if (clients.length === 0) {
    return search ? (
      <div className="space-y-4">
        <ClientSearchForm search={search} />
        <p className="py-8 text-center text-sm text-stone-500">
          No clients found matching "{search}".
        </p>
      </div>
    ) : (
      <EmptyState
        illustration={<NoClientsIllustration />}
        title="No clients yet"
        description="Invite your first client to start tracking their preferences, events, and loyalty rewards."
        action={{ label: 'Send Invitation', href: '#invite' }}
      />
    )
  }

  // Merge health scores into client data
  const healthMap = new Map<string, { tier: string; score: number }>()
  if (healthResult.data) {
    for (const hs of healthResult.data.scores) {
      healthMap.set(hs.clientId, { tier: hs.tier, score: hs.score })
    }
  }

  const clientsWithHealth = clients.map((client: any) => ({
    ...client,
    healthTier: healthMap.get(client.id)?.tier ?? 'new',
    healthScore: healthMap.get(client.id)?.score ?? 0,
    hasRecurring: recurringIds.has(client.id),
  }))

  return (
    <div className="space-y-4">
      <ClientSearchForm search={search} />
      <ClientsTable clients={clientsWithHealth} />
      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-stone-800 pt-3">
          <p className="text-xs text-stone-500">
            Showing {offset + 1}-{Math.min(offset + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Previous
              </Link>
            )}
            {offset + pageSize < total && (
              <Link
                href={buildUrl(page + 1)}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ClientSearchForm({ search }: { search: string }) {
  return (
    <form action="/clients" method="get" className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={search}
        placeholder="Search clients by name, email, phone..."
        className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
      >
        Search
      </button>
      {search && (
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          Clear
        </Link>
      )}
    </form>
  )
}
