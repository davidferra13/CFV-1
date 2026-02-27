import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const alt = 'Chef Profile — ChefFlow'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, tagline, bio, profile_image_url, cuisine_types')
    .eq('slug', params.slug)
    .eq('profile_public', true)
    .single()

  if (!chef) {
    // Fallback to generic ChefFlow OG image
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fef9f3 0%, #f5f3ef 50%, #ede9e4 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #eda86b, #e88f47, #d47530)',
          }}
        />
        <h1 style={{ fontSize: '64px', fontWeight: 700, color: '#1c1917', margin: 0 }}>
          Chef Not Found
        </h1>
        <p style={{ fontSize: '24px', color: '#78716c', margin: '16px 0 0 0' }}>ChefFlow</p>
      </div>,
      { ...size }
    )
  }

  const subtitle =
    chef.tagline || chef.bio?.slice(0, 100) || 'Private Chef — Book your next dining experience'
  const initials = chef.display_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Brand accent bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #eda86b, #e88f47, #d47530)',
        }}
      />

      {/* Left side — Chef photo or initials */}
      <div
        style={{
          width: '400px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {chef.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.profile_image_url}
            alt={chef.display_name}
            width={280}
            height={280}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #e88f47',
              boxShadow: '0 8px 32px rgba(232, 143, 71, 0.3)',
            }}
          />
        ) : (
          <div
            style={{
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #eda86b, #d47530)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(232, 143, 71, 0.3)',
            }}
          >
            <span style={{ fontSize: '96px', fontWeight: 700, color: '#ffffff' }}>{initials}</span>
          </div>
        )}
      </div>

      {/* Right side — Text content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingRight: '60px',
          paddingLeft: '20px',
        }}
      >
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 700,
            color: '#fafaf9',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {chef.display_name}
        </h1>

        <p
          style={{
            fontSize: '22px',
            color: '#a8a29e',
            margin: '16px 0 0 0',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {subtitle}
        </p>

        {/* Cuisine tags */}
        {chef.cuisine_types && chef.cuisine_types.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '24px' }}>
            {chef.cuisine_types.slice(0, 4).map((cuisine: string) => (
              <span
                key={cuisine}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#e88f47',
                  background: 'rgba(232, 143, 71, 0.15)',
                  border: '1px solid rgba(232, 143, 71, 0.3)',
                }}
              >
                {cuisine}
              </span>
            ))}
          </div>
        )}

        {/* ChefFlow branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '32px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #eda86b, #d47530)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>CF</span>
          </div>
          <span style={{ fontSize: '16px', color: '#78716c', fontWeight: 500 }}>
            Book on ChefFlow
          </span>
        </div>
      </div>
    </div>,
    { ...size }
  )
}
