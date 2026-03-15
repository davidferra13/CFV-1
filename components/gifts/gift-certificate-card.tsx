'use client'

import { useState } from 'react'
import { Copy, Check, Share2, Printer, Gift } from 'lucide-react'
import type { GiftCertificateRow } from '@/lib/gifts/gift-certificate-actions'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  certificate: GiftCertificateRow
  /** Base URL for shareable link (e.g. https://app.cheflowhq.com/gift) */
  baseUrl?: string
}

export function GiftCertificateCard({ certificate, baseUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const cert = certificate
  const shareUrl = baseUrl ? `${baseUrl}?code=${cert.code}` : null

  function copyCode() {
    navigator.clipboard.writeText(cert.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="gift-certificate-card max-w-lg mx-auto">
      {/* Card */}
      <div className="relative rounded-2xl border-2 border-amber-600/40 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-6 shadow-xl overflow-hidden print:border-amber-800 print:shadow-none">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-400" />
            <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">
              Gift Certificate
            </span>
          </div>
          {cert.expires_at && (
            <span className="text-xs text-stone-500">
              Valid until {new Date(cert.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="relative text-center mb-6">
          <p className="text-4xl font-bold text-white tracking-tight">
            {formatCents(cert.amount_cents)}
          </p>
          {cert.balance_cents !== cert.amount_cents && (
            <p className="text-sm text-stone-400 mt-1">
              Remaining: {formatCents(cert.balance_cents)}
            </p>
          )}
        </div>

        {/* Code */}
        <div className="relative flex items-center justify-center gap-2 mb-6">
          <code className="rounded-lg bg-stone-900/80 border border-stone-700 px-4 py-2 text-xl font-mono font-bold text-amber-400 tracking-[0.2em]">
            {cert.code}
          </code>
          <button
            onClick={copyCode}
            className="rounded-lg border border-stone-700 p-2 text-stone-400 hover:text-white hover:border-stone-500 transition-colors print:hidden"
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* From / To */}
        <div className="relative grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">From</p>
            <p className="text-stone-200">{cert.purchaser_name}</p>
          </div>
          {cert.recipient_name && (
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">To</p>
              <p className="text-stone-200">{cert.recipient_name}</p>
            </div>
          )}
        </div>

        {/* Message */}
        {cert.message && (
          <div className="relative rounded-lg bg-stone-900/50 border border-stone-700/50 p-3 mb-4">
            <p className="text-sm text-stone-300 italic text-center leading-relaxed">
              &quot;{cert.message}&quot;
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="relative border-t border-dashed border-stone-700 my-4" />

        {/* Footer */}
        <div className="relative text-center text-xs text-stone-500">
          <p>Present this code when booking your private chef experience.</p>
          <p className="mt-1">Non-transferable. Cannot be exchanged for cash.</p>
        </div>
      </div>

      {/* Action Buttons (hidden when printing) */}
      <div className="flex items-center justify-center gap-3 mt-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg border border-stone-600 px-3 py-1.5 text-sm text-stone-400 hover:text-white transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        {shareUrl && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg border border-stone-600 px-3 py-1.5 text-sm text-stone-400 hover:text-white transition-colors"
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share Link
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
