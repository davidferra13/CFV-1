import type { HTMLAttributes } from 'react'

import {
  formatEvidenceMetadata,
  type EvidenceMetadataInput,
  type EvidenceTone,
} from '@/lib/operating-loop/evidence-labels'
import { cn } from '@/lib/utils/cn'

const TONE_CLASSES: Record<EvidenceTone, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
  danger:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
  muted:
    'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300',
}

export interface OperatingLoopEvidencePillProps
  extends EvidenceMetadataInput, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  compact?: boolean
}

export function OperatingLoopEvidencePill({
  label,
  source,
  sourceKind,
  confidence,
  timestamp,
  href,
  sensitive,
  compact = false,
  className,
  ...props
}: OperatingLoopEvidencePillProps) {
  const evidence = formatEvidenceMetadata({
    label,
    source,
    sourceKind,
    confidence,
    timestamp,
    href,
    sensitive,
  })

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xxs font-medium leading-5',
        TONE_CLASSES[evidence.tone],
        evidence.caution && 'font-semibold',
        className
      )}
      title={evidence.summary}
      aria-label={evidence.summary}
      data-evidence-label={evidence.label}
      data-evidence-fact={evidence.presentAsFact ? 'true' : 'false'}
      data-evidence-caution={evidence.caution ? 'true' : 'false'}
      {...props}
    >
      <span className="truncate">{compact ? evidence.shortTitle : evidence.title}</span>
      {!compact && evidence.confidenceLabel ? (
        <span className="text-current/70">
          {evidence.confidenceLabel.replace(' confidence', '')}
        </span>
      ) : null}
    </span>
  )
}
