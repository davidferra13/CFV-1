'use client'

// TaskLoader - Context-aware inline loading for buttons and action triggers.
// Replaces the generic `<Loader2 className="animate-spin" /> Loading...` pattern
// with task-specific messages that tell users what's actually happening.
//
// Usage:
//   <Button disabled={isPending}>
//     {isPending ? <TaskLoader contextId="data-save-event" /> : 'Save Event'}
//   </Button>
//
// Or with a direct message:
//   <TaskLoader message="Recording payment..." />

import { cn } from '@/lib/utils'
import { getLoadingContext } from '@/lib/loading/loading-registry'
import { LoadingSpinner } from '@/components/ui/loading-state'

interface TaskLoaderProps {
  /** Loading context ID from the registry */
  contextId?: string
  /** Direct message override (skips registry lookup) */
  message?: string
  /** Icon size in pixels */
  iconSize?: number
  /** Additional CSS classes */
  className?: string
}

export function TaskLoader({
  contextId,
  message: messageOverride,
  iconSize = 14,
  className,
}: TaskLoaderProps) {
  const ctx = contextId ? getLoadingContext(contextId) : undefined
  const text = messageOverride ?? ctx?.messages[0] ?? 'Working...'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <LoadingSpinner
        size={iconSize <= 12 ? 'xs' : iconSize <= 14 ? 'sm' : 'md'}
        className="shrink-0"
      />
      <span>{text}</span>
    </span>
  )
}

// ─── Preset task loaders for the most common operations ─────────
// These eliminate the need to remember context IDs for frequent operations.

export function SavingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Saving ${what}...` : 'Saving...'} />
}

export function DeletingLoader() {
  return <TaskLoader message="Deleting..." />
}

export function SendingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Sending ${what}...` : 'Sending...'} />
}

export function GeneratingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Generating ${what}...` : 'Generating...'} />
}

export function AnalyzingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Analyzing ${what}...` : 'Analyzing...'} />
}

export function UploadingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Uploading ${what}...` : 'Uploading...'} />
}

export function ProcessingLoader({ what }: { what?: string }) {
  return <TaskLoader message={what ? `Processing ${what}...` : 'Processing...'} />
}
