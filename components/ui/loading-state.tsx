'use client'

import { type LoadingVisual, getLoadingContext } from '@/lib/loading/loading-registry'
import { cn } from '@/lib/utils'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
type BoneTone = 'dark' | 'light' | 'muted'

const spinnerSizes: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[2.5px]',
  lg: 'h-8 w-8 border-[3px]',
}

const boneTones: Record<BoneTone, string> = {
  dark: 'loading-bone-dark',
  light: 'loading-bone-light',
  muted: 'loading-bone-muted',
}

function LoadingGlyph({
  visual,
  size = 'md',
}: {
  visual: LoadingVisual
  size?: Exclude<SpinnerSize, 'xs'>
}) {
  if (visual === 'skeleton') {
    return (
      <div className="flex w-20 flex-col gap-2">
        <LoadingBone tone="dark" className="h-2.5 w-full" />
        <LoadingBone tone="dark" className="h-2.5 w-3/4" />
      </div>
    )
  }

  if (visual === 'pulse') {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center" aria-hidden="true">
        <span className="loading-pulse-ring absolute inset-0 rounded-full border border-brand-400/35" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
      </span>
    )
  }

  return <LoadingSpinner size={size} className="text-brand-400" />
}

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'loading-spinner inline-block shrink-0 rounded-full border-current border-r-transparent border-b-transparent',
        spinnerSizes[size],
        className
      )}
    />
  )
}

export function LoadingBone({ className, tone = 'dark' }: { className?: string; tone?: BoneTone }) {
  return (
    <div aria-hidden="true" className={cn('loading-bone rounded', boneTones[tone], className)} />
  )
}

export function CenteredLoadingState({
  contextId,
  message,
  className,
  minHeightClassName = 'min-h-[50vh]',
}: {
  contextId?: string
  message?: string
  className?: string
  minHeightClassName?: string
}) {
  const ctx = contextId ? getLoadingContext(contextId) : undefined
  const resolvedMessage = message ?? ctx?.messages[0] ?? 'Loading...'
  const visual = ctx?.visual ?? 'spinner'

  return (
    <div
      className={cn('flex items-center justify-center px-4', minHeightClassName, className)}
      role="status"
      aria-live="polite"
      aria-label={resolvedMessage}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-stone-800/80 bg-stone-950/80 px-6 py-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/15 bg-brand-500/8">
          <LoadingGlyph visual={visual} size="lg" />
        </div>
        {ctx?.name ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            {ctx.name}
          </p>
        ) : null}
        <p className="max-w-xs text-sm font-medium text-stone-200">{resolvedMessage}</p>
      </div>
    </div>
  )
}
