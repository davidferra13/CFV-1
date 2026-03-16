// Root Layout Error Boundary
// Catches errors that app/error.tsx cannot (e.g. errors in the root layout itself).
// This is a standalone page - it cannot use the root layout's styles or components,
// so it includes its own <html> and <body> tags with inline styles.
'use client'

import { useEffect } from 'react'

/**
 * Report an error to Sentry via the lightweight API route.
 * Non-blocking - failures are silently swallowed.
 */
function reportToSentry(error: Error & { digest?: string }) {
  try {
    fetch('/api/monitoring/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name,
        digest: error.digest,
        tags: { boundary: 'global-root' },
      }),
    }).catch(() => {
      // Swallow - reporting must never affect the user
    })
  } catch {
    // Swallow
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportToSentry(error)
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          backgroundColor: '#292524',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: '#1c1917',
            borderRadius: '0.75rem',
            border: '1px solid #44403c',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#450a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 style={{ color: '#fafaf9', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a8a29e', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            An unexpected error occurred. Our team has been notified.
          </p>

          {error.digest && (
            <p
              style={{
                color: '#78716c',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                margin: '0 0 1.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#e88f47',
                color: '#1c1917',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                backgroundColor: '#292524',
                color: '#fafaf9',
                border: '1px solid #44403c',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
