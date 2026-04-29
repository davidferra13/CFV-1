// Public Intake Form - Client Component
// Renders dynamic form fields from JSONB config and handles submission.

'use client'

import { useState, useTransition } from 'react'
import { submitIntakeResponse, type IntakeFormField } from '@/lib/clients/intake-actions'

interface IntakeFormPublicProps {
  token: string
  form: {
    id: string
    name: string
    description: string | null
    fields: IntakeFormField[]
  }
  prefillName: string
  prefillEmail: string
  postActionFooter?: React.ReactNode
}

export function IntakeFormPublic({
  token,
  form,
  prefillName,
  prefillEmail,
  postActionFooter,
}: IntakeFormPublicProps) {
  const [clientName, setClientName] = useState(prefillName)
  const [clientEmail, setClientEmail] = useState(prefillEmail)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = (form.fields || []) as IntakeFormField[]

  function updateField(fieldId: string, value: unknown) {
    setResponses((prev) => ({ ...prev, [fieldId]: value }))
  }

  function toggleMultiselect(fieldId: string, option: string) {
    setResponses((prev) => {
      const current = (prev[fieldId] as string[]) || []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [fieldId]: next }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!clientEmail.trim()) {
      setError('Please enter your email.')
      return
    }

    // Check required fields
    for (const field of fields) {
      if (field.required) {
        const val = responses[field.id]
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          setError(`Please fill in: ${field.label}`)
          return
        }
      }
    }

    startTransition(async () => {
      try {
        await submitIntakeResponse(token, responses, clientName.trim(), clientEmail.trim())
        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <div>
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900">Thank You!</h2>
          <p className="mt-2 text-stone-500">
            Your responses have been submitted successfully. Your chef will review them shortly.
          </p>
        </div>
        {postActionFooter}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{form.name}</h1>
        {form.description && <p className="mt-1 text-sm text-stone-500">{form.description}</p>}
      </div>

      {/* Client info */}
      <div className="mb-6 space-y-4 border-b border-stone-200 pb-6">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Dynamic fields */}
      <div className="space-y-5">
        {fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={responses[field.id]}
            onChange={(val) => updateField(field.id, val)}
            onToggleMulti={(opt) => toggleMultiselect(field.id, opt)}
            selectedMulti={(responses[field.id] as string[]) || []}
          />
        ))}
      </div>

      {/* Error */}
      {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Submit */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  )
}

// ============================================
// Field Renderer
// ============================================

function FieldRenderer({
  field,
  value,
  onChange,
  onToggleMulti,
  selectedMulti,
}: {
  field: IntakeFormField
  value: unknown
  onChange: (val: unknown) => void
  onToggleMulti: (opt: string) => void
  selectedMulti: string[]
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-stone-700">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </label>
  )

  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <div>
          {labelEl}
          <input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )

    case 'number':
      return (
        <div>
          {labelEl}
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )

    case 'textarea':
      return (
        <div>
          {labelEl}
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )

    case 'select':
      return (
        <div>
          {labelEl}
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    case 'multiselect':
      return (
        <div>
          {labelEl}
          <div className="mt-2 flex flex-wrap gap-2">
            {(field.options || []).map((opt) => {
              const isSelected = selectedMulti.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggleMulti(opt)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
          />
          <label className="text-sm font-medium text-stone-700">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>
        </div>
      )

    default:
      return null
  }
}
