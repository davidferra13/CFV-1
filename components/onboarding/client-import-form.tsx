'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowRight, X } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { importClientDirect } from '@/lib/clients/import-actions'

type ImportedClient = {
  id: string
  full_name: string
  total_events_count: number | null
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  preferred_contact_method: 'text' as const,
  referral_source: '',
  dietary_restrictions: [] as string[],
  allergies: [] as string[],
  lifetime_events_count: '',
  lifetime_value_dollars: '',
}

export function ClientImportForm({ initialClients }: { initialClients: ImportedClient[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(EMPTY_FORM)
  const [clients, setClients] = useState<ImportedClient[]>(initialClients)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState({ dietary: '', allergy: '' })

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addTag(type: 'dietary' | 'allergy') {
    const raw = type === 'dietary' ? tagInput.dietary : tagInput.allergy
    const value = raw.trim()
    if (!value) return
    const field = type === 'dietary' ? 'dietary_restrictions' : 'allergies'
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field] : [...prev[field], value],
    }))
    setTagInput((prev) => ({ ...prev, [type]: '' }))
  }

  function removeTag(type: 'dietary' | 'allergy', tag: string) {
    const field = type === 'dietary' ? 'dietary_restrictions' : 'allergies'
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((t) => t !== tag) }))
  }

  function handleTagKeyDown(e: React.KeyboardEvent, type: 'dietary' | 'allergy') {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(type)
    }
  }

  function handleSave() {
    if (!form.full_name.trim()) {
      setError('Client name is required')
      return
    }
    setError(null)

    const valueDollars = parseFloat(form.lifetime_value_dollars || '0')
    const valueCents = isNaN(valueDollars) ? 0 : Math.round(valueDollars * 100)

    startTransition(async () => {
      try {
        const result = await importClientDirect({
          full_name: form.full_name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          preferred_contact_method: form.preferred_contact_method,
          referral_source: form.referral_source.trim() || undefined,
          dietary_restrictions: form.dietary_restrictions,
          allergies: form.allergies,
          lifetime_events_count: parseInt(form.lifetime_events_count || '0', 10) || 0,
          lifetime_value_cents: valueCents,
        })
        setClients((prev) => [...prev, result.client])
        setForm(EMPTY_FORM)
        setTagInput({ dietary: '', allergy: '' })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to import client')
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form — left panel (3/5) */}
      <div className="lg:col-span-3 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="Jane Smith"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </div>
            </div>

            {/* Preferred contact */}
            <div className="space-y-1.5">
              <Label htmlFor="contact_method">Preferred Contact</Label>
              <select
                id="contact_method"
                value={form.preferred_contact_method}
                onChange={(e) => set('preferred_contact_method', e.target.value)}
                className="flex h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            {/* Referral source */}
            <div className="space-y-1.5">
              <Label htmlFor="referral_source">How did they find you?</Label>
              <Input
                id="referral_source"
                value={form.referral_source}
                onChange={(e) => set('referral_source', e.target.value)}
                placeholder="Referral from Sarah, Instagram, word of mouth…"
              />
            </div>

            {/* Dietary restrictions */}
            <div className="space-y-1.5">
              <Label>Dietary Restrictions</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput.dietary}
                  onChange={(e) => setTagInput((prev) => ({ ...prev, dietary: e.target.value }))}
                  onKeyDown={(e) => handleTagKeyDown(e, 'dietary')}
                  placeholder="Gluten-free, vegan… press Enter to add"
                />
                <Button type="button" variant="secondary" onClick={() => addTag('dietary')}>
                  Add
                </Button>
              </div>
              {form.dietary_restrictions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.dietary_restrictions.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-900 px-2.5 py-0.5 text-xs text-amber-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag('dietary', tag)}
                        className="hover:text-amber-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div className="space-y-1.5">
              <Label>
                Allergies{' '}
                <span className="text-stone-400 font-normal text-xs">(safety-critical)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput.allergy}
                  onChange={(e) => setTagInput((prev) => ({ ...prev, allergy: e.target.value }))}
                  onKeyDown={(e) => handleTagKeyDown(e, 'allergy')}
                  placeholder="Peanuts, shellfish… press Enter to add"
                />
                <Button type="button" variant="secondary" onClick={() => addTag('allergy')}>
                  Add
                </Button>
              </div>
              {form.allergies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.allergies.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-red-900 px-2.5 py-0.5 text-xs text-red-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag('allergy', tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Historical financial data */}
            <div className="pt-2 border-t border-stone-800">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                Service History (for loyalty tiers)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="events">Past Events</Label>
                  <Input
                    id="events"
                    type="number"
                    min="0"
                    value={form.lifetime_events_count}
                    onChange={(e) => set('lifetime_events_count', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="value">Total Spent ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.lifetime_value_dollars}
                    onChange={(e) => set('lifetime_value_dollars', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isPending || !form.full_name.trim()}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isPending ? 'Saving…' : 'Save & Add Another'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client list — right panel (2/5) */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Imported</span>
              <Badge variant="default">{clients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">
                No clients yet — add your first one.
              </p>
            ) : (
              <ul className="divide-y divide-stone-800">
                {clients.map((c) => (
                  <li key={c.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-200">{c.full_name}</span>
                    {(c.total_events_count ?? 0) > 0 && (
                      <span className="text-xs text-stone-400">
                        {c.total_events_count} event{c.total_events_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {clients.length > 0 && (
          <Link href="/onboarding/loyalty">
            <Button variant="primary" className="w-full">
              Continue to Loyalty Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}

        <Link href="/onboarding" className="block">
          <Button variant="ghost" className="w-full text-stone-500">
            ← Back to Setup Overview
          </Button>
        </Link>
      </div>
    </div>
  )
}
