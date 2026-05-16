import type { HTMLAttributes, ReactNode } from 'react'

import { OperatingLoopEvidencePill } from '@/components/operating-loop/evidence-pill'
import {
  formatEvidenceMetadata,
  type EvidenceMetadataInput,
} from '@/lib/operating-loop/evidence-labels'
import { cn } from '@/lib/utils/cn'

export interface OperatingLoopEvidencePopoverProps
  extends EvidenceMetadataInput, Omit<HTMLAttributes<HTMLDetailsElement>, 'children'> {
  trigger?: ReactNode
}

export function OperatingLoopEvidencePopover({
  label,
  source,
  sourceKind,
  confidence,
  timestamp,
  href,
  sensitive,
  trigger,
  className,
  ...props
}: OperatingLoopEvidencePopoverProps) {
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
    <details className={cn('relative inline-block', className)} {...props}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {trigger ?? (
          <OperatingLoopEvidencePill
            label={label}
            source={source}
            sourceKind={sourceKind}
            confidence={confidence}
            timestamp={timestamp}
            href={href}
            sensitive={sensitive}
          />
        )}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-stone-200 bg-white p-3 text-xs shadow-lg dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-900 dark:text-stone-100">{evidence.title}</p>
            <p className="mt-1 text-stone-600 dark:text-stone-400">{evidence.description}</p>
          </div>
          <span className="shrink-0 text-xxs font-medium uppercase text-stone-500">
            {evidence.confidenceBand}
          </span>
        </div>
        <p className="mt-3 rounded border border-stone-200 bg-stone-50 px-2 py-1.5 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
          {evidence.factNotice}
        </p>
        <dl className="mt-3 space-y-2 text-stone-700 dark:text-stone-300">
          <EvidenceDetail label="Source" value={evidence.sourceLabel} fallback="No source shown" />
          <EvidenceDetail
            label="Source kind"
            value={evidence.sourceKind?.replaceAll('_', ' ') ?? null}
            fallback="No source kind"
          />
          <EvidenceDetail
            label="Confidence"
            value={evidence.confidenceLabel}
            fallback="No confidence score"
          />
          <EvidenceDetail label="Updated" value={evidence.timestampLabel} fallback="No timestamp" />
        </dl>
        {evidence.href ? (
          <a
            className="mt-3 inline-flex text-xs font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100"
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
