// Event Card Image Generator
// Produces a 1080x1080 PNG optimized for Instagram sharing.
// GET /api/events/[id]/card

import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/db/admin'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db: any = createAdminClient()

  const { data: event } = await db
    .from('events')
    .select('id, title, occasion, event_date, serve_time, location, tenant_id')
    .eq('id', id)
    .single()

  if (!event) {
    return new Response('Event not found', { status: 404 })
  }

  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, profile_image_url')
    .eq('id', event.tenant_id)
    .single()

  // Get ticket price range
  const { data: ticketTypes } = await db
    .from('event_ticket_types')
    .select('price_cents, name')
    .eq('event_id', id)
    .eq('is_active', true)
    .order('price_cents', { ascending: true })

  const prices = (ticketTypes || []).map((t: any) => t.price_cents)
  const minPrice = prices.length > 0 ? Math.min(...prices) / 100 : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) / 100 : null
  const priceText =
    minPrice !== null ? (minPrice === maxPrice ? `$${minPrice}` : `From $${minPrice}`) : null

  const eventName = event.title || event.occasion || 'Special Event'
  const chefName = chef?.business_name || chef?.display_name || ''
  const dateText = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #1c1917 0%, #292524 40%, #1c1917 100%)',
        fontFamily: 'system-ui, sans-serif',
        padding: '80px',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'linear-gradient(90deg, #eda86b, #e88f47, #d47530)',
        }}
      />

      {/* Event type badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            padding: '8px 20px',
            background: 'rgba(237, 168, 107, 0.15)',
            border: '1px solid rgba(237, 168, 107, 0.3)',
            borderRadius: '24px',
            fontSize: '20px',
            color: '#eda86b',
            fontWeight: 600,
          }}
        >
          Dinner Event
        </div>
      </div>

      {/* Event name */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <h1
          style={{
            fontSize: eventName.length > 30 ? '56px' : '72px',
            fontWeight: 800,
            color: '#fafaf9',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-1px',
          }}
        >
          {eventName}
        </h1>

        {/* Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '40px',
          }}
        >
          {dateText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📅</span>
              <span style={{ fontSize: '28px', color: '#d6d3d1', fontWeight: 500 }}>
                {dateText}
              </span>
              {event.serve_time && (
                <span style={{ fontSize: '28px', color: '#a8a29e' }}>at {event.serve_time}</span>
              )}
            </div>
          )}
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📍</span>
              <span style={{ fontSize: '28px', color: '#d6d3d1', fontWeight: 500 }}>
                {event.location}
              </span>
            </div>
          )}
          {priceText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🎟️</span>
              <span style={{ fontSize: '28px', color: '#eda86b', fontWeight: 600 }}>
                {priceText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer with chef name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(168, 162, 158, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {chef?.profile_image_url && (
            <img
              src={chef.profile_image_url}
              width={56}
              height={56}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <span style={{ fontSize: '24px', color: '#a8a29e', fontWeight: 500 }}>{chefName}</span>
        </div>
        <span style={{ fontSize: '18px', color: '#57534e' }}>ChefFlow</span>
      </div>
    </div>,
    {
      width: 1080,
      height: 1080,
    }
  )
}
