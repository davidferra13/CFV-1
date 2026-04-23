import { ImageResponse } from 'next/og'
import { NEUTRAL_NEARBY_OG_LOCATION_TOKENS } from '@/lib/site/national-brand-copy'

export const runtime = 'edge'
export const alt = 'Nearby | ChefFlow food directory and collection guides'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TYPES = ['Restaurants', 'Bakeries', 'Caterers', 'Food trucks']

export type NearbyStaticOgSnapshot = {
  detail: string
  entries: string[]
  eyebrow: string
  subtitle: string
  title: string
  types: string[]
}

export function buildNearbyStaticOgSnapshot(): NearbyStaticOgSnapshot {
  return {
    detail: 'Curated guides, browse hubs, and live listings in one public landing page.',
    entries: NEUTRAL_NEARBY_OG_LOCATION_TOKENS,
    eyebrow: 'ChefFlow Directory',
    subtitle: 'Browse food operators before you search.',
    title: 'Nearby',
    types: TYPES,
  }
}

export default function Image() {
  const snapshot = buildNearbyStaticOgSnapshot()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(232,143,71,0.28), transparent 38%), linear-gradient(135deg, #14110f 0%, #1f1916 52%, #120f0d 100%)',
        color: '#fafaf9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.16), transparent 22%), radial-gradient(circle at 88% 78%, rgba(217, 119, 6, 0.14), transparent 24%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'linear-gradient(90deg, #f6b26b 0%, #e88f47 48%, #c96c2a 100%)',
        }}
      />

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          padding: '54px 56px 46px',
          gap: '28px',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f6b26b 0%, #d47530 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                CF
              </div>
              <div
                style={{
                  display: 'flex',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(245, 158, 11, 0.24)',
                  background: 'rgba(251, 191, 36, 0.08)',
                  color: '#fdba74',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {snapshot.eyebrow}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '72px',
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                {snapshot.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '560px',
                  fontSize: '28px',
                  lineHeight: 1.25,
                  color: '#d6d3d1',
                  fontWeight: 500,
                }}
              >
                {snapshot.subtitle}
              </div>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '560px',
                  fontSize: '20px',
                  lineHeight: 1.5,
                  color: '#a8a29e',
                }}
              >
                {snapshot.detail}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '560px' }}>
            {snapshot.types.map((type) => (
              <div
                key={type}
                style={{
                  display: 'flex',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  background: 'rgba(28, 25, 23, 0.78)',
                  border: '1px solid rgba(120, 113, 108, 0.45)',
                  color: '#f5f5f4',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {type}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '386px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '22px',
              borderRadius: '30px',
              background: 'rgba(28, 25, 23, 0.78)',
              border: '1px solid rgba(120, 113, 108, 0.3)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#f6b26b',
              }}
            >
              Browse guides + clusters
            </div>

            {snapshot.entries.map((city, index) => (
              <div
                key={city}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '22px',
                  background:
                    index === 0
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))'
                      : 'rgba(41, 37, 36, 0.92)',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#fafaf9',
                    }}
                  >
                    {city}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '14px',
                      color: '#a8a29e',
                    }}
                  >
                    Category, city, and cuisine entry points
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '58px',
                    height: '58px',
                    borderRadius: '18px',
                    background:
                      index === 0
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.88), rgba(217, 119, 6, 0.72))'
                        : 'linear-gradient(135deg, rgba(68, 64, 60, 0.96), rgba(41, 37, 36, 0.96))',
                    color: '#fff',
                    fontSize: '24px',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    { ...size }
  )
}
