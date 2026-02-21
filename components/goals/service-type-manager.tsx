'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import type {
  ServiceType,
  CreateServiceTypeInput,
  ServiceTypePricingModel,
} from '@/lib/goals/types'
import {
  computeEffectivePrice,
  formatDollars,
  formatPricingModelLabel,
} from '@/lib/goals/service-mix-utils'
import {
  createServiceType,
  updateServiceType,
  deleteServiceType,
} from '@/lib/goals/service-mix-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ServiceTypeManagerProps {
  serviceTypes: ServiceType[]
  onChanged: () => void
  onGoToCalculator: () => void
}

type FormState = {
  name: string
  description: string
  pricingModel: ServiceTypePricingModel
  basePriceInput: string // dollars as string for the input
  perPersonInput: string // dollars as string
  typicalGuestCount: string
  minGuests: string
  maxGuests: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  pricingModel: 'flat_rate',
  basePriceInput: '',
  perPersonInput: '',
  typicalGuestCount: '2',
  minGuests: '',
  maxGuests: '',
}

function dollarsToInput(cents: number): string {
  return cents > 0 ? String(Math.round(cents / 100)) : ''
}

export function ServiceTypeManager({
  serviceTypes,
  onChanged,
  onGoToCalculator,
}: ServiceTypeManagerProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [savePending, startSave] = useTransition()
  const [deletePending, startDelete] = useTransition()

  function openAddForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(st: ServiceType) {
    setEditingId(st.id)
    setForm({
      name: st.name,
      description: st.description ?? '',
      pricingModel: st.pricingModel,
      basePriceInput: dollarsToInput(st.basePriceCents),
      perPersonInput: dollarsToInput(st.perPersonCents),
      typicalGuestCount: String(st.typicalGuestCount),
      minGuests: st.minGuests != null ? String(st.minGuests) : '',
      maxGuests: st.maxGuests != null ? String(st.maxGuests) : '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Live effective price preview
  const previewBaseCents = Math.round((parseFloat(form.basePriceInput) || 0) * 100)
  const previewPerPersonCents = Math.round((parseFloat(form.perPersonInput) || 0) * 100)
  const previewGuests = parseInt(form.typicalGuestCount) || 2
  const previewEffective = computeEffectivePrice(
    form.pricingModel,
    previewBaseCents,
    previewPerPersonCents,
    previewGuests
  )

  function handleSubmit() {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Service name is required.')
      return
    }
    if (previewEffective === 0) {
      setFormError('Effective price cannot be zero. Set a base price or per-person rate.')
      return
    }

    const input: CreateServiceTypeInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      pricingModel: form.pricingModel,
      basePriceCents: previewBaseCents,
      perPersonCents: previewPerPersonCents,
      typicalGuestCount: previewGuests,
      minGuests: form.minGuests ? parseInt(form.minGuests) : null,
      maxGuests: form.maxGuests ? parseInt(form.maxGuests) : null,
    }

    startSave(async () => {
      try {
        if (editingId) {
          await updateServiceType(editingId, input)
        } else {
          await createServiceType(input)
        }
        closeForm()
        onChanged()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to save.')
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Remove "${name}"? This only affects future planning — it won't change past event data.`
      )
    )
      return
    startDelete(async () => {
      await deleteServiceType(id)
      onChanged()
    })
  }

  const showBase = form.pricingModel === 'flat_rate' || form.pricingModel === 'hybrid'
  const showPerPerson = form.pricingModel === 'per_person' || form.pricingModel === 'hybrid'

  return (
    <div className="space-y-4">
      {/* Existing service types */}
      {serviceTypes.length > 0 && (
        <div className="space-y-2">
          {serviceTypes.map((st) => (
            <Card key={st.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900 text-sm">{st.name}</span>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                        {formatPricingModelLabel(st.pricingModel)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-brand-700">
                        {formatDollars(st.effectivePriceCents)} effective
                      </span>
                      <span className="text-xs text-stone-400">
                        {st.typicalGuestCount} typical guests
                        {st.minGuests || st.maxGuests
                          ? ` · ${st.minGuests ?? 1}–${st.maxGuests ?? '∞'} range`
                          : ''}
                      </span>
                    </div>
                    {st.description && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">{st.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditForm(st)}
                      className="rounded p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                      aria-label={`Edit ${st.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(st.id, st.name)}
                      disabled={deletePending}
                      className="rounded p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      aria-label={`Remove ${st.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {serviceTypes.length === 0 && !formOpen && (
        <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center space-y-2">
          <p className="text-stone-600 font-medium">No service types yet</p>
          <p className="text-sm text-stone-400">
            Add the services you offer — tasting menus, family buffets, per-person dinners, etc. The
            calculator will use these to tell you exactly what to book.
          </p>
        </div>
      )}

      {/* Add form */}
      {formOpen && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <h3 className="font-semibold text-stone-900">
              {editingId ? 'Edit service type' : 'Add service type'}
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Service name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Couples Tasting Menu"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                maxLength={100}
              />
            </div>

            {/* Pricing model */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Pricing model</label>
              <select
                value={form.pricingModel}
                onChange={(e) => set('pricingModel', e.target.value as ServiceTypePricingModel)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="flat_rate">Flat rate — one price regardless of guest count</option>
                <option value="per_person">Per person — price multiplied by guest count</option>
                <option value="hybrid">Hybrid — base fee + per-person component</option>
              </select>
            </div>

            {/* Price fields */}
            <div className="grid grid-cols-2 gap-3">
              {showBase && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    {form.pricingModel === 'flat_rate' ? 'Flat price ($)' : 'Base fee ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.basePriceInput}
                    onChange={(e) => set('basePriceInput', e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
              {showPerPerson && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Per person ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.perPersonInput}
                    onChange={(e) => set('perPersonInput', e.target.value)}
                    placeholder="e.g. 75"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Typical guest count
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.typicalGuestCount}
                  onChange={(e) => set('typicalGuestCount', e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Guest range (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Min guests (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.minGuests}
                  onChange={(e) => set('minGuests', e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Max guests (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxGuests}
                  onChange={(e) => set('maxGuests', e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="e.g. Intimate 12-course tasting experience for couples"
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
            </div>

            {/* Live price preview */}
            <div className="rounded-md bg-stone-50 border border-stone-200 px-3 py-2 text-sm">
              <span className="text-stone-500">Effective price: </span>
              <span className="font-semibold text-stone-900">
                {previewEffective > 0 ? formatDollars(previewEffective) : '—'}
              </span>
              {form.pricingModel !== 'flat_rate' && (
                <span className="text-stone-400 text-xs ml-1">(at {previewGuests} guests)</span>
              )}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSubmit} disabled={savePending}>
                {savePending ? 'Saving…' : editingId ? 'Save changes' : 'Add service type'}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={savePending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={openAddForm} disabled={formOpen || savePending}>
          <Plus className="h-4 w-4 mr-1" />
          Add service type
        </Button>

        {serviceTypes.length > 0 && (
          <button
            onClick={onGoToCalculator}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Build my path
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
