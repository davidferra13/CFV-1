// Client Conversation Page - Unified communication thread for a specific client

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientThread, getClientLastContact } from '@/lib/communication/unified-actions'
import { createServerClient } from '@/lib/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UnifiedThreadView } from '@/components/communication/unified-thread-view'
import { QuickReply } from '@/components/communication/quick-reply'
import { LastContactBadge } from '@/components/communication/last-contact-badge'
import { format } from 'date-fns'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Client Conversation | ChefFlow' }
}

interface ConversationPageProps {
  params: {
    id: string
  }
}

export default async function ClientConversationPage({ params }: ConversationPageProps) {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  // Fetch client info
  const { data: client } = await db
    .from('clients' as any)
    .select('id, full_name, email, phone, created_at, avatar_url')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    notFound()
  }

  // Load thread + last contact in parallel
  const [threadResult, lastContact] = await Promise.all([
    getClientThread(params.id, { limit: 50 }),
    getClientLastContact(params.id),
  ])

  // Fetch dietary info + upcoming events for sidebar
  const [{ data: upcomingEvents }, { data: dietaryInfo }] = await Promise.all([
    db
      .from('events' as any)
      .select('id, occasion, event_date, status')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', params.id)
      .in('status', ['inquiry', 'proposal', 'accepted', 'confirmed', 'in_progress'])
      .order('event_date', { ascending: true })
      .limit(5),
    db
      .from('clients' as any)
      .select('dietary_restrictions, allergies, favorite_dishes, favorite_cuisines')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId!)
      .single(),
  ])

  // Fetch client notes count
  const { count: notesCount } = await db
    .from('client_notes' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', params.id)

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Main Thread */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-4">
          <Link
            href={`/clients/${params.id}`}
            className="text-sm text-brand-500 hover:text-brand-400 mb-2 inline-block"
          >
            &larr; Back to {client.full_name}
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-100">
              Conversation with {client.full_name}
            </h1>
            {lastContact && (
              <LastContactBadge
                lastContactAt={lastContact.lastContactAt}
                daysSinceContact={lastContact.daysSinceContact}
                compact
              />
            )}
          </div>
          <p className="text-sm text-stone-400 mt-1">
            All emails, messages, and notes in one place
          </p>
        </div>

        {/* Thread View */}
        <Card className="flex flex-col" style={{ minHeight: '400px' }}>
          <CardContent className="flex-1 p-0">
            <UnifiedThreadView
              items={threadResult.items}
              hasMore={threadResult.hasMore}
            />
          </CardContent>

          {/* Quick Reply */}
          <div className="p-4 border-t border-stone-700">
            <QuickReply
              clientId={params.id}
              clientEmail={client.email}
              clientPhone={client.phone}
              compact
            />
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-stone-500">Name</p>
              <p className="text-stone-100 font-medium">{client.full_name}</p>
            </div>
            {client.email && (
              <div>
                <p className="text-stone-500">Email</p>
                <p className="text-stone-200 truncate">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-stone-500">Phone</p>
                <p className="text-stone-200">{client.phone}</p>
              </div>
            )}
            <div>
              <p className="text-stone-500">Client Since</p>
              <p className="text-stone-200">
                {format(new Date(client.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Notes</p>
              <p className="text-stone-200">{notesCount ?? 0} notes recorded</p>
            </div>
          </CardContent>
        </Card>

        {/* Dietary Info */}
        {dietaryInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dietary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dietaryInfo.allergies && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(dietaryInfo.allergies)
                      ? dietaryInfo.allergies
                      : [dietaryInfo.allergies]
                    ).map((a: string) => (
                      <Badge key={a} variant="error" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {dietaryInfo.dietary_restrictions && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Restrictions</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(dietaryInfo.dietary_restrictions)
                      ? dietaryInfo.dietary_restrictions
                      : [dietaryInfo.dietary_restrictions]
                    ).map((r: string) => (
                      <Badge key={r} variant="warning" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {dietaryInfo.favorite_dishes &&
                (dietaryInfo.favorite_dishes as string[]).length > 0 && (
                  <div>
                    <p className="text-xs text-stone-500 mb-1">Favorites</p>
                    <p className="text-xs text-stone-300">
                      {(dietaryInfo.favorite_dishes as string[]).slice(0, 3).join(', ')}
                      {(dietaryInfo.favorite_dishes as string[]).length > 3 ? '...' : ''}
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-lg bg-stone-800/50 p-2 hover:bg-stone-700/50 transition-colors"
                >
                  <p className="text-sm font-medium text-stone-200">
                    {event.occasion || 'Event'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {event.event_date
                      ? format(new Date(event.event_date), 'MMM d, yyyy')
                      : 'Date TBD'}
                    {' '}
                    <Badge variant="default" className="text-xs ml-1">
                      {event.status}
                    </Badge>
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardContent className="py-3 space-y-1.5">
            <Link
              href={`/clients/${params.id}`}
              className="block text-sm text-brand-400 hover:text-brand-300"
            >
              Full client profile
            </Link>
            <Link
              href={`/inbox?clientId=${params.id}`}
              className="block text-sm text-brand-400 hover:text-brand-300"
            >
              View in inbox
            </Link>
            <Link
              href={`/events/new?client_id=${params.id}`}
              className="block text-sm text-brand-400 hover:text-brand-300"
            >
              Create event
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}