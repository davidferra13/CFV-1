'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { reauthenticateAction } from '@/lib/security/reauth-actions'

export default function ReauthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/settings'

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await reauthenticateAction(password)
        if (result.success) {
          router.push(callbackUrl)
        } else {
          setError(result.error || 'Verification failed')
          setPassword('')
        }
      } catch {
        setError('Something went wrong. Please try again.')
        setPassword('')
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-100">Confirm your identity</h1>
          <p className="mt-2 text-sm text-stone-400">
            For your security, please re-enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !password}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Verifying...' : 'Confirm'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-700 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}
