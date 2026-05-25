'use client'

import { useState, useTransition } from 'react'
import { ExternalLink } from '@/components/ui/external-link'
import {
  ShieldCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
} from '@/components/ui/icons'
import type {
  Credential,
  CreateCredentialInput,
  CredentialType,
} from '@/lib/business-ops/credential-actions'
import {
  createCredential,
  updateCredential,
  deleteCredential,
} from '@/lib/business-ops/credential-actions'

const TYPE_LABELS: Record<CredentialType, string> = {
  food_handler: 'Food Handler',
  business_license: 'Business License',
  event_permit: 'Event Permit',
  certification: 'Certification',
  other: 'Other',
}

function getExpiryStatus(expiryDate: string | null): 'expired' | 'warning' | 'current' | 'none' {
  if (!expiryDate) return 'none'
  const now = new Date()
  const expiry = new Date(expiryDate)
  if (expiry < now) return 'expired'
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (expiry <= thirtyDays) return 'warning'
  return 'current'
}

function ExpiryBadge({ status }: { status: ReturnType<typeof getExpiryStatus> }) {
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-900/50 text-red-300">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/50 text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        Expiring Soon
      </span>
    )
  }
  if (status === 'current') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/50 text-green-300">
        <CheckCircle className="w-3 h-3" />
        Current
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-stone-700 text-stone-400">
      No Expiry
    </span>
  )
}

export function CredentialTracker({ initialData }: { initialData: Credential[] }) {
  const [credentials, setCredentials] = useState(initialData)
  const [isOpen, setIsOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Split into expiring and no-expiry
  const withExpiry = credentials.filter((c) => c.expiry_date)
  const noExpiry = credentials.filter((c) => !c.expiry_date)

  function handleCreate(formData: FormData) {
    const input: CreateCredentialInput = {
      credential_name: formData.get('credential_name') as string,
      credential_type: formData.get('credential_type') as CredentialType,
      issuing_authority: (formData.get('issuing_authority') as string) || null,
      credential_number: (formData.get('credential_number') as string) || null,
      issue_date: (formData.get('issue_date') as string) || null,
      expiry_date: (formData.get('expiry_date') as string) || null,
      renewal_url: (formData.get('renewal_url') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }
    startTransition(async () => {
      try {
        const result = await createCredential(input)
        setCredentials((prev) => [...prev, result.credential])
        setShowForm(false)
      } catch (e) {
        console.error('Failed to create credential:', e)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCredential(id)
        setCredentials((prev) => prev.filter((c) => c.id !== id))
      } catch (e) {
        console.error('Failed to delete credential:', e)
      }
    })
  }

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-750"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-stone-100">Credentials &amp; Licenses</h2>
          <span className="text-sm text-stone-400">({credentials.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {withExpiry.length === 0 && noExpiry.length === 0 && !showForm && (
            <p className="text-stone-500 text-sm py-2">No credentials tracked yet.</p>
          )}

          {withExpiry.map((cred) => {
            const status = getExpiryStatus(cred.expiry_date)
            return (
              <div
                key={cred.id}
                className="flex items-start justify-between p-3 bg-stone-900 rounded-md border border-stone-700"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-100">{cred.credential_name}</span>
                    <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                      {TYPE_LABELS[cred.credential_type]}
                    </span>
                    <ExpiryBadge status={status} />
                  </div>
                  {cred.issuing_authority && (
                    <p className="text-sm text-stone-400">{cred.issuing_authority}</p>
                  )}
                  {cred.credential_number && (
                    <p className="text-xs text-stone-500">#{cred.credential_number}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-stone-500">
                    {cred.expiry_date && (
                      <span>Expires: {new Date(cred.expiry_date).toLocaleDateString()}</span>
                    )}
                    {cred.renewal_url && (
                      <ExternalLink
                        href={cred.renewal_url}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Renew
                      </ExternalLink>
                    )}
                  </div>
                  {cred.notes && <p className="text-xs text-stone-500 mt-1">{cred.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(cred.id)}
                  disabled={isPending}
                  className="p-1 text-stone-500 hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {noExpiry.length > 0 && (
            <>
              <p className="text-xs text-stone-500 uppercase tracking-wide pt-2">No Expiry</p>
              {noExpiry.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-start justify-between p-3 bg-stone-900 rounded-md border border-stone-700"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{cred.credential_name}</span>
                      <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[cred.credential_type]}
                      </span>
                      <ExpiryBadge status="none" />
                    </div>
                    {cred.issuing_authority && (
                      <p className="text-sm text-stone-400">{cred.issuing_authority}</p>
                    )}
                    {cred.notes && <p className="text-xs text-stone-500 mt-1">{cred.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    disabled={isPending}
                    className="p-1 text-stone-500 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}

          {showForm ? (
            <form
              action={handleCreate}
              className="p-3 bg-stone-900 rounded-md border border-stone-700 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="credential_name"
                  placeholder="Credential name"
                  required
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <select
                  name="credential_type"
                  required
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  <option value="food_handler">Food Handler</option>
                  <option value="business_license">Business License</option>
                  <option value="event_permit">Event Permit</option>
                  <option value="certification">Certification</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="issuing_authority"
                  placeholder="Issuing authority"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="credential_number"
                  placeholder="License/cert number"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Issue Date</label>
                  <input
                    name="issue_date"
                    type="date"
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Expiry Date</label>
                  <input
                    name="expiry_date"
                    type="date"
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  />
                </div>
                <input
                  name="renewal_url"
                  placeholder="Renewal URL"
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <textarea
                  name="notes"
                  placeholder="Notes"
                  rows={2}
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="w-4 h-4" /> Add Credential
            </button>
          )}
        </div>
      )}
    </div>
  )
}
