'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { updateClass, deleteClass, type CookingClassRow } from '@/lib/classes/class-actions'

type ClassListProps = {
  classes: CookingClassRow[]
}

const STATUS_BADGE_MAP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  published: 'success',
  full: 'warning',
  completed: 'info',
  cancelled: 'error',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ClassList({ classes }: ClassListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function handlePublish(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await updateClass(id, { status: 'published' })
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to publish')
      }
    })
  }

  function handleDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteClass(id)
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  if (classes.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p className="text-lg mb-2">No cooking classes yet</p>
        <p className="text-sm">Create your first class to start accepting registrations.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {classes.map((cls) => {
        const capacityPercent = 0 // Will be filled by parent with capacity data
        return (
          <Card key={cls.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{cls.title}</h3>
                  <Badge variant={STATUS_BADGE_MAP[cls.status] ?? 'default'}>{cls.status}</Badge>
                </div>

                <p className="text-sm text-gray-600 mb-1">{formatDate(cls.class_date)}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>{formatPrice(cls.price_per_person_cents)}/person</span>
                  <span>{cls.duration_minutes} min</span>
                  <span>Capacity: {cls.max_capacity}</span>
                  {cls.skill_level && <span>{cls.skill_level.replace('_', ' ')}</span>}
                  {cls.cuisine_type && <span>{cls.cuisine_type}</span>}
                </div>

                {cls.location && <p className="text-sm text-gray-400 mt-1">{cls.location}</p>}

                {/* Capacity bar */}
                <div className="mt-3 w-full max-w-xs">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/classes/${cls.id}`)}
                  disabled={isPending}
                >
                  View
                </Button>
                {cls.status === 'draft' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handlePublish(cls.id)}
                      disabled={isPending}
                    >
                      Publish
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/classes/${cls.id}/edit`)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDeleteConfirmId(cls.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {cls.status === 'published' && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/classes/${cls.id}/edit`)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
      <ConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete class?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />
    </div>
  )
}
