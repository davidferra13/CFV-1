'use client'

import { useEffect, useState } from 'react'

interface KioskSuccessScreenProps {
  onReset: () => void
  countdownSeconds?: number
}

export function KioskSuccessScreen({ onReset, countdownSeconds = 10 }: KioskSuccessScreenProps) {
  const [remaining, setRemaining] = useState(countdownSeconds)

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onReset()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onReset])

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      {/* Checkmark */}
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-900/30">
        <svg
          className="h-14 w-14 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-stone-100">Thank You!</h2>
        <p className="mt-3 text-lg text-stone-400">
          Your inquiry has been submitted. We'll be in touch soon.
        </p>
      </div>

      {/* Countdown */}
      <p className="text-sm text-stone-500">Returning to start in {remaining}s</p>

      <button
        onClick={onReset}
        className="rounded-xl bg-stone-800 px-8 py-3 text-base font-medium text-stone-300 transition-colors hover:bg-stone-700"
      >
        Start Over
      </button>
    </div>
  )
}
