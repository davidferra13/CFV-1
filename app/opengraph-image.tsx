import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ChefFlow — Ops for Artists'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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

      {/* Logo mark */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #eda86b, #d47530)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          boxShadow: '0 4px 14px rgba(212, 117, 48, 0.3)',
        }}
      >
        <span
          style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          CF
        </span>
      </div>

      {/* Brand name */}
      <h1
        style={{
          fontSize: '72px',
          fontWeight: 700,
          color: '#1c1917',
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        ChefFlow
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: '28px',
          color: '#78716c',
          margin: '16px 0 0 0',
          fontWeight: 400,
          letterSpacing: '0.05em',
        }}
      >
        Ops for Artists
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '18px',
          color: '#a8a29e',
          margin: '12px 0 0 0',
          fontWeight: 400,
        }}
      >
        Private chef business operating system
      </p>

      {/* Bottom accent */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#eda86b' }} />
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e88f47' }} />
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#d47530' }} />
      </div>
    </div>,
    { ...size }
  )
}
