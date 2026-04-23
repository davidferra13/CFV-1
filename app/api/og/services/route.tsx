import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SERVICE_LABELS = [
  'Private dinners',
  'Catering',
  'Meal prep',
  'Cooking classes',
  'Weddings',
  'Corporate dining',
]

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(232,143,71,0.24), transparent 34%), linear-gradient(135deg, #14110f 0%, #1f1916 52%, #120f0d 100%)',
        color: '#fafaf9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 82% 18%, rgba(245, 158, 11, 0.16), transparent 22%), radial-gradient(circle at 88% 82%, rgba(217, 119, 6, 0.12), transparent 24%)',
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
                ChefFlow Services
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '70px',
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                Chef Services
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
                Browse service categories by live public chef supply.
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
                Exact counts on the page come from approved public chef profiles and published
                service tags.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '560px' }}>
            {SERVICE_LABELS.map((label) => (
              <div
                key={label}
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
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '360px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              padding: '24px',
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
              Inventory View
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  borderRadius: '22px',
                  background:
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.08))',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fafaf9',
                  }}
                >
                  Real counts
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '14px',
                    lineHeight: 1.45,
                    color: '#d6d3d1',
                  }}
                >
                  Service cards show exact tagged supply instead of generic promise copy.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  borderRadius: '22px',
                  background: 'rgba(41, 37, 36, 0.92)',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fafaf9',
                  }}
                >
                  Clean fallback
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '14px',
                    lineHeight: 1.45,
                    color: '#d6d3d1',
                  }}
                >
                  Empty categories fall back to the broader directory or booking request path.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '16px',
                  borderRadius: '22px',
                  background: 'rgba(41, 37, 36, 0.92)',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fafaf9',
                  }}
                >
                  Metadata fixed
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '14px',
                    lineHeight: 1.45,
                    color: '#d6d3d1',
                  }}
                >
                  Large-image social preview plus breadcrumb and collection schema on the route.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  )
}
