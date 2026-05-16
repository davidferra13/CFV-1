import type { HTMLAttributes, ReactNode } from 'react'

import { EvidencePill } from '@/components/evidence/evidence-pill'
import { formatEvidenceMetadata } from '@/lib/evidence-labels/format'
import type { EvidenceMetadata } from '@/lib/evidence-labels/types'
import { cn } from '@/lib/utils/cn'

export interface EvidencePopoverProps
  extends EvidenceMetadata, Omit<HTMLAttributes<HTMLDetailsElement>, 'children'> {
  trigger?: ReactNode
}

export function EvidencePopover({
  label,
  source,
  confidence,
  timestamp,
  href,
  trigger,
  className,
  ...props
}: EvidencePopoverProps) {
  const evidence = formatEvidenceMetadata({ label, source, confidence, timestamp, href })

  return (
    <details className={cn('relative inline-block', className)} {...props}>
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        {trigger ?? (
          <EvidencePill
            label={label}
            source={source}
            confidence={confidence}
            timestamp={timestamp}
            href={href}
          />
        )}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-stone-200 bg-white p-3 text-xs shadow-lg dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-900 dark:text-stone-100">{evidence.title}</p>
            <p className="mt-1 text-stone-600 dark:text-stone-400">{evidence.description}</p>
          </div>
          <span className="shrink-0 text-[10px] font-medium uppercase text-stone-500">
            {evidence.confidenceBand}
          </span>
        </div>
        <dl className="mt-3 space-y-2 text-stone-700 dark:text-stone-300">
          <EvidenceDetail label="Source" value={evidence.sourceLabel} fallback="No source shown" />
          <EvidenceDetail
            label="Confidence"
            value={evidence.confidenceLabel}
            fallback="No confidence score"
          />
          <EvidenceDetail label="Updated" value={evidence.timestampLabel} fallback="No timestamp" />
        </dl>
        {evidence.href ? (
          <a
            className="mt-3 inline-flex text-xs font-medium text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200"
            href={evidence.href}
          >
            View evidence
          </a>
        ) : null}
      </div>
    </details>
  )
}

function EvidenceDetail({
  label,
  value,
  fallback,
}: {
  label: string
  value: string | null
  fallback: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value ?? fallback}</dd>
    </div>
  )
}
