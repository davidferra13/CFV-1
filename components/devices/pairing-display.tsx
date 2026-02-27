'use client'

import { useState, useEffect } from 'react'
import { getQrCodeUrl } from '@/lib/qr/qr-code'

interface PairingDisplayProps {
  pairingCode: string
  expiresAt: string
  onClose: () => void
}

export function PairingDisplay({ pairingCode, expiresAt, onClose }: PairingDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)

  // Countdown timer
  useEffect(() => {
    function updateTimer() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired')
        setExpired(true)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = pairingCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const pairingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/kiosk/pair?code=${pairingCode}`
  const qrUrl = getQrCodeUrl(pairingUrl, 200)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-stone-900 p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-100">Pairing Code</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-6 text-center">
          {/* Code display */}
          <div>
            <p className="mb-2 text-sm text-stone-400">Enter this code on the tablet</p>
            <div className="flex items-center justify-center gap-3">
              <span className="rounded-xl bg-stone-800 px-6 py-3 font-mono text-3xl tracking-[0.3em] text-stone-100">
                {pairingCode}
              </span>
              <button
                onClick={handleCopy}
                className="rounded-lg bg-stone-800 p-2.5 text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
                title="Copy code"
              >
                {copied ? (
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* QR code */}
          <div>
            <p className="mb-2 text-sm text-stone-400">Or scan this QR code</p>
            <div className="flex justify-center">
              <img
                src={qrUrl}
                alt="Pairing QR code"
                width={200}
                height={200}
                className="rounded-lg border border-stone-700 bg-white p-2"
              />
            </div>
          </div>

          {/* Expiry timer */}
          <div className={`text-sm ${expired ? 'text-red-400' : 'text-stone-400'}`}>
            {expired ? (
              'Code expired — generate a new one'
            ) : (
              <>
                Expires in <span className="font-mono font-medium">{timeLeft}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
