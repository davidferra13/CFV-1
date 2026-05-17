'use client'

// Embed error boundary - uses INLINE STYLES only (no Tailwind)
// This runs inside iframes on external websites where Tailwind is not available.

import { useEffect } from 'react'

export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Embed Error]', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#1a1a1a' }}>
          Booking form failed to load
        </p>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Check your internet connection and try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            backgroundColor: '#e88f47',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
