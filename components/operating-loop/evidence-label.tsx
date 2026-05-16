import React from 'react'

import type { EvidenceLabel as EvidenceLabelValue, LoopState } from '@/lib/operating-loop/types'
import { getEvidenceDisplayMetadata } from '@/lib/operating-loop/evidence-labels'

type EvidenceLabelSize = 'sm' | 'md'

export interface EvidenceLabelProps {
  label: EvidenceLabelValue
  loopState?: LoopState | null
  size?: EvidenceLabelSize
  showDescription?: boolean
  className?: string
}

const TONE_CLASSES: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  muted: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

const SIZE_CLASSES: Record<EvidenceLabelSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

export function EvidenceLabel({
  label,
  loopState = null,
  size = 'sm',
  showDescription = false,
  className,
}: EvidenceLabelProps) {
  const metadata = getEvidenceDisplayMetadata(label, loopState)
  const classNames = [
    'inline-flex max-w-full items-center gap-1 rounded-full border font-medium leading-none',
    TONE_CLASSES[metadata.tone],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      aria-label={metadata.ariaLabel}
      className={classNames}
      data-evidence-label={metadata.label}
      data-evidence-review={metadata.needsReview ? 'true' : 'false'}
      title={metadata.description}
    >
      <span aria-hidden="true">{metadata.shortTitle}</span>
      {showDescription ? (
        <span className="min-w-0 truncate text-current/80">{metadata.shortDescription}</span>
      ) : null}
    </span>
  )
}
