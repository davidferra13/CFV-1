type ClientErrorTags = Record<string, string | undefined>

export function reportClientBoundaryError(
  error: Error & { digest?: string },
  tags: ClientErrorTags
): void {
  try {
    void fetch('/api/monitoring/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name,
        digest: error.digest,
        tags: {
          ...tags,
          route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      }),
    })
  } catch {
    // Reporting must never break the boundary itself.
  }
}
