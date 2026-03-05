// Chef Clients List Page
// Shows all clients with statistics + client invitation form

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats, getPendingInvitations } from '@/lib/clients/actions'

export const metadata: Metadata = { title: 'Clients - ChefFlow' }
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { NoClientsIllustration } from '@/components/ui/branded-illustrations'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ClientInvitationForm } from './client-invitation-form'
import { ClientsTable } from './clients-table'
import { PendingInvitationsTable } from './pending-invitations-table'
import { getClientHealthScores } from '@/lib/clients/health-score'

export default async function ClientsPage() {
  await requireChef()

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Clients</h1>
          <p className="text-stone-400 mt-1">Manage your client relationships and invitations</p>
        </div>
        <div className="flex gap-2">
          <Button href="/clients/recurring" variant="secondary">
            Recurring Board
          </Button>
          <a
            href="/clients/export"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Export CSV
          </a>
          <Button href="/clients/new">+ Add Client</Button>
        </div>
      </div>

      {/* Invitation Section */}
      <Card id="invite">
        <CardHeader>
          <CardTitle>Send Client Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={<div className="text-sm text-stone-500">Loading...</div>}>
            <ClientInvitationForm />
          </Suspense>

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
  const [clients, healthSummary] = await Promise.all([
    getClientsWithStats(),
    getClientHealthScores().catch(() => ({ scores: [], medianLtv: 0, avgEventsPerYear: 0 })),
  ])

  const healthMap = new Map(healthSummary.scores.map((s) => [s.clientId, s]))

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

  return <ClientsTable clients={clients} healthMap={healthMap} />
}
