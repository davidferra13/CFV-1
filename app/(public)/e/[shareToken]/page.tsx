import { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPublicEventByShareToken } from '@/lib/tickets/purchase-actions'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@/lib/db/server'
import { PublicEventView } from './public-event-view'

interface Props {
  params: Promise<{ shareToken: string }>
  searchParams: Promise<{ purchased?: string; cancelled?: string; ticket?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params
  const event = await getPublicEventByShareToken(shareToken)

  if (!event) return { title: 'Event Not Found' }

  const priceRange =
    event.ticketTypes.length > 0
      ? event.ticketTypes.filter((tt) => tt.is_active).map((tt) => tt.price_cents)
      : []

  const minPrice = priceRange.length > 0 ? Math.min(...priceRange) / 100 : null
  const maxPrice = priceRange.length > 0 ? Math.max(...priceRange) / 100 : null
  const priceText =
    minPrice !== null
      ? minPrice === maxPrice
        ? `$${minPrice}`
        : `$${minPrice} - $${maxPrice}`
      : null

  const description = [
    event.eventDate ? `Date: ${event.eventDate}` : null,
    event.locationText ? `Location: ${event.locationText}` : null,
    event.chefName ? `Chef: ${event.chefName}` : null,
    priceText ? `Tickets from ${priceText}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return {
    title: `${event.eventName} | ChefFlow`,
    description,
    openGraph: {
      title: event.eventName,
      description,
      type: 'website',
      ...(event.chefImageUrl ? { images: [{ url: event.chefImageUrl }] } : {}),
    },
  }
}

export default async function PublicEventPage({ params, searchParams }: Props) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  try {
    await checkRateLimit(`public-event:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const { shareToken } = await params
  const search = await searchParams
  const event = await getPublicEventByShareToken(shareToken)

  if (!event) {
    return (
      <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
          <section className="w-full rounded-lg border border-stone-700 bg-stone-900 p-6 text-center sm:p-8">
            <p className="mb-3 text-sm font-medium text-red-300">Event unavailable</p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-100">
              Event not found.
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              This event link is no longer available.
            </p>
          </section>
        </div>
      </main>
    )
  }

  // JSON-LD structured data for Google Events
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FoodEvent',
    name: event.eventName,
    ...(event.eventDate ? { startDate: event.eventDate } : {}),
    ...(event.locationText
      ? {
          location: {
            '@type': 'Place',
            name: event.locationText,
          },
        }
      : {}),
    ...(event.chefName
      ? {
          organizer: {
            '@type': 'Organization',
            name: event.chefName,
          },
        }
      : {}),
    ...(event.ticketTypes.length > 0
      ? {
          offers: event.ticketTypes
            .filter((tt) => tt.is_active)
            .map((tt) => ({
              '@type': 'Offer',
              name: tt.name,
              price: (tt.price_cents / 100).toFixed(2),
              priceCurrency: 'USD',
              availability:
                tt.remaining != null && tt.remaining <= 0
                  ? 'https://schema.org/SoldOut'
                  : 'https://schema.org/InStock',
            })),
        }
      : {}),
  }

  // Fetch ticket guest_token for QR code on confirmation screen
  let ticketGuestToken: string | null = null
  if (search.ticket) {
    try {
      const dbTicket: any = createServerClient({ admin: true })
      const { data: ticketRow } = await dbTicket
        .from('event_tickets')
        .select('guest_token')
        .eq('id', search.ticket)
        .maybeSingle()
      if (ticketRow) ticketGuestToken = ticketRow.guest_token
    } catch {
      // Non-blocking
    }
  }

  // Fetch circle URL for purchase preview and post-purchase confirmation screen
  let circleUrl: string | null = null
  try {
    const db: any = createServerClient({ admin: true })
    const { data: circleGroup } = await db
      .from('hub_groups')
      .select('group_token, message_count')
      .eq('event_id', event.eventId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (circleGroup?.group_token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
      circleUrl = `${appUrl}/hub/g/${circleGroup.group_token}`
    }
  } catch {
    // Non-blocking
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicEventView
        event={event}
        shareToken={shareToken}
        justPurchased={search.purchased === 'true'}
        purchaseCancelled={search.cancelled === 'true'}
        ticketId={search.ticket}
        ticketGuestToken={ticketGuestToken}
        circleUrl={circleUrl}
      />
    </>
  )
}
