// Event Template Picker
// Shown in create mode on the event form. Loads a template's defaults into the form fields.
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Select } from '@/components/ui/select'
import {
  listEventTemplates,
  recordTemplateUsage,
  type EventTemplate,
} from '@/lib/events/template-actions'

type EventTemplatPickerProps = {
  onApply: (template: EventTemplate) => void
}

export function EventTemplatePicker({ onApply }: EventTemplatPickerProps) {
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    listEventTemplates()
      .then((data) => {
        if (!cancelled) {
          setTemplates(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || templates.length === 0) return null

  return (
    <div className="mb-4">
      <Select
        label="Load from template"
        options={[
          { value: '', label: 'Select a template...' },
          ...templates.map((t) => ({
            value: t.id,
            label: `${t.name}${t.occasion ? ` (${t.occasion})` : ''}`,
          })),
        ]}
        value=""
        onChange={(e) => {
          const selected = templates.find((t) => t.id === e.target.value)
          if (selected) {
            onApply(selected)
            // Track usage (non-blocking)
            startTransition(async () => {
              try {
                await recordTemplateUsage(selected.id)
              } catch {
                // non-blocking
              }
            })
          }
        }}
      />
      <p className="text-xs text-stone-400 mt-1">Pre-fill form fields from a saved template</p>
    </div>
  )
}
