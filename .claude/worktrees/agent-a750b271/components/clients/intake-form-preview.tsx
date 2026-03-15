// Intake Form Preview - Renders form fields in read-only preview mode
// Also used as the base renderer for the public intake form

'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { IntakeFormField } from '@/lib/clients/intake-types'

interface Props {
  fields: IntakeFormField[]
}

export function IntakeFormPreview({ fields }: Props) {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.id}>
          <FieldPreview field={field} />
        </div>
      ))}
      <p className="text-xs text-stone-400 italic">
        This is a preview. Fields are not interactive.
      </p>
    </div>
  )
}

function FieldPreview({ field }: { field: IntakeFormField }) {
  const labelEl = (
    <label className="block text-sm font-medium text-stone-700 mb-1.5">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )

  const descEl = field.description ? (
    <p className="text-xs text-stone-500 mb-2">{field.description}</p>
  ) : null

  switch (field.type) {
    case 'text':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input placeholder={field.placeholder} disabled />
        </div>
      )
    case 'textarea':
      return (
        <div>
          {labelEl}
          {descEl}
          <Textarea placeholder={field.placeholder} disabled />
        </div>
      )
    case 'number':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input type="number" placeholder={field.placeholder} disabled />
        </div>
      )
    case 'date':
      return (
        <div>
          {labelEl}
          {descEl}
          <Input type="date" disabled />
        </div>
      )
    case 'select':
      return (
        <div>
          {labelEl}
          {descEl}
          <Select options={(field.options || []).map((o) => ({ value: o, label: o }))} disabled />
        </div>
      )
    case 'radio':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="space-y-2">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-stone-700">
                <input type="radio" disabled className="text-brand-600" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
    case 'checkbox_group':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  disabled
                  className="rounded border-stone-300 text-brand-600"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
    case 'allergy_picker':
      return (
        <div>
          {labelEl}
          {descEl}
          <div className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-400">
            Allergy picker will be shown here
          </div>
        </div>
      )
    default:
      return null
  }
}
