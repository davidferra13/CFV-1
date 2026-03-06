'use client'

import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock3, CloudUpload, Loader2 } from '@/components/ui/icons'
import type { SaveState } from '@/lib/save-state/model'
import { Button } from '@/components/ui/button'

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

export function SaveStateBadge({ state, onRetry, className = '' }: SaveStateBadgeProps) {
  if (state.status === 'SAVING') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Save state: saving"
        data-testid="save-state-badge"
        className={`inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-950 px-3 py-1.5 text-xs text-blue-700 ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>Saving...</span>
      </div>
    )
  }

  if (state.status === 'SAVED') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Save state: saved ${formatRelativeTime(state.lastSavedAt)}`}
        data-testid="save-state-badge"
        className={`inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-800 ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Saved {formatRelativeTime(state.lastSavedAt)}</span>
      </div>
    )
  }

  if (state.status === 'OFFLINE_QUEUED') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Save state: offline queued, ${state.queuedCount} pending`}
        data-testid="save-state-badge"
        className={`inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-950 px-3 py-1.5 text-xs text-amber-800 ${className}`}
      >
        <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Offline queued ({state.queuedCount})
          {state.lastQueuedAt ? ` - ${formatRelativeTime(state.lastQueuedAt)}` : ''}
        </span>
      </div>
    )
  }

  if (state.status === 'SAVE_FAILED') {
    return (
      <div
        role="status"
        aria-live="assertive"
        aria-label="Save state: save failed"
        data-testid="save-state-badge"
        className={`inline-flex flex-wrap items-center gap-2 rounded-md border border-red-300 bg-red-950 px-3 py-1.5 text-xs text-red-800 ${className}`}
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Save failed: {state.errorMessage}</span>
        {state.traceId ? <span className="opacity-80">(ref: {state.traceId})</span> : null}
        <span className="text-red-700">Local draft is kept on this device.</span>
        {onRetry ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void onRetry()}>
            Retry
          </Button>
        ) : null}
      </div>
    )
  }

  return (
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
  )
}
