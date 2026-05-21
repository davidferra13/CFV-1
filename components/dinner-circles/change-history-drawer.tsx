'use client'

import { useState, useTransition } from 'react'
import { getCircleHistory } from '@/lib/dinner-circles/recovery'

interface HistoryEntry {
  id: string
  action_type: string
  actor_role: string
  entity_type: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  reversible: boolean
  reversed_at: string | null
  notes: string | null
  created_at: string
}

interface ChangeHistoryDrawerProps {
  circleId: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_LABELS: Record<string, string> = {
  edit_post: 'Edited a message',
  delete_post: 'Deleted a message',
  change_rsvp: 'Changed RSVP',
  undo_bring_claim: 'Unclaimed bring item',
  cancel_broadcast: 'Cancelled broadcast',
  retract_poll_vote: 'Retracted poll vote',
}

function formatActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ChangeHistoryDrawer({ circleId, isOpen, onClose }: ChangeHistoryDrawerProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Load when opened
  function handleOpen() {
    if (entries !== null) return
    startTransition(async () => {
      try {
        const result = await getCircleHistory({ circleId, limit: 50 })
        setEntries(result.history as HistoryEntry[])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      }
    })
  }

  // Trigger load when drawer opens
  if (isOpen && entries === null && !isPending && !error) {
    handleOpen()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl"
        role="complementary"
        aria-label="Change history"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Change history</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="Close history drawer"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              &times;
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {entries !== null && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          )}

          {entries?.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg border px-4 py-3 space-y-1 ${entry.reversed_at ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{formatActionLabel(entry.action_type)}</p>
                <time
                  className="shrink-0 text-xs text-muted-foreground"
                  dateTime={entry.created_at}
                >
                  {formatDate(entry.created_at)}
                </time>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                  {entry.actor_role.replace(/_/g, ' ')}
                </span>
                {entry.entity_type && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {entry.entity_type.replace(/_/g, ' ')}
                  </span>
                )}
                {entry.reversed_at && (
                  <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                    undone
                  </span>
                )}
              </div>

              {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
