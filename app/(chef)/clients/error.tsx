'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'clients', digest: error.digest },
    })
    console.error('[Clients Error]', error)
  }, [error])

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Clients error</CardTitle>
          <p className="text-sm text-stone-400 mt-1">Something went wrong loading client data.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error.message || error.digest) && (
            <div className="bg-red-950 border border-red-900 rounded-md p-3">
              {error.message && (
                <p className="text-sm text-red-200 font-mono break-all">{error.message}</p>
              )}
              {error.digest && (
                <p className="text-xs text-red-600 mt-1">Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Button variant="primary" onClick={reset} className="w-full">
              Try Again
            </Button>
            <Link href="/clients" className="block">
              <Button variant="secondary" className="w-full">
                Back to Clients
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
