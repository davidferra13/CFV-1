'use client'

import type { ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock3, CloudUpload, Loader2 } from '@/components/ui/icons'
import type { SaveState } from '@/lib/save-state/model'
import { Button } from '@/components/ui/button'
import { StateChangePulse } from '@/components/ui/state-motion'

type SaveStateBadgeProps = {
  state: SaveState
  onRetry?: () => void | Promise<unknown>
  className?: string
}

function formatRelativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return 'just now'
  }
}

function SaveStateFrame({ watch, children }: { watch: string; children: ReactNode }) {
  return (
    <StateChangePulse watch={watch} className="inline-flex" as="div">
      {children}
    </StateChangePulse>
  )
}

export function SaveStateBadge({ state, onRetry, className = '' }: SaveStateBadgeProps) {
  if (state.status === 'SAVING') {
    return (
      <SaveStateFrame watch={state.status}>
        <div
          role="status"
          aria-live="polite"
          aria-label="Save state: saving"
          data-testid="save-state-badge"
          className={`inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-100 px-3 py-1.5 text-xs text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 ${className}`}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Saving...</span>
        </div>
      </SaveStateFrame>
    )
  }

  if (state.status === 'SAVED') {
    return (
      <SaveStateFrame watch={`${state.status}:${state.lastSavedAt}`}>
        <div
          role="status"
          aria-live="polite"
          aria-label={`Save state: saved ${formatRelativeTime(state.lastSavedAt)}`}
          data-testid="save-state-badge"
          className={`inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Saved {formatRelativeTime(state.lastSavedAt)}</span>
        </div>
      </SaveStateFrame>
    )
  }

  if (state.status === 'OFFLINE_QUEUED') {
    return (
      <SaveStateFrame watch={`${state.status}:${state.queuedCount}:${state.lastQueuedAt ?? ''}`}>
        <div
          role="status"
          aria-live="polite"
          aria-label={`Save state: offline queued, ${state.queuedCount} pending`}
          data-testid="save-state-badge"
          className={`inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 ${className}`}
        >
          <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Offline queued ({state.queuedCount})
            {state.lastQueuedAt ? ` - ${formatRelativeTime(state.lastQueuedAt)}` : ''}
          </span>
        </div>
      </SaveStateFrame>
    )
  }

  if (state.status === 'SAVE_FAILED') {
    return (
      <SaveStateFrame watch={`${state.status}:${state.errorMessage}:${state.traceId ?? ''}`}>
        <div
          role="status"
          aria-live="assertive"
          aria-label="Save state: save failed"
          data-testid="save-state-badge"
          className={`inline-flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-100 px-3 py-1.5 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-400 ${className}`}
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Save failed: {state.errorMessage}</span>
          {state.traceId ? <span className="opacity-80">(ref: {state.traceId})</span> : null}
          <span className="text-red-700 dark:text-red-300">
            Local draft is kept on this device.
          </span>
          {onRetry ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void onRetry()}>
              Retry
            </Button>
          ) : null}
        </div>
      </SaveStateFrame>
    )
  }

  return (
    <SaveStateFrame watch={state.status}>
      <div
        role="status"
        aria-live="polite"
        aria-label="Save state: unsaved changes"
        data-testid="save-state-badge"
        className={`inline-flex items-center gap-2 rounded-md border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-stone-300 ${className}`}
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Unsaved changes</span>
      </div>
    </SaveStateFrame>
  )
}
