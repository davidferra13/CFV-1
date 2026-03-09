// Dynamic OG Image for Social Share Cards
// Generates a 1200x630 image for link previews on Twitter, Facebook, iMessage, etc.

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getShareCard } from '@/lib/hub/share-card-actions'
import type { ShareCardSnapshot } from '@/lib/hub/share-card-actions'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400 })
  }

  const card = await getShareCard(token)
  if (!card) {
    return new Response('Not found', { status: 404 })
  }

  const s = card.snapshot as ShareCardSnapshot
  const primaryColor = s.theme_colors?.primary ?? '#e88f47'
  const accentColor = s.theme_colors?.accent ?? '#fbbf24'

  // Build course summary (max 4 courses shown)
  const courseNames = s.courses.slice(0, 4).map((c) => c.name)
  const dishHighlights = s.courses
    .flatMap((c) => c.dishes)
    .slice(0, 6)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1c1917',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '100%',
            background: `radial-gradient(circle, ${primaryColor}30, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '100%',
            background: `radial-gradient(circle, ${primaryColor}20, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 56px',
            flex: 1,
            position: 'relative',
          }}
        >
          {/* Top row: emoji + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {s.group_emoji && (
              <span style={{ fontSize: 48 }}>{s.group_emoji}</span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#fafaf9',
                  lineClamp: 1,
                }}
              >
                {s.group_name}
              </span>
              {s.theme_name && (
                <span style={{ fontSize: 16, color: primaryColor, marginTop: 4 }}>
                  {s.theme_name}
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 16,
              fontSize: 14,
              color: '#a8a29e',
            }}
          >
            {s.occasion && <span>{s.occasion}</span>}
            {s.event_date && (
              <span>
                {new Date(s.event_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {s.guest_count && <span>{s.guest_count} guests</span>}
          </div>

          {/* Menu section */}
          {dishHighlights.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 28,
                padding: '20px 24px',
                borderRadius: 16,
                border: '1px solid #44403c',
                backgroundColor: '#292524',
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                {courseNames.map((name, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: primaryColor,
                      padding: '4px 10px',
                      borderRadius: 999,
                      backgroundColor: `${primaryColor}20`,
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                {dishHighlights.map((dish, i) => (
                  <span key={i} style={{ fontSize: 15, color: '#d6d3d1' }}>
                    {dish}
                    {i < dishHighlights.length - 1 ? ' ' : ''}
                  </span>
                ))}
                {s.courses.flatMap((c) => c.dishes).length > 6 && (
                  <span style={{ fontSize: 15, color: '#78716c' }}>
                    +{s.courses.flatMap((c) => c.dishes).length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bottom: chef + branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: dishHighlights.length > 0 ? 20 : 'auto',
            }}
          >
            {/* Chef */}
            {s.chef_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '100%',
                    backgroundColor: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {s.chef_name[0]?.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fafaf9' }}>
                    {s.chef_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#78716c' }}>Private Chef</span>
                </div>
              </div>
            )}

            {/* ChefFlow branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#57534e' }}>Powered by</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: primaryColor }}>
                ChefFlow
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
