'use client'

// ContextLoader - Dynamic, context-aware loading component.
// Uses the registry for real loading copy and visual treatment without
// inventing determinate percentages when no real progress exists.

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { type LoadingCategory, getLoadingContext } from '@/lib/loading/loading-registry'
import { LoadingBone, LoadingSpinner } from '@/components/ui/loading-state'

// ─── Icons per category (inline SVG to avoid Lucide dependency in loading states) ───

function CategoryIcon({ category, className }: { category: LoadingCategory; className?: string }) {
  const base = cn('shrink-0', className)

  switch (category) {
    case 'ai':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 0 1 1h1a4 4 0 0 1 0 8h-1a1 1 0 0 0-1 1v1a4 4 0 0 1-8 0v-1a1 1 0 0 0-1-1H6a4 4 0 0 1 0-8h1a1 1 0 0 0 1-1V6a4 4 0 0 1 4-4z" />
        </svg>
      )
    case 'financial':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'sync':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )
    case 'upload':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      )
    case 'generation':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'import':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="8 17 12 21 16 17" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
        </svg>
      )
    case 'search':
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    default:
      return null
  }
}

// ─── Thinking Dots Animation ─────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-thinking-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

// ─── Message Rotator Hook ────────────────────────────────────────

function useRotatingMessage(messages: string[], intervalMs = 4500): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [messages, intervalMs])

  return messages[index] ?? 'Loading...'
}

// ─── Main ContextLoader Component ────────────────────────────────

interface ContextLoaderProps {
  /** Loading context ID from the registry */
  contextId: string
  /** Override messages (instead of registry defaults) */
  messages?: string[]
  /** Show elapsed time counter for long operations */
  showElapsed?: boolean
  /** Real progress value (0-100). When omitted, progress stays indeterminate. */
  progress?: number
  /** Signal that operation completed when no real progress value is available. */
  isComplete?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

export function ContextLoader({
  contextId,
  messages: messageOverrides,
  showElapsed = false,
  progress: realProgress,
  isComplete = false,
  size = 'md',
  className,
}: ContextLoaderProps) {
  const ctx = getLoadingContext(contextId)
  const resolvedMessages = messageOverrides ?? ctx?.messages ?? ['Loading...']
  const message = useRotatingMessage(resolvedMessages)
  const category = ctx?.category ?? 'navigation'
  const visual = ctx?.visual ?? 'spinner'
  const progress = realProgress === undefined ? undefined : Math.min(100, Math.max(0, realProgress))
  const displayPercent = progress === undefined ? undefined : Math.round(progress)
  const showProgressTrack = progress !== undefined || visual === 'progress' || isComplete

  const sizeClasses = {
    sm: {
      icon: 'w-4 h-4',
      text: 'text-xs',
      container: 'gap-2 py-4',
      bar: 'w-36',
      spinner: 'sm' as const,
    },
    md: {
      icon: 'w-5 h-5',
      text: 'text-sm',
      container: 'gap-3 py-8',
      bar: 'w-48',
      spinner: 'md' as const,
    },
    lg: {
      icon: 'w-6 h-6',
      text: 'text-base',
      container: 'gap-4 py-12',
      bar: 'w-56',
      spinner: 'lg' as const,
    },
  }

  const s = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.container,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Visual indicator above progress bar */}
      {visual === 'remy' ? (
        <RemyVisual size={size} />
      ) : visual === 'spinner' ? (
        <LoadingSpinner size={s.spinner} className="text-brand-400" />
      ) : visual === 'skeleton' ? (
        <div className="flex w-16 flex-col gap-1.5">
          <LoadingBone tone="dark" className="h-2.5 w-full" />
          <LoadingBone tone="dark" className="h-2.5 w-3/4" />
        </div>
      ) : visual === 'dots' ? (
        <div className="flex items-center">
          <CategoryIcon category={category} className={cn(s.icon, 'text-stone-400')} />
          <ThinkingDots />
        </div>
      ) : visual === 'pulse' ? (
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-brand-400" />
          <div className="loading-pulse-ring absolute inset-0 rounded-full border border-brand-400/35" />
        </div>
      ) : (
        <CategoryIcon category={category} className={cn(s.icon, 'text-brand-400')} />
      )}

      {/* Message text with fade transition */}
      <p
        key={message}
        className={cn(s.text, 'text-stone-400 animate-fade-slide-up font-medium max-w-xs')}
      >
        {message}
      </p>

      {showProgressTrack ? (
        <div className={cn(s.bar, 'max-w-full')}>
          {progress !== undefined ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-700">
                <div
                  className={cn(
                    'h-full rounded-full transition-all ease-out',
                    displayPercent === 100
                      ? 'bg-emerald-500 duration-300'
                      : 'bg-brand-500 duration-150'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xxs tabular-nums text-stone-500">
                {displayPercent === 100 ? 'Complete' : `${displayPercent}%`}
              </p>
            </>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-700">
                <div
                  className={cn(
                    isComplete
                      ? 'h-full w-full rounded-full bg-emerald-500'
                      : 'loading-progress-indeterminate h-full rounded-full bg-brand-500/90'
                  )}
                />
              </div>
              <p className="mt-1 text-xxs text-stone-500">
                {isComplete ? 'Complete' : 'In progress'}
              </p>
            </>
          )}
        </div>
      ) : null}

      {/* Elapsed timer (for long operations) */}
      {showElapsed && <ElapsedDisplay />}
    </div>
  )
}

function ElapsedDisplay() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  if (elapsed < 3) return null
  return <p className="text-xs text-stone-500 tabular-nums">{elapsed}s elapsed</p>
}

// ─── Sub-components ──────────────────────────────────────────────

function RemyVisual({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 40, md: 56, lg: 72 }
  const d = dims[size]

  return (
    <div className="relative">
      <div className="absolute inset-0 -m-3 rounded-full bg-brand-500/8 blur-xl" />
      <Image
        src="/images/remy/remy-idle.png"
        alt=""
        width={d}
        height={d}
        className="relative animate-mascot-bob opacity-90"
        priority
      />
    </div>
  )
}

// ─── Convenience: Inline Loading Pill ────────────────────────────
// For use inside buttons, table cells, small UI slots.

interface InlineLoaderProps {
  contextId: string
  className?: string
}

export function InlineLoader({ contextId, className }: InlineLoaderProps) {
  const ctx = getLoadingContext(contextId)
  const message = ctx?.messages[0] ?? 'Loading...'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <LoadingSpinner size="xs" className="text-current" />
      <span className="text-xs">{message}</span>
    </span>
  )
}
