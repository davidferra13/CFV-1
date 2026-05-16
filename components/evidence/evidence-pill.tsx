import type { HTMLAttributes } from 'react'

import { formatEvidenceMetadata } from '@/lib/evidence-labels/format'
import type { EvidenceMetadata } from '@/lib/evidence-labels/types'
import { cn } from '@/lib/utils/cn'

const TONE_CLASSES = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
  danger:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
  muted:
    'border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-400',
}

export interface EvidencePillProps
  extends EvidenceMetadata, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  compact?: boolean
}

export function EvidencePill({
  label,
  source,
  confidence,
  timestamp,
  href,
  compact = false,
  className,
  ...props
}: EvidencePillProps) {
  const evidence = formatEvidenceMetadata({ label, source, confidence, timestamp, href })

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium leading-5',
        TONE_CLASSES[evidence.tone],
        evidence.caution && 'font-semibold',
        className
      )}
      title={evidence.summary}
      aria-label={evidence.summary}
      data-evidence-label={evidence.label}
      data-evidence-factual={evidence.factual ? 'true' : 'false'}
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
