'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { createEmergencyContact, deleteEmergencyContact } from '@/lib/contingency/actions'

type Contact = {
  id: string
  name: string
  relationship: string
  phone: string | null
  email: string | null
  notes: string | null
}

export function EmergencyContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    notes: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createEmergencyContact({
        name: form.name,
        relationship: form.relationship,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
        sort_order: initialContacts.length,
      })
      setForm({ name: '', relationship: '', phone: '', email: '', notes: '' })
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string) {
    setRemoveTargetId(id)
    setShowRemoveConfirm(true)
  }

  async function handleConfirmedDelete() {
    if (!removeTargetId) return
    setShowRemoveConfirm(false)
    try {
      await deleteEmergencyContact(removeTargetId)
      router.refresh()
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-4">
      {initialContacts.length === 0 && !showForm && (
        <p className="text-sm text-stone-500">No emergency contacts on file.</p>
      )}

      {initialContacts.map((c) => (
        <Card key={c.id}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-stone-100">{c.name}</p>
                <p className="text-sm text-stone-400">{c.relationship}</p>
                <div className="mt-0.5 flex gap-3 text-xs text-stone-400 flex-wrap">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                </div>
                {c.notes && <p className="mt-0.5 text-xs text-stone-400">{c.notes}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-stone-400 hover:text-red-600"
                onClick={() => handleDelete(c.id)}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!showForm ? (
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          + Add Contact
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-base font-semibold text-stone-100 mb-3">Add Emergency Contact</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Maria Santos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Relationship *
                  </label>
                  <Input
                    value={form.relationship}
                    onChange={(e) => update('relationship', e.target.value)}
                    placeholder="Sous chef, business partner…"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
                  <Input
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Available most weekends, prefers text…"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Contact'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        open={showRemoveConfirm}
        title="Remove this emergency contact?"
        description="This emergency contact will be permanently removed."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </div>
  )
}
