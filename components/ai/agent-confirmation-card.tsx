'use client'

import { Check, X, Pencil, AlertTriangle, ShieldX, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AgentActionPreview } from '@/lib/ai/command-types'

interface AgentConfirmationCardProps {
  preview: AgentActionPreview
  taskId: string
  taskType: string
  data: unknown
  onApprove?: (taskId: string, taskType: string, data: unknown) => void
  onReject?: (taskId: string) => void
}

export function AgentConfirmationCard({
  preview,
  taskId,
  taskType,
  data,
  onApprove,
  onReject,
}: AgentConfirmationCardProps) {
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showAllFields, setShowAllFields] = useState(preview.fields.length <= 5)

  const safetyColors = {
    reversible:
      'border-emerald-200 bg-emerald-950/50 dark:border-emerald-800 dark:bg-emerald-950/50',
    significant: 'border-amber-200 bg-amber-950/50 dark:border-amber-800 dark:bg-amber-950/50',
    restricted: 'border-red-200 bg-red-950/50 dark:border-red-800 dark:bg-red-950/50',
  }

  const safetyIcons = {
    reversible: <Check className="h-4 w-4 text-emerald-600" />,
    significant: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    restricted: <ShieldX className="h-4 w-4 text-red-600" />,
  }

  const safetyLabels = {
    reversible: 'Safe action',
    significant: 'Significant change',
    restricted: 'Not available',
  }

  const isRestricted = preview.safety === 'restricted'
  const isBatch = preview.fields.length > 10
  const displayFields = showAllFields
    ? preview.fields
    : isBatch
      ? preview.fields.slice(0, 6)
      : preview.fields.slice(0, 4)

  function handleApprove() {
    if (!onApprove) return
    if (editing && Object.keys(editValues).length > 0) {
      // Merge edited values back into the commit payload
      const updatedData = { ...(data as Record<string, unknown>) }
      for (const [label, value] of Object.entries(editValues)) {
        // Find the original field key from the label
        const key = label.toLowerCase().replace(/\s+/g, '_')
        updatedData[key] = value
      }
      onApprove(taskId, taskType, updatedData)
    } else {
      onApprove(taskId, taskType, data)
    }
  }

  return (
    <div className={`rounded-lg border p-3 text-sm ${safetyColors[preview.safety]}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {safetyIcons[preview.safety]}
        <span className="font-medium text-stone-100 dark:text-stone-100 flex-1">
          {preview.summary}
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {safetyLabels[preview.safety]}
        </span>
      </div>

      {/* Fields */}
      <div
        className={`space-y-1.5 mb-3 ${isBatch && showAllFields ? 'max-h-64 overflow-y-auto pr-1' : ''}`}
      >
        {displayFields.map((field, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="font-medium text-stone-400 dark:text-stone-400 min-w-[90px] shrink-0">
              {field.label}:
            </span>
            {editing && field.editable ? (
              <input
                type="text"
                defaultValue={editValues[field.label] ?? field.value}
                onChange={(e) =>
                  setEditValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                }
                className="flex-1 bg-surface dark:bg-stone-800 border border-stone-600 dark:border-stone-600 rounded px-1.5 py-0.5 text-xs text-stone-100 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              <span className="text-stone-100 dark:text-stone-100 flex-1">
                {field.value}
                {field.editable && !isRestricted && (
                  <span className="text-stone-400 ml-1">(editable)</span>
                )}
              </span>
            )}
          </div>
        ))}

        {!showAllFields && preview.fields.length > (isBatch ? 6 : 4) && (
          <button
            onClick={() => setShowAllFields(true)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 dark:hover:text-stone-300"
          >
            <ChevronDown className="h-3 w-3" />
            Show {preview.fields.length - (isBatch ? 6 : 4)} more fields
          </button>
        )}
        {showAllFields && preview.fields.length > 5 && (
          <button
            onClick={() => setShowAllFields(false)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 dark:hover:text-stone-300"
          >
            <ChevronUp className="h-3 w-3" />
            Show less
          </button>
        )}
      </div>

      {/* Warnings */}
      {preview.warnings && preview.warnings.length > 0 && (
        <div className="mb-3 space-y-1">
          {preview.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {!isRestricted && (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleApprove} className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            {editing ? 'Save & Approve' : isBatch ? 'Approve All' : 'Approve'}
          </Button>

          {!editing && preview.fields.some((f) => f.editable) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}

          {editing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditing(false)
                setEditValues({})
              }}
              className="text-xs"
            >
              Cancel Edit
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReject?.(taskId)}
            className="text-xs text-stone-500 hover:text-red-600"
          >
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        </div>
      )}

      {/* Restricted: just show the dismiss button */}
      {isRestricted && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReject?.(taskId)}
          className="text-xs text-stone-500"
        >
          Got it
        </Button>
      )}
    </div>
  )
}
