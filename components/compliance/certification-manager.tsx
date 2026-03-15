'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Award, Plus, Trash2, Pencil, Clock, AlertTriangle } from '@/components/ui/icons'
import {
  getCertifications,
  addCertification,
  updateCertification,
  deleteCertification,
  CERT_TYPE_LABELS,
  CERT_TYPES,
} from '@/lib/compliance/certification-actions'
import type {
  Certification,
  CertType,
  CertificationInput,
  CertStatus,
} from '@/lib/compliance/certification-actions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: CertStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>
    case 'expiring_soon':
      return <Badge variant="warning">Expiring Soon</Badge>
    case 'expired':
      return <Badge variant="error">Expired</Badge>
    case 'pending_renewal':
      return <Badge variant="warning">Pending Renewal</Badge>
    default:
      return <Badge variant="default">{status}</Badge>
  }
}

function daysUntilExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry date'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresAt + 'T00:00:00')
  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `Expired ${Math.abs(diffDays)} days ago`
  if (diffDays === 0) return 'Expires today'
  if (diffDays === 1) return 'Expires tomorrow'
  return `${diffDays} days remaining`
}

function groupByType(certs: Certification[]): Record<string, Certification[]> {
  const groups: Record<string, Certification[]> = {}
  for (const cert of certs) {
    const key = cert.cert_type
    if (!groups[key]) groups[key] = []
    groups[key].push(cert)
  }
  return groups
}

// ── Form Component ───────────────────────────────────────────────────────────

function CertificationForm({
  cert,
  onClose,
  onSave,
}: {
  cert?: Certification
  onClose: () => void
  onSave: (data: CertificationInput, certId?: string) => Promise<void>
}) {
  const isEditing = !!cert
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    cert_type: (cert?.cert_type ?? 'food_handler') as CertType,
    name: cert?.name ?? '',
    issuer: cert?.issuer ?? '',
    cert_number: cert?.cert_number ?? '',
    issued_at: cert?.issued_at ?? '',
    expires_at: cert?.expires_at ?? '',
    document_url: cert?.document_url ?? '',
    notes: cert?.notes ?? '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    const input: CertificationInput = {
      cert_type: form.cert_type,
      name: form.name.trim(),
      issuer: form.issuer.trim() || null,
      cert_number: form.cert_number.trim() || null,
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
      document_url: form.document_url.trim() || null,
      notes: form.notes.trim() || null,
    }

    startTransition(async () => {
      try {
        await onSave(input, cert?.id)
        onClose()
      } catch (err: any) {
        setError(err.message ?? 'Failed to save certification.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isEditing ? 'Edit Certification' : 'Add Certification'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-900/30 border border-red-700 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cert-type" className="block text-sm font-medium text-stone-300 mb-1">
                Type
              </label>
              <select
                id="cert-type"
                value={form.cert_type}
                onChange={(e) => update('cert_type', e.target.value)}
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              >
                {CERT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CERT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. ServSafe Manager Certification"
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Issuer</label>
              <input
                type="text"
                value={form.issuer}
                onChange={(e) => update('issuer', e.target.value)}
                placeholder="e.g. National Restaurant Association"
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Certificate Number
              </label>
              <input
                type="text"
                value={form.cert_number}
                onChange={(e) => update('cert_number', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="cert-issued-at"
                className="block text-sm font-medium text-stone-300 mb-1"
              >
                Issued Date
              </label>
              <input
                id="cert-issued-at"
                type="date"
                value={form.issued_at}
                onChange={(e) => update('issued_at', e.target.value)}
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="cert-expires-at"
                className="block text-sm font-medium text-stone-300 mb-1"
              >
                Expiry Date
              </label>
              <input
                id="cert-expires-at"
                type="date"
                value={form.expires_at}
                onChange={(e) => update('expires_at', e.target.value)}
                className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Document URL</label>
            <input
              type="url"
              value={form.document_url}
              onChange={(e) => update('document_url', e.target.value)}
              placeholder="Link to uploaded document (optional)"
              className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-md bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Certification'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Main Manager Component ───────────────────────────────────────────────────

export function CertificationManager() {
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCert, setEditingCert] = useState<Certification | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null)
  const [isPending, startTransition] = useTransition()

  async function loadCerts() {
    try {
      setFetchError(null)
      const data = await getCertifications()
      setCerts(data)
    } catch (err: any) {
      setFetchError(err.message ?? 'Failed to load certifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCerts()
  }, [])

  async function handleSave(data: CertificationInput, certId?: string) {
    if (certId) {
      await updateCertification(certId, data)
    } else {
      await addCertification(data)
    }
    await loadCerts()
  }

  function handleDelete(cert: Certification) {
    setDeleteTarget(cert)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    startTransition(async () => {
      try {
        await deleteCertification(id)
        setDeleteTarget(null)
        await loadCerts()
      } catch (err: any) {
        // Error shown via state, but keep modal open
        setFetchError(err.message ?? 'Failed to delete.')
        setDeleteTarget(null)
      }
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-stone-400 text-sm">Loading certifications...</div>
  }

  if (fetchError) {
    return (
      <div className="rounded-md bg-red-900/30 border border-red-700 p-4 text-sm text-red-300">
        Could not load certifications: {fetchError}
      </div>
    )
  }

  const grouped = groupByType(certs)
  const typeOrder = CERT_TYPES.filter((t) => grouped[t])

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-100">Certifications & Insurance</h2>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingCert(undefined)
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <CertificationForm
          cert={editingCert}
          onClose={() => {
            setShowForm(false)
            setEditingCert(undefined)
          }}
          onSave={handleSave}
        />
      )}

      {/* Empty state */}
      {certs.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-stone-400">
            <p className="text-sm">No certifications or insurance tracked yet.</p>
            <p className="text-xs mt-1">
              Add your food handler permits, ServSafe, business licenses, insurance policies, and
              health permits.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grouped list */}
      {typeOrder.map((type) => (
        <div key={type} className="space-y-2">
          <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide">
            {CERT_TYPE_LABELS[type]}
          </h3>
          {grouped[type].map((cert) => (
            <Card key={cert.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-stone-100">{cert.name}</p>
                      {statusBadge(cert.status)}
                    </div>
                    {cert.issuer && (
                      <p className="text-xs text-stone-500 mt-0.5">Issued by: {cert.issuer}</p>
                    )}
                    {cert.cert_number && (
                      <p className="text-xs text-stone-500">#{cert.cert_number}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                      {cert.issued_at && (
                        <span>
                          Issued: {new Date(cert.issued_at + 'T00:00:00').toLocaleDateString()}
                        </span>
                      )}
                      {cert.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysUntilExpiry(cert.expires_at)}
                        </span>
                      )}
                    </div>
                    {cert.notes && <p className="text-xs text-stone-500 mt-1">{cert.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingCert(cert)
                        setShowForm(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(cert)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Certification"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={isPending}
      />
    </div>
  )
}
