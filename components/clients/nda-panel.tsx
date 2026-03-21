'use client'

import { useState, useTransition } from 'react'
import { Lock, Plus, Trash2, Check, AlertTriangle } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { NdaBadge, getNdaBadgeStatus } from './nda-badge'
import type {
  NdaRow,
  NdaType,
  NdaStatus,
  NdaCreateInput,
} from '@/lib/clients/nda-management-actions'
import {
  createNdaRecord,
  updateNdaRecord,
  deleteNdaRecord,
  markNdaRecordSigned,
} from '@/lib/clients/nda-management-actions'

// ── Constants ──────────────────────────────────────────────────────────────

const NDA_TYPES: { value: NdaType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'mutual', label: 'Mutual' },
  { value: 'custom', label: 'Custom' },
]

const STATUS_STYLES: Record<NdaStatus, string> = {
  draft: 'bg-stone-700/50 text-stone-300',
  sent: 'bg-brand-900/30 text-brand-400',
  signed: 'bg-emerald-900/30 text-emerald-400',
  expired: 'bg-red-900/30 text-red-400',
  voided: 'bg-stone-800/50 text-stone-500',
}

const RESTRICTION_OPTIONS = [
  'No photography',
  'No social media',
  'No guest disclosure',
  'No location disclosure',
  'No menu disclosure',
]

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  clientId: string
  initialNdas: NdaRow[]
}

export function NdaPanel({ clientId, initialNdas }: Props) {
  const [ndas, setNdas] = useState<NdaRow[]>(initialNdas)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [formType, setFormType] = useState<NdaType>('standard')
  const [formExpiryDate, setFormExpiryDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formRestrictions, setFormRestrictions] = useState<string[]>([])

  const activeSigned = ndas.find((n) => n.status === 'signed')
  const nearestExpiry = activeSigned?.expiry_date ?? null
  const badgeStatus = getNdaBadgeStatus(!!activeSigned, nearestExpiry)

  const resetForm = () => {
    setFormType('standard')
    setFormExpiryDate('')
    setFormNotes('')
    setFormRestrictions([])
    setShowForm(false)
  }

  const handleCreate = () => {
    const input: NdaCreateInput = {
      nda_type: formType,
      expiry_date: formExpiryDate || null,
      notes: formNotes || null,
      restrictions: formRestrictions,
    }

    const prev = ndas
    startTransition(async () => {
      try {
        const created = await createNdaRecord(clientId, input)
        setNdas([created, ...ndas])
        resetForm()
      } catch (err) {
        setNdas(prev)
        console.error('[NdaPanel] Create failed:', err)
      }
    })
  }

  const handleDelete = (id: string) => {
    const prev = ndas
    setNdas(ndas.filter((n) => n.id !== id))
    startTransition(async () => {
      try {
        await deleteNdaRecord(id)
      } catch (err) {
        setNdas(prev)
        console.error('[NdaPanel] Delete failed:', err)
      }
    })
  }

  const handleMarkSigned = (id: string) => {
    const prev = ndas
    setNdas(
      ndas.map((n) =>
        n.id === id
          ? {
              ...n,
              status: 'signed' as NdaStatus,
              signed_date: new Date().toISOString().split('T')[0],
            }
          : n
      )
    )
    startTransition(async () => {
      try {
        const updated = await markNdaRecordSigned(id)
        setNdas((curr) => curr.map((n) => (n.id === id ? updated : n)))
      } catch (err) {
        setNdas(prev)
        console.error('[NdaPanel] Mark signed failed:', err)
      }
    })
  }

  const handleVoid = (id: string) => {
    const prev = ndas
    setNdas(ndas.map((n) => (n.id === id ? { ...n, status: 'voided' as NdaStatus } : n)))
    startTransition(async () => {
      try {
        const updated = await updateNdaRecord(id, { status: 'voided' })
        setNdas((curr) => curr.map((n) => (n.id === id ? updated : n)))
      } catch (err) {
        setNdas(prev)
        console.error('[NdaPanel] Void failed:', err)
      }
    })
  }

  const toggleRestriction = (r: string) => {
    setFormRestrictions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }

  const getExpiryWarning = (nda: NdaRow): 'amber' | 'red' | null => {
    if (nda.status !== 'signed' || !nda.expiry_date) return null
    const days = Math.ceil(
      (new Date(nda.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (days <= 0) return 'red'
    if (days <= 7) return 'red'
    if (days <= 30) return 'amber'
    return null
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-200">NDA Management</h3>
          <NdaBadge status={badgeStatus} compact />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
        >
          <Plus className="h-3 w-3" />
          Add NDA
        </button>
      </div>

      {/* Add NDA Form */}
      {showForm && (
        <div className="mb-4 rounded border border-stone-600 bg-stone-800 p-3 space-y-3">
          {/* Type */}
          <div>
            <label className="mb-1 block text-xs text-stone-400">NDA Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as NdaType)}
              className="w-full rounded bg-stone-700 px-2 py-1.5 text-sm text-stone-200 border border-stone-600"
            >
              {NDA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry date */}
          <div>
            <label className="mb-1 block text-xs text-stone-400">Expiry Date (optional)</label>
            <input
              type="date"
              value={formExpiryDate}
              onChange={(e) => setFormExpiryDate(e.target.value)}
              className="w-full rounded bg-stone-700 px-2 py-1.5 text-sm text-stone-200 border border-stone-600"
            />
          </div>

          {/* Restrictions */}
          <div>
            <label className="mb-1 block text-xs text-stone-400">Restrictions</label>
            <div className="flex flex-wrap gap-2">
              {RESTRICTION_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRestriction(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    formRestrictions.includes(r)
                      ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                      : 'border-stone-600 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs text-stone-400">Notes (optional)</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="w-full rounded bg-stone-700 px-2 py-1.5 text-sm text-stone-200 border border-stone-600"
              placeholder="Additional details about this NDA..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create NDA'}
            </button>
            <button
              onClick={resetForm}
              className="rounded bg-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NDA List */}
      {ndas.length === 0 ? (
        <p className="text-xs text-stone-500">No NDAs on file for this client.</p>
      ) : (
        <div className="space-y-2">
          {ndas.map((nda) => {
            const warning = getExpiryWarning(nda)
            return (
              <div
                key={nda.id}
                className="flex items-start justify-between rounded border border-stone-700 bg-stone-800 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[nda.status]
                      }`}
                    >
                      {nda.status}
                    </span>
                    <span className="text-xs text-stone-400 capitalize">{nda.nda_type}</span>
                    {warning && (
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          warning === 'red' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {nda.expiry_date ? `Expires ${nda.expiry_date}` : 'Expiring'}
                      </span>
                    )}
                  </div>

                  {/* Restrictions */}
                  {nda.restrictions && nda.restrictions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {nda.restrictions.map((r) => (
                        <span
                          key={r}
                          className="rounded bg-stone-700/50 px-1.5 py-0.5 text-xxs text-stone-400"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {nda.notes && <p className="mt-1 text-xs text-stone-500">{nda.notes}</p>}

                  <p className="mt-1 text-xxs text-stone-600">
                    Created {new Date(nda.created_at).toLocaleDateString()}
                    {nda.signed_date && ` | Signed ${nda.signed_date}`}
                    {nda.expiry_date && ` | Expires ${nda.expiry_date}`}
                  </p>
                </div>

                {/* Row actions */}
                <div className="ml-2 flex items-center gap-1">
                  {nda.status === 'draft' || nda.status === 'sent' ? (
                    <button
                      onClick={() => handleMarkSigned(nda.id)}
                      disabled={isPending}
                      className="rounded p-1 text-emerald-500 hover:bg-emerald-900/30"
                      title="Mark as signed"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {nda.status !== 'voided' && (
                    <button
                      onClick={() => handleVoid(nda.id)}
                      disabled={isPending}
                      className="rounded p-1 text-stone-500 hover:bg-stone-700"
                      title="Void NDA"
                    >
                      <span className="text-xs">Void</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmId(nda.id)}
                    disabled={isPending}
                    className="rounded p-1 text-red-500 hover:bg-red-900/30"
                    title="Delete NDA"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete NDA?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />
    </div>
  )
}
