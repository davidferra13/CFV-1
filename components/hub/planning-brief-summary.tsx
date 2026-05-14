'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Check, X } from '@/components/ui/icons'
import { updatePlanningBrief } from '@/lib/hub/planning-candidate-actions'
import { hasPlanningBriefContent } from '@/lib/hub/planning-brief'
import type { PlanningBrief } from '@/lib/hub/types'

interface PlanningBriefSummaryProps {
  brief: PlanningBrief | null
  groupToken: string
  profileToken: string
  editable?: boolean
  onBriefUpdated?: (brief: PlanningBrief) => void
}

const USE_CASE_LABELS: Record<string, string> = {
  personal: 'Personal',
  friends: 'Friends',
  family: 'Family',
  team: 'Team',
  work: 'Work',
  corporate: 'Corporate',
}

interface BriefField {
  key: keyof PlanningBrief
  label: string
  type: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  suffix?: string
}

const BRIEF_FIELDS: BriefField[] = [
  { key: 'occasion', label: 'Occasion', type: 'text' },
  {
    key: 'useCase',
    label: 'Use Case',
    type: 'select',
    options: Object.entries(USE_CASE_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: 'dateWindow', label: 'Date Window', type: 'text' },
  { key: 'partySize', label: 'Party Size', type: 'number', suffix: 'guests' },
  { key: 'eventStyle', label: 'Event Style', type: 'text' },
  { key: 'budget', label: 'Budget', type: 'text' },
  { key: 'dietarySummary', label: 'Dietary', type: 'text' },
  { key: 'accessibilityNotes', label: 'Accessibility', type: 'text' },
  { key: 'locationSummary', label: 'Location', type: 'text' },
]

export function PlanningBriefSummary({
  brief,
  groupToken,
  profileToken,
  editable = false,
  onBriefUpdated,
}: PlanningBriefSummaryProps) {
  const [localBrief, setLocalBrief] = useState<PlanningBrief>(brief ?? {})
  const [editingField, setEditingField] = useState<keyof PlanningBrief | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const hasContent = hasPlanningBriefContent(localBrief)

  const startEdit = useCallback(
    (field: BriefField) => {
      setEditingField(field.key)
      const current = localBrief[field.key]
      setEditValue(current != null ? String(current) : '')
    },
    [localBrief]
  )

  const cancelEdit = useCallback(() => {
    setEditingField(null)
    setEditValue('')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingField || saving) return
    setSaving(true)

    const field = BRIEF_FIELDS.find((f) => f.key === editingField)
    if (!field) return

    let parsedValue: string | number | undefined
    if (field.type === 'number') {
      const num = parseInt(editValue, 10)
      parsedValue = Number.isFinite(num) && num > 0 ? num : undefined
    } else {
      parsedValue = editValue.trim() || undefined
    }

    const updatedBrief: PlanningBrief = { ...localBrief }
    const fieldKey = editingField as string
    if (parsedValue !== undefined) {
      ;(updatedBrief as Record<string, unknown>)[fieldKey] = parsedValue
    } else {
      delete (updatedBrief as Record<string, unknown>)[fieldKey]
    }

    try {
      const result = await updatePlanningBrief({
        groupToken,
        profileToken,
        planningBrief: updatedBrief,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setLocalBrief(result.planningBrief)
      onBriefUpdated?.(result.planningBrief)
      toast.success('Brief updated')
    } catch (err) {
      toast.error('Could not save changes')
    } finally {
      setSaving(false)
      setEditingField(null)
      setEditValue('')
    }
  }, [editingField, editValue, saving, localBrief, groupToken, profileToken, onBriefUpdated])

  if (!hasContent && !editable) {
    return (
      <div className="rounded-xl border border-[#3a2a20] bg-[#1a1412] px-6 py-8 text-center">
        <p className="text-[#b89b85]">
          Add details to help compare options: occasion, date, guest count, budget
        </p>
      </div>
    )
  }

  const visibleFields = BRIEF_FIELDS.filter((field) => {
    if (editable) return true
    const val = localBrief[field.key]
    return val !== undefined && val !== null && val !== ''
  })

  if (visibleFields.length === 0 && !editable) {
    return (
      <div className="rounded-xl border border-[#3a2a20] bg-[#1a1412] px-6 py-8 text-center">
        <p className="text-[#b89b85]">
          Add details to help compare options: occasion, date, guest count, budget
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#3a2a20] bg-[#1a1412] p-4">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {visibleFields.map((field) => {
          const rawValue = localBrief[field.key]
          const isEditing = editingField === field.key

          return (
            <div key={field.key} className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-wide text-[#7a6a5a]">
                {field.label}
              </span>

              {isEditing ? (
                <div className="mt-1 flex items-center gap-1.5">
                  {field.type === 'select' ? (
                    <select
                      className="rounded border border-[#3a2a20] bg-[#2a1f1a] px-2 py-1 text-sm text-[#e8d5c4] outline-none focus:border-[#e8a96b]"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    >
                      <option value="">None</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      className="w-32 rounded border border-[#3a2a20] bg-[#2a1f1a] px-2 py-1 text-sm text-[#e8d5c4] outline-none focus:border-[#e8a96b]"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      min={field.type === 'number' ? 1 : undefined}
                    />
                  )}
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="rounded p-1 text-[#e8a96b] hover:bg-[#2a1f1a] disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded p-1 text-[#7a6a5a] hover:bg-[#2a1f1a]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-sm text-[#e8d5c4]">
                    {rawValue != null && rawValue !== '' ? (
                      <>
                        {field.key === 'useCase'
                          ? (USE_CASE_LABELS[String(rawValue)] ?? String(rawValue))
                          : String(rawValue)}
                        {field.suffix && rawValue ? ` ${field.suffix}` : ''}
                      </>
                    ) : (
                      <span className="text-[#5a4a3a] italic">Not set</span>
                    )}
                  </span>
                  {editable && (
                    <button
                      onClick={() => startEdit(field)}
                      className="rounded p-0.5 text-[#7a6a5a] transition-colors hover:text-[#e8a96b]"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
