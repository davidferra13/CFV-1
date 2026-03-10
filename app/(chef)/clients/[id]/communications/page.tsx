// Client Communication Timeline (U18)
// Shows unified timeline of all interactions with a specific client.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ClientTimeline } from '@/components/communications/client-timeline'
import { CommStatsCards } from '@/components/communications/comm-stats'
import { QuickNote } from '@/components/communications/quick-note'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getClientTimeline, getCommunicationStats } from '@/lib/communications/comm-log-actions'

export const metadata: Metadata = { title: 'Client Communications - ChefFlow' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientCommunicationsPage({ params }: Props) {
  const { id: clientId } = await params
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify the client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) notFound()

  const [timeline, stats] = await Promise.all([
    getClientTimeline(clientId),
    getCommunicationStats(clientId),
  ])

  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client'

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:underline">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${clientId}`} className="hover:underline">
          {clientName}
        </Link>
        <span>/</span>
        <span className="text-foreground">Communications</span>
      </div>

      <h1 className="text-2xl font-bold">Communications with {clientName}</h1>

      {/* Stats */}
      <CommStatsCards stats={stats} />

      {/* Quick note sidebar + timeline */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ClientTimeline clientId={clientId} initialEntries={timeline} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Note</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickNote clientId={clientId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
