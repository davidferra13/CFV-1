// Public Intake Form Client Component
// Renders interactive form fields, validates, and submits via server action
// No auth required - uses share token

'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { IntakeForm, IntakeFormField, IntakeShare } from '@/lib/clients/intake-types'
import { submitIntakeResponse } from '@/lib/clients/intake-actions'

// Common food allergens for the allergy_picker field type
const COMMON_ALLERGENS = [
  'Peanuts',
  'Tree Nuts',
  'Milk/Dairy',
  'Eggs',
  'Wheat/Gluten',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Mustard',
  'Celery',
  'Lupin',
  'Mollusks',
  'Sulfites',
  'Corn',
  'Coconut',
  'Garlic',
  'Onion',
]

interface Props {
  form: IntakeForm
  share: IntakeShare
  shareToken: string
}

export function IntakeFormClient({ form, share, shareToken }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const field of form.fields) {
      if (field.type === 'checkbox_group' || field.type === 'allergy_picker') {
        initial[field.id] = []
      } else {
        initial[field.id] = ''
      }
    }
    // Pre-fill name/email from share if available
    const nameField = form.fields.find(
      (f) => f.id === 'full_name' || f.label.toLowerCase().includes('name')
    )
    const emailField = form.fields.find(
      (f) => f.id === 'email' || f.label.toLowerCase().includes('email')
    )
    if (nameField && share.client_name) initial[nameField.id] = share.client_name
    if (emailField && share.client_email) initial[emailField.id] = share.client_email
    return initial
  })
  const [otherAllergens, setOtherAllergens] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function setValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    // Clear error on change
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  function toggleCheckbox(fieldId: string, option: string) {
    setValues((prev) => {
      const current = (prev[fieldId] as string[]) || []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [fieldId]: next }
    })
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    for (const field of form.fields) {
      if (!field.required) continue
      const val = values[field.id]
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0)
      ) {
        newErrors[field.id] = `${field.label} is required`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    setSubmitError(null)
    startTransition(async () => {
      try {
        // Merge other allergens into allergy picker values
        const finalValues = { ...values }
        for (const field of form.fields) {
          if (field.type === 'allergy_picker' && otherAllergens.trim()) {
            const extras = otherAllergens
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            finalValues[field.id] = [...((finalValues[field.id] as string[]) || []), ...extras]
          }
        }

        // Extract name/email for the response record
        const nameField = form.fields.find(
          (f) => f.id === 'full_name' || f.label.toLowerCase().includes('name')
        )
        const emailField = form.fields.find(
          (f) => f.id === 'email' || f.label.toLowerCase().includes('email')
        )
        const clientName = nameField ? (finalValues[nameField.id] as string) : undefined
        const clientEmail = emailField ? (finalValues[emailField.id] as string) : undefined

        const result = await submitIntakeResponse(shareToken, finalValues, clientName, clientEmail)

        if (result.success) {
          setSubmitted(true)
        } else {
          setSubmitError(result.error || 'Something went wrong. Please try again.')
        }
      } catch (err) {
        setSubmitError('Something went wrong. Please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Thank you!</h2>
          <p className="text-sm text-stone-500">
            Your responses have been submitted. Your chef will review them shortly.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-6 space-y-6">
        {form.fields.map((field) => (
          <div key={field.id}>
            <FieldRenderer
              field={field}
              value={values[field.id]}
              error={errors[field.id]}
              onChange={(val) => setValue(field.id, val)}
              onToggleCheckbox={(opt) => toggleCheckbox(field.id, opt)}
              otherAllergens={otherAllergens}
              onOtherAllergensChange={setOtherAllergens}
            />
          </div>
        ))}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <Button onClick={handleSubmit} loading={pending} size="lg" className="w-full">
          Submit
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------- Field Renderer ----------

function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onToggleCheckbox,
  otherAllergens,
  onOtherAllergensChange,
}: {
  field: IntakeFormField
  value: unknown
  error?: string
  onChange: (val: unknown) => void
  onToggleCheckbox: (opt: string) => void
  otherAllergens: string
  onOtherAllergensChange: (val: string) => void
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-stone-700 mb-1.5">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )

  const descEl = field.description ? (
    <p className="text-xs text-stone-500 mb-2">{field.description}</p>
  ) : null

  const errorEl = error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null

  switch (field.type) {
    case 'text':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {errorEl}
        </div>
      )

    case 'textarea':
      return (
        <div>
          {labelEl}
          {descEl}
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {errorEl}
        </div>
      )

    case 'number':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input
            type="number"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {errorEl}
        </div>
      )

    case 'date':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errorEl}
        </div>
      )

    case 'select':
      return (
        <div>
          {labelEl}
          {descEl}
          <Select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            options={(field.options || []).map((o) => ({ value: o, label: o }))}
          />
          {errorEl}
        </div>
      )

    case 'radio':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="space-y-2">
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.id}
                  checked={(value as string) === opt}
                  onChange={() => onChange(opt)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {opt}
              </label>
            ))}
          </div>
          {errorEl}
        </div>
      )

    case 'checkbox_group':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={((value as string[]) || []).includes(opt)}
                  onChange={() => onToggleCheckbox(opt)}
                  className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                />
                {opt}
              </label>
            ))}
          </div>
          {errorEl}
        </div>
      )

    case 'allergy_picker':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {COMMON_ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={((value as string[]) || []).includes(allergen)}
                  onChange={() => onToggleCheckbox(allergen)}
                  className="rounded border-stone-300 text-red-600 focus:ring-red-500"
                />
                {allergen}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Input
              label="Other allergies (comma-separated)"
              value={otherAllergens}
              onChange={(e) => onOtherAllergensChange(e.target.value)}
              placeholder="e.g., kiwi, avocado"
            />
          </div>
          {errorEl}
        </div>
      )

    default:
      return null
  }
}
