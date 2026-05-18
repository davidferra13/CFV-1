'use client'

import { AlertTriangle, FileText, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AutonomyActionPreview, ApprovalImpact } from './types'

type ActionPreviewProps = {
  preview: AutonomyActionPreview
  compact?: boolean
}

const impactToneClasses: Record<NonNullable<ApprovalImpact['tone']>, string> = {
  neutral: 'border-stone-700 bg-stone-900/60 text-stone-300',
  positive: 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300',
  warning: 'border-amber-800/70 bg-amber-950/40 text-amber-300',
  danger: 'border-red-800/70 bg-red-950/40 text-red-300',
}

export function ActionPreview({ preview, compact = false }: ActionPreviewProps) {
  const fields = preview.fields ?? []
  const impacts = preview.impacts ?? []
  const warnings = preview.warnings ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md border border-stone-700 bg-stone-900 p-2">
          <ListChecks className="h-4 w-4 text-brand-300" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-100">{preview.summary}</p>
          {preview.description && (
            <p className="mt-1 text-sm leading-5 text-stone-400">{preview.description}</p>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="rounded-lg border border-stone-800 bg-stone-950/50 p-3"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm text-stone-100">{field.value}</dd>
              {(field.before || field.after) && (
                <div className="mt-2 grid gap-1 text-xs text-stone-400">
                  {field.before && <span>Before: {field.before}</span>}
                  {field.after && <span>After: {field.after}</span>}
                </div>
              )}
            </div>
          ))}
        </dl>
      )}

      {impacts.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Action impact">
          {impacts.map((impact) => (
            <span
              key={`${impact.label}-${impact.value}`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                impactToneClasses[impact.tone ?? 'neutral']
              }`}
            >
              <span className="text-stone-400">{impact.label}</span>
              <span>{impact.value}</span>
            </span>
          ))}
        </div>
      )}

      {preview.draftText && !compact && (
        <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-stone-400" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Draft preview
            </p>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-stone-200">
            {preview.draftText}
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2" aria-label="Warnings">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 rounded-lg border border-amber-800/70 bg-amber-950/40 p-3 text-sm text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {compact && preview.draftText && (
        <Badge variant="info" className="gap-1.5">
          <FileText className="h-3 w-3" aria-hidden="true" />
          Draft included
        </Badge>
      )}
    </div>
  )
}
