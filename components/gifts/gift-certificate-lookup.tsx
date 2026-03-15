'use client'

import { useState, useTransition } from 'react'
import { Search, Gift } from 'lucide-react'
import { lookupGiftCertificate } from '@/lib/gifts/gift-certificate-actions'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  active: { label: 'Active', style: 'bg-emerald-900/30 text-emerald-400' },
  redeemed: { label: 'Fully Redeemed', style: 'bg-blue-900/30 text-blue-400' },
  expired: { label: 'Expired', style: 'bg-red-900/30 text-red-400' },
  voided: { label: 'Voided', style: 'bg-stone-800/50 text-stone-500' },
}

// ── Component ──────────────────────────────────────────────────────────────

type LookupResult = {
  code: string
  amount_cents: number
  balance_cents: number
  status: string
  expires_at: string | null
  recipient_name: string | null
  message: string | null
}

export function GiftCertificateLookup() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLookup() {
    if (!code.trim()) return

    setNotFound(false)
    setResult(null)

    startTransition(async () => {
      try {
        const data = await lookupGiftCertificate(code.trim())
        if (data) {
          setResult(data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      }
    })
  }

  const statusInfo = result ? STATUS_LABELS[result.status] || STATUS_LABELS.active : null

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <Gift className="h-8 w-8 text-amber-400 mx-auto mb-2" />
        <h2 className="text-lg font-semibold text-white">Check Gift Certificate</h2>
        <p className="text-sm text-stone-400 mt-1">Enter your code to check the balance</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          placeholder="Enter code (e.g. ABCD1234)"
          maxLength={8}
          className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white placeholder-stone-500 uppercase focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={handleLookup}
          disabled={isPending || !code.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {notFound && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-400">
            No gift certificate found with that code. Please check and try again.
          </p>
        </div>
      )}

      {result && statusInfo && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-5 space-y-3">
          <div className="text-center">
            <code className="text-amber-400 font-mono text-xl font-bold tracking-widest">
              {result.code}
            </code>
            <div className="mt-1">
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${statusInfo.style}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs text-stone-400">Original Amount</p>
              <p className="text-lg font-semibold text-white">{formatCents(result.amount_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Remaining Balance</p>
              <p className="text-lg font-semibold text-emerald-400">
                {formatCents(result.balance_cents)}
              </p>
            </div>
          </div>

          {result.expires_at && (
            <p className="text-xs text-stone-400 text-center">
              Expires: {new Date(result.expires_at).toLocaleDateString()}
            </p>
          )}

          {result.recipient_name && (
            <p className="text-sm text-stone-300 text-center">For: {result.recipient_name}</p>
          )}

          {result.message && (
            <div className="rounded-lg bg-stone-900/50 p-3 border border-stone-700">
              <p className="text-sm text-stone-300 italic text-center">
                &quot;{result.message}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
