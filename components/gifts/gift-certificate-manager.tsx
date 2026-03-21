'use client'

import { useState, useTransition } from 'react'
import { Gift, Plus, Copy, Ban, Check, Search, Ticket } from 'lucide-react'
import type {
  GiftCertificateRow,
  GiftCertificateStatus,
  GiftCertificateCreateInput,
} from '@/lib/gifts/gift-certificate-actions'
import {
  createGiftCertificate,
  voidGiftCertificate,
  redeemGiftCertificate,
  getGiftCertificates,
} from '@/lib/gifts/gift-certificate-actions'
import { GiftCertificateCard } from './gift-certificate-card'

// ── Constants ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | GiftCertificateStatus

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'expired', label: 'Expired' },
  { value: 'voided', label: 'Voided' },
]

const STATUS_STYLES: Record<GiftCertificateStatus, string> = {
  active: 'bg-emerald-900/30 text-emerald-400',
  redeemed: 'bg-brand-900/30 text-brand-400',
  expired: 'bg-red-900/30 text-red-400',
  voided: 'bg-stone-800/50 text-stone-500',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  initialCertificates: GiftCertificateRow[]
}

export function GiftCertificateManager({ initialCertificates }: Props) {
  const [certs, setCerts] = useState<GiftCertificateRow[]>(initialCertificates)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemEventId, setRedeemEventId] = useState('')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [formAmount, setFormAmount] = useState('')
  const [formPurchaserName, setFormPurchaserName] = useState('')
  const [formPurchaserEmail, setFormPurchaserEmail] = useState('')
  const [formRecipientName, setFormRecipientName] = useState('')
  const [formRecipientEmail, setFormRecipientEmail] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  const filteredCerts = activeTab === 'all' ? certs : certs.filter((c) => c.status === activeTab)

  function resetForm() {
    setFormAmount('')
    setFormPurchaserName('')
    setFormPurchaserEmail('')
    setFormRecipientName('')
    setFormRecipientEmail('')
    setFormMessage('')
    setFormExpiresAt('')
    setShowCreate(false)
    setError(null)
  }

  function handleCreate() {
    const amountDollars = parseFloat(formAmount)
    if (!amountDollars || amountDollars <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!formPurchaserName.trim()) {
      setError('Purchaser name is required')
      return
    }

    const input: GiftCertificateCreateInput = {
      amount_cents: Math.round(amountDollars * 100),
      purchaser_name: formPurchaserName.trim(),
      purchaser_email: formPurchaserEmail.trim() || undefined,
      recipient_name: formRecipientName.trim() || undefined,
      recipient_email: formRecipientEmail.trim() || undefined,
      message: formMessage.trim() || undefined,
      expires_at: formExpiresAt || undefined,
    }

    setError(null)
    startTransition(async () => {
      try {
        const created = await createGiftCertificate(input)
        setCerts((prev) => [created, ...prev])
        resetForm()
      } catch (err: any) {
        setError(err?.message || 'Failed to create certificate')
      }
    })
  }

  function handleVoid(id: string) {
    const previous = certs
    setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'voided' as const } : c)))

    startTransition(async () => {
      try {
        await voidGiftCertificate(id)
      } catch (err: any) {
        setCerts(previous)
        setError(err?.message || 'Failed to void certificate')
      }
    })
  }

  function handleRedeem(cert: GiftCertificateRow) {
    if (!redeemEventId.trim()) {
      setError('Event ID is required for redemption')
      return
    }

    const amountCents = redeemAmount ? Math.round(parseFloat(redeemAmount) * 100) : undefined

    setError(null)
    startTransition(async () => {
      try {
        const updated = await redeemGiftCertificate(cert.code, redeemEventId.trim(), amountCents)
        setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setRedeemingId(null)
        setRedeemCode('')
        setRedeemEventId('')
        setRedeemAmount('')
      } catch (err: any) {
        setError(err?.message || 'Failed to redeem certificate')
      }
    })
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Gift Certificates</h2>
          <span className="text-sm text-stone-400">({certs.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Certificate
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-800/40 p-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4 space-y-4">
          <h3 className="text-sm font-medium text-stone-300">Create Gift Certificate</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Amount ($) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="100.00"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
              <span className="text-xs text-stone-500 mt-0.5 block">
                Default: 5 years (federal minimum)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Purchaser Name *</label>
              <input
                type="text"
                value={formPurchaserName}
                onChange={(e) => setFormPurchaserName(e.target.value)}
                placeholder="John Smith"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Purchaser Email</label>
              <input
                type="email"
                value={formPurchaserEmail}
                onChange={(e) => setFormPurchaserEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Recipient Name</label>
              <input
                type="text"
                value={formRecipientName}
                onChange={(e) => setFormRecipientName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Recipient Email</label>
              <input
                type="email"
                value={formRecipientEmail}
                onChange={(e) => setFormRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Personal Message</label>
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="Enjoy a special dining experience!"
              rows={2}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="rounded-lg border border-stone-600 px-3 py-1.5 text-sm text-stone-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating...' : 'Create Certificate'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-stone-700 pb-px">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.value
                ? 'bg-stone-700 text-white border-b-2 border-amber-500'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Certificate List */}
      {filteredCerts.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No gift certificates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCerts.map((cert) => (
            <div key={cert.id} className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-amber-400 font-mono text-sm font-bold tracking-wider">
                      {cert.code}
                    </code>
                    <button
                      onClick={() => copyCode(cert.code, cert.id)}
                      className="text-stone-500 hover:text-white transition-colors"
                      title="Copy code"
                    >
                      {copiedId === cert.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[cert.status]}`}
                    >
                      {cert.status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-white font-semibold">
                      {formatCents(cert.balance_cents)}
                    </span>
                    {cert.balance_cents !== cert.amount_cents && (
                      <span className="text-xs text-stone-500">
                        of {formatCents(cert.amount_cents)}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-stone-400 space-y-0.5">
                    <p>From: {cert.purchaser_name}</p>
                    {cert.recipient_name && <p>To: {cert.recipient_name}</p>}
                    {cert.expires_at && (
                      <p>Expires: {new Date(cert.expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {cert.status === 'active' && (
                    <>
                      <button
                        onClick={() => {
                          setRedeemingId(redeemingId === cert.id ? null : cert.id)
                          setRedeemCode(cert.code)
                        }}
                        className="rounded-lg border border-emerald-700 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-900/30 transition-colors"
                      >
                        Redeem
                      </button>
                      <button
                        onClick={() => handleVoid(cert.id)}
                        className="rounded-lg border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
                        title="Void certificate"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Redeem inline form */}
              {redeemingId === cert.id && (
                <div className="mt-3 pt-3 border-t border-stone-700 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-stone-400 mb-1">Event ID *</label>
                    <input
                      type="text"
                      value={redeemEventId}
                      onChange={(e) => setRedeemEventId(e.target.value)}
                      placeholder="Event UUID"
                      className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-stone-400 mb-1">Amount ($)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="Full"
                      className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleRedeem(cert)}
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setRedeemingId(null)}
                    className="rounded-lg border border-stone-600 px-2.5 py-1.5 text-sm text-stone-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
