// Google Review URL Setting — Chef configures their Google Business review link
// Clients are redirected here after leaving internal feedback

'use client'

import { useState, useTransition } from 'react'
import { updateGoogleReviewUrl } from '@/lib/reviews/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export function GoogleReviewUrlForm({ currentUrl }: { currentUrl: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [url, setUrl] = useState(currentUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateGoogleReviewUrl(url || null)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google Review Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-sm text-stone-400 mb-2">
              After clients leave internal feedback, they&apos;ll be prompted to also leave you a
              Google review. Paste your Google Business review link below.
            </p>
            <Input
              type="url"
              placeholder="https://g.page/r/your-business/review"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-stone-400 mt-1">
              Find this in Google Business Profile &rarr; Share review form
            </p>
          </div>

          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Google Review link saved.</Alert>}

          <Button type="submit" variant="primary" size="sm" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
