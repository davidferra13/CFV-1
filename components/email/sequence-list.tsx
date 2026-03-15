'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  getSequences,
  updateSequence,
  deleteSequence,
  type TriggerType,
} from '@/lib/email/sequence-actions'
import { SequenceBuilder } from './sequence-builder'

// ============================================
// TYPES
// ============================================

interface SequenceRow {
  id: string
  chef_id: string
  name: string
  trigger_type: TriggerType
  is_active: boolean
  created_at: string
  email_sequence_steps: { count: number }[]
  email_sequence_enrollments: { count: number }[]
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  post_inquiry: 'After Inquiry',
  post_event: 'After Event',
  post_quote: 'After Quote',
  anniversary: 'Anniversary',
  dormant_30d: 'Dormant 30d',
  dormant_60d: 'Dormant 60d',
  manual: 'Manual',
}

// ============================================
// COMPONENT
// ============================================

export function SequenceList() {
  const [isPending, startTransition] = useTransition()
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadSequences()
  }, [])

  async function loadSequences() {
    try {
      const data = await getSequences()
      setSequences(data)
      setError(null)
    } catch {
      setError('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }

  function handleToggleActive(seq: SequenceRow) {
    const previousSequences = [...sequences]

    setSequences((prev) =>
      prev.map((s) =>
        s.id === seq.id ? { ...s, is_active: !s.is_active } : s
      )
    )

    startTransition(async () => {
      try {
        await updateSequence(seq.id, { is_active: !seq.is_active })
        toast.success(
          `Sequence ${!seq.is_active ? 'activated' : 'paused'}`
        )
      } catch {
        setSequences(previousSequences)
        toast.error('Failed to update sequence')
      }
    })
  }

  function handleDelete(id: string) {
    const previousSequences = [...sequences]

    setSequences((prev) => prev.filter((s) => s.id !== id))

    startTransition(async () => {
      try {
        await deleteSequence(id)
        toast.success('Sequence deleted')
      } catch {
        setSequences(previousSequences)
        toast.error('Failed to delete sequence')
      }
    })
  }

  function getStepCount(seq: SequenceRow): number {
    return seq.email_sequence_steps?.[0]?.count ?? 0
  }

  function getEnrollmentCount(seq: SequenceRow): number {
    return seq.email_sequence_enrollments?.[0]?.count ?? 0
  }

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading sequences...</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" onClick={loadSequences} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  if (showCreate) {
    return (
      <SequenceBuilder
        onSaved={(seq) => {
          setSequences((prev) => [seq, ...prev])
          setShowCreate(false)
          loadSequences()
        }}
        onCancel={() => setShowCreate(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Email Sequences</h2>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          + New Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No sequences yet. Create your first automated email sequence to
            nurture leads.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{seq.name}</h3>
                    <Badge
                      variant={seq.is_active ? 'success' : 'default'}
                    >
                      {seq.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{TRIGGER_LABELS[seq.trigger_type]}</span>
                    <span>{getStepCount(seq)} step{getStepCount(seq) !== 1 ? 's' : ''}</span>
                    <span>{getEnrollmentCount(seq)} enrolled</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={seq.is_active}
                    onCheckedChange={() => handleToggleActive(seq)}
                    disabled={isPending}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setEditingId(seq.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(seq.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
