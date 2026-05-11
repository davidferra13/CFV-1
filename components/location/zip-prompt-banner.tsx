'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveUserLocation } from '@/lib/location/location-actions'

const DISMISS_KEY = 'cf_zip_prompt_dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type ZipPromptBannerProps = {
  className?: string
}

export function ZipPromptBanner({ className }: ZipPromptBannerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [zip, setZip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(true)

  // Check localStorage dismissal on mount
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const ts = new Date(dismissed).getTime()
        if (Date.now() - ts < DISMISS_DURATION_MS) {
          return // stay hidden
        }
        localStorage.removeItem(DISMISS_KEY)
      }
      setHidden(false)
    } catch {
      setHidden(false)
    }
  }, [])

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    setHidden(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^\d{5}$/.test(zip)) {
      setError('Enter a valid 5-digit zip code')
      return
    }

    startTransition(async () => {
      try {
        const result = await saveUserLocation(zip)
        if (!result.success) {
          setError(result.error ?? 'Failed to save location')
          return
        }
        setHidden(true)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  if (hidden) return null

  return (
    <div
      className={cn(
        'relative rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3',
        className
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
      >
        <p className="text-sm text-blue-900 sm:flex-1">
          Set your zip code to unlock local pricing, nearby chefs, and more
        </p>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="Zip code"
              value={zip}
              onChange={(e) => {
                setZip(e.target.value.replace(/\D/g, '').slice(0, 5))
                if (error) setError(null)
              }}
              className={cn(
                'h-8 w-24 text-sm',
                error && 'border-red-400 focus-visible:ring-red-400'
              )}
              aria-label="Zip code"
            />
            {error && <span className="mt-0.5 text-xs text-red-600">{error}</span>}
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="h-8 px-3 text-sm">
            {isPending ? 'Saving...' : 'Set'}
          </Button>
        </div>
      </form>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
