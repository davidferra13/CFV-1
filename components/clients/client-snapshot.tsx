'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type ClientMemoryRow,
  type ClientMemoryGroup,
  groupClientMemory,
} from '@/lib/clients/client-memory-types'
import {
  upsertClientMemory,
  deleteClientMemory,
  togglePinClientMemory,
} from '@/lib/clients/client-memory-actions'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ClientSnapshotProps = {
  clientId: string
  clientName: string
  memories: ClientMemoryRow[]
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}

function keyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function confidenceOpacity(confidence: number): string {
  if (confidence >= 80) return 'opacity-100'
  if (confidence >= 50) return 'opacity-70'
  return 'opacity-40'
}

const GROUP_LABELS: Record<keyof ClientMemoryGroup, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'text-red-400' },
  behavior: { label: 'Behavior', color: 'text-blue-400' },
  history: { label: 'History', color: 'text-amber-400' },
  context: { label: 'Context', color: 'text-stone-400' },
}

// ---------------------------------------------------------------------------
// Memory Row
// ---------------------------------------------------------------------------

function MemoryItem({
  mem,
  clientId,
  onDelete,
}: {
  mem: ClientMemoryRow
  clientId: string
  onDelete: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handlePin() {
    startTransition(async () => {
      try {
        await togglePinClientMemory({ id: mem.id, client_id: clientId, pinned: !mem.pinned })
      } catch {
        toast.error('Failed to toggle pin')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteClientMemory({ id: mem.id, client_id: clientId })
        onDelete(mem.id)
      } catch {
        toast.error('Failed to delete memory')
      }
    })
  }

  return (
    <div
      className={`flex items-start justify-between gap-2 py-1.5 ${confidenceOpacity(mem.confidence)} ${isPending ? 'opacity-50' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-stone-400">{keyLabel(mem.key)}: </span>
        <span className="text-sm text-stone-200">{formatValue(mem.value)}</span>
        {mem.pinned && (
          <span className="ml-1 text-xs text-amber-500" title="Pinned">
            *
          </span>
        )}
        {mem.confidence < 80 && (
          <span className="ml-1 text-xs text-stone-600">({mem.confidence}%)</span>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={handlePin}
          className="text-xs text-stone-500 hover:text-amber-400 transition-colors"
          title={mem.pinned ? 'Unpin' : 'Pin'}
        >
          {mem.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-stone-500 hover:text-red-400 transition-colors"
          title="Remove"
        >
          x
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Memory Group
// ---------------------------------------------------------------------------

function MemoryGroupSection({
  groupKey,
  items,
  clientId,
  onDelete,
}: {
  groupKey: keyof ClientMemoryGroup
  items: ClientMemoryRow[]
  clientId: string
  onDelete: (id: string) => void
}) {
  if (items.length === 0) return null
  const { label, color } = GROUP_LABELS[groupKey]

  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${color}`}>{label}</h4>
      <div className="space-y-0.5">
        {items.map((mem) => (
          <MemoryItem key={mem.id} mem={mem} clientId={clientId} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Memory Form (inline)
// ---------------------------------------------------------------------------

function AddMemoryForm({ clientId, onAdded }: { clientId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim() || !value.trim()) return

    startTransition(async () => {
      try {
        await upsertClientMemory({
          client_id: clientId,
          key: key.trim().toLowerCase().replace(/\s+/g, '_'),
          value: value.trim(),
          source: 'manual',
          confidence: 100,
        })
        setKey('')
        setValue('')
        setOpen(false)
        onAdded()
      } catch {
        toast.error('Failed to save memory')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        + Add memory
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Key (e.g. allergy)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200 placeholder:text-stone-600"
        />
      </div>
      <div className="flex-1">
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200 placeholder:text-stone-600"
        />
      </div>
      <Button type="submit" variant="ghost" className="text-xs h-7 px-2" disabled={isPending}>
        Save
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-stone-500 hover:text-stone-300"
      >
        Cancel
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ClientSnapshot({
  clientId,
  clientName,
  memories: initialMemories,
}: ClientSnapshotProps) {
  const [memories, setMemories] = useState(initialMemories)
  const grouped = groupClientMemory(memories)

  const hasAny =
    grouped.critical.length > 0 ||
    grouped.behavior.length > 0 ||
    grouped.history.length > 0 ||
    grouped.context.length > 0

  function handleDelete(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  function handleAdded() {
    // Server action already revalidated the tag; Next.js will refetch on next navigation.
    // For immediate feedback, we just close the form. The data shows on refresh.
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-200">Client Snapshot</h3>
        {hasAny && (
          <Badge variant="info" className="text-xs">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </Badge>
        )}
      </div>

      {hasAny ? (
        <div className="space-y-3">
          {(['critical', 'behavior', 'history', 'context'] as const).map((gk) => (
            <MemoryGroupSection
              key={gk}
              groupKey={gk}
              items={grouped[gk]}
              clientId={clientId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-500">
          No memories recorded for {clientName} yet. Memories are automatically extracted from
          events, or you can add them manually.
        </p>
      )}

      <div className="mt-3 pt-2 border-t border-stone-800">
        <AddMemoryForm clientId={clientId} onAdded={handleAdded} />
      </div>
    </Card>
  )
}
