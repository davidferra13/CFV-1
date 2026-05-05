// Inline Phone Verification Component
// Shows a "Verify" button next to unverified phone numbers.
// On click: sends a code, shows 6-digit input, countdown, resend link.
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PhoneVerificationInlineProps {
  phoneE164: string
  isVerified: boolean
  onVerified?: () => void
  sendCodeAction: (phoneE164: string) => Promise<{ success: boolean; error?: string }>
  verifyCodeAction: (phoneE164: string, code: string) => Promise<{ valid: boolean; error?: string }>
}

type VerificationState = 'idle' | 'sending' | 'input' | 'verifying' | 'success' | 'error'

const CODE_EXPIRY_SECONDS = 300 // 5 minutes

export function PhoneVerificationInline({
  phoneE164,
  isVerified,
  onVerified,
  sendCodeAction,
  verifyCodeAction,
}: PhoneVerificationInlineProps) {
  const [state, setState] = useState<VerificationState>(isVerified ? 'success' : 'idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer for code expiry
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [countdown])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
      return
    }

    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    }
  }, [resendCooldown])

  const handleSendCode = useCallback(async () => {
    setState('sending')
    setError(null)
    setCode('')

    try {
      const result = await sendCodeAction(phoneE164)
      if (result.success) {
        setState('input')
        setCountdown(CODE_EXPIRY_SECONDS)
        setResendCooldown(60) // 60s before allowing resend
      } else {
        setState('error')
        setError(result.error || 'Failed to send code.')
      }
    } catch {
      setState('error')
      setError('Failed to send code. Please try again.')
    }
  }, [phoneE164, sendCodeAction])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return

    setState('verifying')
    setError(null)

    try {
      const result = await verifyCodeAction(phoneE164, code)
      if (result.valid) {
        setState('success')
        onVerified?.()
      } else {
        setState('input')
        setError(result.error || 'Invalid code.')
        setCode('')
      }
    } catch {
      setState('input')
      setError('Verification failed. Please try again.')
      setCode('')
    }
  }, [phoneE164, code, verifyCodeAction, onVerified])

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Already verified
  if (state === 'success' || isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Verified
      </span>
    )
  }

  // Idle: show verify button
  if (state === 'idle' || state === 'error') {
    return (
      <div className="inline-flex flex-col gap-1">
        <Button variant="secondary" size="sm" onClick={handleSendCode}>
          Verify
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  // Sending
  if (state === 'sending') {
    return (
      <Button variant="secondary" size="sm" loading disabled>
        Sending code...
      </Button>
    )
  }

  // Code input
  if (state === 'input' || state === 'verifying') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(val)
            }}
            className="w-24 text-center tracking-widest font-mono"
            disabled={state === 'verifying'}
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleVerify}
            disabled={code.length !== 6 || state === 'verifying'}
            loading={state === 'verifying'}
          >
            Confirm
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-400">
          {countdown > 0 && <span>Expires in {formatCountdown(countdown)}</span>}
          {countdown === 0 && <span className="text-amber-400">Code expired</span>}

          {resendCooldown > 0 ? (
            <span>Resend in {resendCooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleSendCode}
              className="text-brand-400 hover:text-brand-300 underline"
            >
              Resend code
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return null
}
