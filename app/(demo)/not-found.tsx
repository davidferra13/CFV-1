import Link from 'next/link'

export default function DemoNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: '#fafaf9',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          borderRadius: '16px',
          border: '1px solid #e7e5e4',
          background: '#ffffff',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(28, 25, 23, 0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a8a29e',
          }}
        >
          Demo Mode Disabled
        </p>
        <h1
          style={{
            margin: '12px 0 8px',
            fontSize: '28px',
            fontWeight: 700,
            color: '#1c1917',
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#57534e',
          }}
        >
          Demo controls are only available when demo mode is enabled for this environment.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            color: '#c76f30',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  )
}
