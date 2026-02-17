// Chef Clients List Page
// Shows all clients with statistics + client invitation form

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats, getPendingInvitations } from '@/lib/clients/actions'

export const metadata: Metadata = { title: 'Clients - ChefFlow' }
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { ClientInvitationForm } from './client-invitation-form'
import { ClientsTable } from './clients-table'
import { PendingInvitationsTable } from './pending-invitations-table'

export default async function ClientsPage() {
  await requireChef()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Clients</h1>
        <p className="text-stone-600 mt-1">Manage your client relationships and invitations</p>
      </div>

      {/* Invitation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Send Client Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={<div className="text-sm text-stone-500">Loading...</div>}>
            <ClientInvitationForm />
          </Suspense>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-stone-900 mb-4">Pending Invitations</h3>
            <Suspense fallback={<div className="text-sm text-stone-500">Loading invitations...</div>}>
              <PendingInvitationsContent />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-stone-500">Loading clients...</div>}>
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
  const clients = await getClientsWithStats()

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-lg mb-2">No clients yet</p>
        <p className="text-sm">Invite your first client using the form above!</p>
      </div>
    )
  }

  return <ClientsTable clients={clients} />
}
