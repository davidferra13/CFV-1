'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addProspectManually } from '@/lib/prospecting/actions'
import { PROSPECT_CATEGORIES, PROSPECT_CATEGORY_LABELS } from '@/lib/prospecting/constants'
import type { ProspectCategory } from '@/lib/prospecting/constants'
import { Loader2, Plus, UserPlus, X } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'

export function AddProspectButton() {
  const [showForm, setShowForm] = useState(false)

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Add Prospect
      </Button>
    )
  }

  return <AddProspectForm onClose={() => setShowForm(false)} />
}

function AddProspectForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    prospect_type: 'organization' as 'organization' | 'individual',
    category: 'other' as string,
    email: '',
    phone: '',
    contact_person: '',
    city: '',
    state: '',
    notes: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await addProspectManually({
          name: form.name.trim(),
          prospect_type: form.prospect_type,
          category: form.category,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          contact_person: form.contact_person.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          notes: form.notes.trim() || null,
        } as any)
        if (result.success) {
          router.refresh()
          onClose()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add prospect')
      }
    })
  }

  return (
    <Card className="border-brand-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-400" />
            Add Prospect Manually
          </CardTitle>
          <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name — required */}
          <div>
            <label className="text-xs font-medium text-stone-400 block mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Business or person name..."
              required
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Type + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">Type</label>
              <select
                value={form.prospect_type}
                onChange={(e) => updateField('prospect_type', e.target.value)}
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm"
              >
                <option value="organization">Organization</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm"
              >
                {PROSPECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {PROSPECT_CATEGORY_LABELS[cat as ProspectCategory] ?? cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact info row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@example.com"
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Contact person */}
          <div>
            <label className="text-xs font-medium text-stone-400 block mb-1">Contact Person</label>
            <input
              type="text"
              value={form.contact_person}
              onChange={(e) => updateField('contact_person', e.target.value)}
              placeholder="Decision maker's name..."
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Location row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City..."
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400 block mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="State..."
                className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-stone-400 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="How you heard about them, referral source, etc..."
              rows={2}
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={!form.name.trim() || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prospect
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
