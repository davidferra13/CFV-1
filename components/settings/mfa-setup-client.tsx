'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import {
  initiateTotpSetup,
  confirmTotpSetup,
  disableMfa,
  regenerateRecoveryCodes,
} from '@/lib/mfa/actions'

type MfaStatus = {
  enabled: boolean
  type: 'totp' | 'sms' | null
  hasRecoveryCodes: boolean
}

type Step = 'idle' | 'qr' | 'recovery' | 'enabled' | 'disable-confirm' | 'regen-confirm'

export function MfaSetupClient({ initialStatus }: { initialStatus: MfaStatus }) {
  const [step, setStep] = useState<Step>(initialStatus.enabled ? 'enabled' : 'idle')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // QR setup state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)

  // Recovery codes state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  // Code input state
  const [code, setCode] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Disable/regen confirmation code
  const [confirmCode, setConfirmCode] = useState('')
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const clearError = useCallback(() => setError(null), [])

  // Step 1: Start TOTP setup
  function handleStartSetup() {
    clearError()
    startTransition(async () => {
      try {
        const result = await initiateTotpSetup()
        setQrDataUrl(result.qrDataUrl)
        setSecret(result.secret)
        setStep('qr')
        setCode('')
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  // Step 2: Verify code from authenticator
  function handleVerifyCode(codeValue?: string) {
    const toVerify = codeValue ?? code
    if (toVerify.length !== 6) return
    clearError()
    startTransition(async () => {
      try {
        const result = await confirmTotpSetup(toVerify)
        setRecoveryCodes(result.recoveryCodes)
        setStep('recovery')
        setCode('')
        setQrDataUrl(null)
        setSecret(null)
      } catch (err) {
        setError((err as Error).message)
        setCode('')
        codeInputRef.current?.focus()
      }
    })
  }

  // Disable MFA
  function handleDisable() {
    if (confirmCode.length !== 6) return
    clearError()
    startTransition(async () => {
      try {
        await disableMfa(confirmCode)
        setStep('idle')
        setConfirmCode('')
        setRecoveryCodes([])
      } catch (err) {
        setError((err as Error).message)
        setConfirmCode('')
        confirmInputRef.current?.focus()
      }
    })
  }

  // Regenerate recovery codes
  function handleRegenerate() {
    if (confirmCode.length !== 6) return
    clearError()
    startTransition(async () => {
      try {
        const result = await regenerateRecoveryCodes(confirmCode)
        setRecoveryCodes(result.recoveryCodes)
        setStep('recovery')
        setConfirmCode('')
      } catch (err) {
        setError((err as Error).message)
        setConfirmCode('')
        confirmInputRef.current?.focus()
      }
    })
  }

  // Digit-only input handler with auto-submit
  function handleCodeInput(
    value: string,
    setter: (v: string) => void,
    onComplete?: (v: string) => void
  ) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setter(digits)
    if (digits.length === 6 && onComplete) {
      onComplete(digits)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: select text for manual copy
    })
  }

  // --- IDLE: MFA not enabled ---
  if (step === 'idle') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-800">
            <svg
              className="h-5 w-5 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-stone-100">
              Two-factor authentication is off
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              Add an extra layer of security by requiring a code from your authenticator app when
              signing in.
            </p>
            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}
            <div className="mt-4">
              <Button variant="primary" onClick={handleStartSetup} loading={isPending}>
                Enable 2FA
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // --- QR CODE STEP ---
  if (step === 'qr') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Scan QR Code</h2>
          <p className="mt-1 text-sm text-stone-400">
            Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this
            QR code.
          </p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-4">
              <img
                src={qrDataUrl}
                alt="Scan this QR code with your authenticator app"
                className="h-48 w-48"
              />
            </div>
          </div>
        )}

        {/* Manual secret */}
        {secret && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">
              Or enter this code manually
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 font-mono text-sm text-stone-200 select-all break-all">
                {secret}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(secret)}
                title="Copy to clipboard"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* Verification code input */}
        <div>
          <p className="text-sm font-medium text-stone-300 mb-2">
            Enter the 6-digit code from your authenticator app to verify
          </p>
          {error && (
            <Alert variant="error" className="mb-3">
              {error}
            </Alert>
          )}
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  handleCodeInput(e.target.value, setCode, (v) => handleVerifyCode(v))
                }
                maxLength={6}
                autoFocus
                className="font-mono text-center text-lg tracking-[0.3em]"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => handleVerifyCode()}
              loading={isPending}
              disabled={code.length !== 6}
            >
              Verify
            </Button>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setStep('idle')
              setQrDataUrl(null)
              setSecret(null)
              setCode('')
              clearError()
            }}
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            Cancel setup
          </button>
        </div>
      </section>
    )
  }

  // --- RECOVERY CODES STEP ---
  if (step === 'recovery') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-stone-100">
              Two-factor authentication enabled
            </h2>
          </div>
          <p className="mt-1 text-sm text-stone-400">
            Save these recovery codes in a safe place. Each code can only be used once. If you lose
            access to your authenticator app, you can use a recovery code to sign in.
          </p>
        </div>

        <Alert variant="warning">
          These codes will not be shown again. Copy or write them down now.
        </Alert>

        {/* Recovery codes grid */}
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {recoveryCodes.map((rc) => (
              <code key={rc} className="font-mono text-sm text-stone-200">
                {rc}
              </code>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => copyToClipboard(recoveryCodes.join('\n'))}>
            Copy codes
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setStep('enabled')
              setRecoveryCodes([])
            }}
          >
            I have saved these codes
          </Button>
        </div>
      </section>
    )
  }

  // --- ENABLED: MFA is active ---
  if (step === 'enabled') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900/40">
            <svg
              className="h-5 w-5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-stone-100">
              Two-factor authentication is on
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              Your account is protected with an authenticator app. You will need to enter a code
              each time you sign in.
            </p>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setStep('regen-confirm')
              setConfirmCode('')
              clearError()
            }}
          >
            Regenerate recovery codes
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setStep('disable-confirm')
              setConfirmCode('')
              clearError()
            }}
          >
            Disable 2FA
          </Button>
        </div>
      </section>
    )
  }

  // --- DISABLE CONFIRM ---
  if (step === 'disable-confirm') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">
            Disable two-factor authentication
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            Enter a code from your authenticator app to confirm. This will remove the extra security
            layer from your account.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-end gap-3">
          <div className="w-40">
            <Input
              ref={confirmInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={confirmCode}
              onChange={(e) =>
                handleCodeInput(e.target.value, setConfirmCode, () => handleDisable())
              }
              maxLength={6}
              autoFocus
              className="font-mono text-center text-lg tracking-[0.3em]"
            />
          </div>
          <Button
            variant="danger"
            onClick={handleDisable}
            loading={isPending}
            disabled={confirmCode.length !== 6}
          >
            Disable 2FA
          </Button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setStep('enabled')
              setConfirmCode('')
              clearError()
            }}
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </section>
    )
  }

  // --- REGEN CONFIRM ---
  if (step === 'regen-confirm') {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Regenerate recovery codes</h2>
          <p className="mt-1 text-sm text-stone-400">
            This will invalidate your old recovery codes and generate a new set. Enter a code from
            your authenticator app to confirm.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-end gap-3">
          <div className="w-40">
            <Input
              ref={confirmInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={confirmCode}
              onChange={(e) =>
                handleCodeInput(e.target.value, setConfirmCode, () => handleRegenerate())
              }
              maxLength={6}
              autoFocus
              className="font-mono text-center text-lg tracking-[0.3em]"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleRegenerate}
            loading={isPending}
            disabled={confirmCode.length !== 6}
          >
            Regenerate
          </Button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setStep('enabled')
              setConfirmCode('')
              clearError()
            }}
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </section>
    )
  }

  return null
}
