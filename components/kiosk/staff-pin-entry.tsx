'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { StaffPinSession } from '@/lib/devices/types'

interface StaffPinEntryProps {
  token: string
  onVerified: (session: StaffPinSession) => void
}

// Generate a short click sound using Web Audio API (no asset files needed)
function playClickSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1200
    osc.type = 'sine'
    gain.gain.value = 0.08
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.05)
    // Clean up after sound finishes
    setTimeout(() => ctx.close(), 100)
  } catch {
    // Audio not available — ignore silently
  }
}

export function StaffPinEntry({ token, onVerified }: StaffPinEntryProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const submitRef = useRef<(() => void) | null>(null)

  const maxDigits = 6

  const handleSubmit = useCallback(
    async (pinToSubmit?: string) => {
      const submitPin = pinToSubmit ?? pin
      if (submitPin.length < 4) {
        setError('PIN must be at least 4 digits')
        return
      }

      setLoading(true)
      setError('')

      try {
        const res = await fetch('/api/kiosk/verify-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pin: submitPin }),
        })

        const data = await res.json()

        if (!res.ok) {
          setPin('')
          setError(data.error || 'Invalid PIN')
          setShake(true)
          setTimeout(() => setShake(false), 500)
          setLoading(false)
          return
        }

        onVerified({
          staff_member_id: data.staff_member_id,
          staff_name: data.staff_name,
          staff_role: data.staff_role ?? null,
          is_manager: !!data.is_manager,
          session_id: data.session_id,
        })
      } catch {
        setError('Network error')
        setLoading(false)
      }
    },
    [pin, token, onVerified]
  )

  // Store latest submit function for auto-submit
  submitRef.current = () => handleSubmit()

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= maxDigits) return
      playClickSound()
      setError('')
      const newPin = pin + digit
      setPin(newPin)
      // Auto-submit when max length reached
      if (newPin.length === maxDigits) {
        // Small delay so the dot animation renders before submission
        setTimeout(() => handleSubmit(newPin), 150)
      }
    },
    [pin, handleSubmit]
  )

  const handleBackspace = useCallback(() => {
    playClickSound()
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }, [])

  const handleClear = useCallback(() => {
    playClickSound()
    setPin('')
    setError('')
  }, [])

  // Reset PIN when component re-mounts (e.g., returning from idle)
  useEffect(() => {
    setPin('')
    setError('')
    setLoading(false)
  }, [])

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '']

  return (
    <div className={`w-full max-w-sm space-y-8 ${shake ? 'animate-shake' : ''}`}>
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>

      <div className="text-center">
        <h2 className="text-2xl font-semibold text-stone-100">Enter Your PIN</h2>
        <p className="mt-2 text-sm text-stone-400">Staff PIN required to continue</p>
      </div>

      {/* PIN display dots */}
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: maxDigits }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-colors ${
              i < pin.length ? 'bg-brand-500' : 'bg-stone-700'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit, i) => {
          if (digit === '' && i === 9) {
            // Bottom-left: Clear
            return (
              <button
                key="clear"
                type="button"
                onClick={handleClear}
                className="rounded-xl bg-stone-800 py-5 text-lg font-medium text-stone-400 transition-colors active:bg-stone-700"
              >
                Clear
              </button>
            )
          }
          if (digit === '' && i === 11) {
            // Bottom-right: Backspace
            return (
              <button
                key="back"
                type="button"
                title="Backspace"
                onClick={handleBackspace}
                className="flex items-center justify-center rounded-xl bg-stone-800 py-5 text-lg text-stone-400 transition-colors active:bg-stone-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a2 2 0 012 2v10a2 2 0 01-2 2H10.828a2 2 0 01-1.414-.586L3 12z"
                  />
                </svg>
              </button>
            )
          }
          return (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="rounded-xl bg-stone-800 py-5 text-2xl font-semibold text-stone-100 transition-colors active:bg-stone-700 disabled:opacity-50"
            >
              {digit}
            </button>
          )
        })}
      </div>

      {/* Submit button — for 4-5 digit PINs (6-digit auto-submits) */}
      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={loading || pin.length < 4}
        className="w-full rounded-xl bg-brand-500 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Enter'}
      </button>
    </div>
  )
}
