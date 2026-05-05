'use client'

/**
 * MFA Verification page.
 *
 * Shown after password login when the user has TOTP enabled.
 * Accepts a 6-digit TOTP code or a recovery code.
 * On success, updates the session to clear mfaPending and redirects.
 */
import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { verifyMfaLogin } from '@/lib/mfa/verify-login'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export default function MfaVerifyPage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRecovery, setIsRecovery] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const challengeId = (session?.user as Record<string, unknown> | undefined)?.mfaChallengeId as
    | string
    | undefined

  useEffect(() => {
    inputRef.current?.focus()
  }, [isRecovery])

  // If no MFA pending, redirect away
  useEffect(() => {
    if (session && !(session.user as Record<string, unknown>).mfaPending) {
      window.location.href = '/dashboard'
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !challengeId) return

    setError(null)
    setLoading(true)

    try {
      const result = await verifyMfaLogin(challengeId, code.trim(), isRecovery)

      if (!result.success) {
        setError(result.error ?? 'Verification failed')
        setCode('')
        inputRef.current?.focus()
        setLoading(false)
        return
      }

      // Update the session to clear mfaPending in the JWT
      await updateSession()

      // Hard redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      setError((err as Error).message || 'Verification failed')
      setCode('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">ChefFlow</h1>
          <p className="text-stone-400 mt-2">Two-factor authentication</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>
                {isRecovery ? 'Enter Recovery Code' : 'Enter Verification Code'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <p className="text-sm text-stone-400">
                {isRecovery
                  ? 'Enter one of your recovery codes (format: XXXX-XXXX).'
                  : 'Open your authenticator app and enter the 6-digit code.'}
              </p>

              <Input
                ref={inputRef}
                type="text"
                inputMode={isRecovery ? 'text' : 'numeric'}
                label={isRecovery ? 'Recovery Code' : 'Verification Code'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={isRecovery ? 'XXXX-XXXX' : '000000'}
                maxLength={isRecovery ? 9 : 6}
                autoComplete="one-time-code"
                disabled={loading}
                required
              />

              <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
                {loading ? 'Verifying...' : 'Verify'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-amber-500 hover:text-amber-400 underline"
                  onClick={() => {
                    setIsRecovery(!isRecovery)
                    setCode('')
                    setError(null)
                  }}
                  disabled={loading}
                >
                  {isRecovery ? 'Use authenticator app instead' : 'Use a recovery code'}
                </button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
