// Chef Clients Hub Page
// Hub tiles for all client sub-sections + the clients list below.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { Archive, ClipboardList, Crown, GitMerge, Tags, UsersRound } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats, getPendingInvitations } from '@/lib/clients/actions'
import { getClientHealthScores } from '@/lib/clients/health-score'

export const metadata: Metadata = { title: 'Clients' }
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { NoClientsIllustration } from '@/components/ui/branded-illustrations'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ClientInvitationForm } from './client-invitation-form'
import { ClientsTable } from './clients-table'
import { PendingInvitationsTable } from './pending-invitations-table'
import { RebookingBar } from '@/components/intelligence/rebooking-bar'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'

const hubTiles = [
  {
    href: '/clients/insights/top-clients',
    label: 'Client Insights',
    description: 'Top clients, at-risk clients, and most frequent bookers',
    icon: '💡',
  },
  {
    href: '/clients/loyalty',
    label: 'Loyalty and Rewards',
    description: 'Loyalty overview, rewards, and referral tracking',
    icon: '🎁',
  },
  {
    href: '/clients/communication/follow-ups',
    label: 'Follow-Ups',
    description: 'Scheduled touchpoints and pending follow-up actions',
    icon: '📬',
  },
  {
    href: '/clients/preferences/dietary-restrictions',
    label: 'Dietary Preferences',
    description: 'Allergies, restrictions, dislikes, and favorite dishes',
    icon: '🥗',
  },
  {
    href: '/clients/recurring',
    label: 'Recurring Board',
    description: 'Clients on recurring service schedules',
    icon: '🔄',
  },
  {
    href: '/partners',
    label: 'Partners and Referrals',
    description: 'Referral partners and the events they generate',
    icon: '🤝',
  },
]

const compactHubTiles = [
  {
    href: '/clients/active',
    label: 'Active',
    description: 'Clients currently in motion',
    icon: UsersRound,
  },
  {
    href: '/clients/inactive',
    label: 'Inactive',
    description: 'Dormant client records',
    icon: Archive,
  },
  {
    href: '/clients/vip',
    label: 'VIP',
    description: 'Priority relationships',
    icon: Crown,
  },
  {
    href: '/clients/duplicates',
    label: 'Duplicates',
    description: 'Possible duplicate profiles',
    icon: GitMerge,
  },
  {
    href: '/clients/segments',
    label: 'Segments',
    description: 'Grouped client audiences',
    icon: Tags,
  },
  {
    href: '/clients/intake',
    label: 'Intake',
    description: 'Client intake forms',
    icon: ClipboardList,
  },
]

export default async function ClientsPage() {
  await requireChef()

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
        {hubTiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="group block">
            <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{tile.icon}</span>
                  <div>
                    <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                      {tile.label}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Compact client route links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {compactHubTiles.map((tile) => {
          const Icon = tile.icon

          return (
            <Link key={tile.href} href={tile.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 flex-shrink-0 text-stone-400 group-hover:text-brand-400 transition-colors"
                      aria-hidden="true"
                    />
                    <p className="font-semibold text-sm text-stone-100 group-hover:text-brand-400 transition-colors">
                      {tile.label}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500 mt-2">{tile.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Rebooking Intelligence */}
      <WidgetErrorBoundary name="Rebooking Intelligence" compact>
        <Suspense fallback={null}>
          <RebookingBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Invitation Section */}
      <Card id="invite">
        <CardHeader>
          <CardTitle>Send Client Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <WidgetErrorBoundary name="Client Invitation Form">
            <Suspense fallback={<div className="text-sm text-stone-500">Loading...</div>}>
              <ClientInvitationForm />
            </Suspense>
          </WidgetErrorBoundary>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-stone-100 mb-4">Pending Invitations</h3>
            <Suspense
              fallback={<div className="text-sm text-stone-500">Loading invitations...</div>}
            >
              <PendingInvitationsContent />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card data-info="client-table">
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SkeletonTable rows={5} />}>
            <ClientsListContent />
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

async function ClientsListContent() {
  const [clientsResult, healthResult] = await Promise.all([
    safeFetch(() => getClientsWithStats()),
    safeFetch(() => getClientHealthScores()),
  ])

  if (clientsResult.error) {
    return <ErrorState title="Could not load clients" description={clientsResult.error} />
  }

  const clients = clientsResult.data

  if (clients.length === 0) {
    return (
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
  }))

  return <ClientsTable clients={clientsWithHealth} />
}
