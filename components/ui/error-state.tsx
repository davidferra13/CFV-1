'use client'

// ErrorState - Context-aware error display.
// The paired companion to ContextLoader. When loading fails, this shows
// a specific, actionable error message instead of generic "Something went wrong."
//
// Directly supports Zero Hallucination Law 2: "Never hide failure as zero."
// If data fails to load, show an error state, not zeros or empty arrays.
//
// Usage:
//   <ErrorState contextId="nav-finance" onRetry={() => router.refresh()} />
//
// Or with a direct message:
//   <ErrorState
//     title="Could not load revenue"
//     description="Ledger data is unavailable."
//     onRetry={refetch}
//   />

import { cn } from '@/lib/utils'
import { getErrorForContext, getLoadingContext } from '@/lib/loading/loading-registry'

interface ErrorStateProps {
  /** Loading context ID for automatic error message lookup */
  contextId?: string
  /** Direct title override (skips registry lookup) */
  title?: string
  /** Direct description override */
  description?: string
  /** Retry callback. When provided, shows a retry button. */
  onRetry?: () => void
  /** Retry button label */
  retryLabel?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export function ErrorState({
  contextId,
  title: titleOverride,
  description: descOverride,
  onRetry,
  retryLabel = 'Try again',
  size = 'md',
  className,
}: ErrorStateProps) {
  const contextError = contextId ? getErrorForContext(contextId) : null
  const ctx = contextId ? getLoadingContext(contextId) : null

  const title = titleOverride ?? contextError?.title ?? 'Something went wrong'
  const description = descOverride ?? contextError?.description ?? 'An unexpected error occurred.'

  // AI errors get an Ollama hint
  const isAiError = ctx?.category === 'ai'

  const sizeClasses = {
    sm: { container: 'py-4 gap-2', title: 'text-sm', desc: 'text-xs', icon: 'w-8 h-8' },
    md: { container: 'py-8 gap-3', title: 'text-base', desc: 'text-sm', icon: 'w-10 h-10' },
    lg: { container: 'py-12 gap-4', title: 'text-lg', desc: 'text-sm', icon: 'w-12 h-12' },
  }
  const s = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.container,
        className
      )}
      role="alert"
    >
      {/* Error icon */}
      <div className={cn(s.icon, 'text-red-400/80')}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* Title */}
      <h3 className={cn(s.title, 'font-semibold text-stone-200')}>{title}</h3>

      {/* Description */}
      <p className={cn(s.desc, 'text-stone-400 max-w-sm')}>{description}</p>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 px-4 py-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
        >
          {retryLabel}
        </button>
      )}

      {/* Ollama hint for AI errors */}
      {isAiError && (
        <p className="text-xs text-stone-500 mt-1">Make sure Ollama is running on your machine.</p>
      )}
    </div>
  )
}

// ─── Inline Error (for table cells, badges, small UI slots) ─────

interface InlineErrorProps {
  contextId?: string
  message?: string
  className?: string
}

export function InlineError({ contextId, message, className }: InlineErrorProps) {
  const contextError = contextId ? getErrorForContext(contextId) : null
  const text = message ?? contextError?.title ?? 'Error'

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-red-400', className)}>
      <svg
        className="w-3.5 h-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-xs">{text}</span>
    </span>
  )
}

// ─── DataGuard: wraps a data fetch result, renders ErrorState on failure ─
// Prevents the Zero Hallucination pattern of showing $0 when data fails.
//
// Usage:
//   <DataGuard data={revenue} contextId="nav-finance" onRetry={refetch}>
//     {(data) => <RevenueChart data={data} />}
//   </DataGuard>

interface DataGuardProps<T> {
  /** The data that was fetched (null/undefined = failure) */
  data: T | null | undefined
  /** Whether the fetch is still in progress */
  loading?: boolean
  /** Loading context ID for both loader and error messages */
  contextId: string
  /** Retry callback */
  onRetry?: () => void
  /** Render function when data is available */
  children: (data: T) => React.ReactNode
  /** What to show while loading (defaults to ContextLoader) */
  loadingFallback?: React.ReactNode
  /** Error state size */
  errorSize?: 'sm' | 'md' | 'lg'
}

export function DataGuard<T>({
  data,
  loading,
  contextId,
  onRetry,
  children,
  loadingFallback,
  errorSize = 'md',
}: DataGuardProps<T>) {
  // Still loading
  if (loading) {
    return loadingFallback ?? null
  }

  // Data failed to load
  if (data === null || data === undefined) {
    return <ErrorState contextId={contextId} onRetry={onRetry} size={errorSize} />
  }

  // Data loaded successfully
  return <>{children(data)}</>
}
