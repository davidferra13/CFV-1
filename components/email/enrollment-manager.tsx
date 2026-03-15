'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getEnrollments,
  pauseEnrollment,
  cancelEnrollment,
} from '@/lib/email/sequence-actions'

// ============================================
// TYPES
// ============================================

interface Enrollment {
  id: string
  chef_id: string
  sequence_id: string
  client_id: string | null
  inquiry_id: string | null
  current_step: number
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  enrolled_at: string
  next_send_at: string | null
  completed_at: string | null
  email_sequences: { name: string; trigger_type: string } | null
  clients: { full_name: string; email: string } | null
}

interface EnrollmentManagerProps {
  sequenceId?: string
}

const STATUS_BADGES: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  completed: 'info' as any,
  paused: 'warning',
  cancelled: 'error',
}

const STATUS_FILTERS = ['all', 'active', 'completed', 'paused', 'cancelled'] as const

// ============================================
// COMPONENT
// ============================================

export function EnrollmentManager({ sequenceId }: EnrollmentManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadEnrollments()
  }, [sequenceId])

  async function loadEnrollments() {
    try {
      const data = await getEnrollments(sequenceId)
      setEnrollments(data)
      setError(null)
    } catch {
      setError('Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }

  function handlePause(enrollmentId: string) {
    const previousEnrollments = [...enrollments]

    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === enrollmentId
          ? { ...e, status: 'paused' as const, next_send_at: null }
          : e
      )
    )

    startTransition(async () => {
      try {
        await pauseEnrollment(enrollmentId)
        toast.success('Enrollment paused')
      } catch {
        setEnrollments(previousEnrollments)
        toast.error('Failed to pause enrollment')
      }
    })
  }

  function handleCancel(enrollmentId: string) {
    const previousEnrollments = [...enrollments]

    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === enrollmentId
          ? { ...e, status: 'cancelled' as const, next_send_at: null }
          : e
      )
    )

    startTransition(async () => {
      try {
        await cancelEnrollment(enrollmentId)
        toast.success('Enrollment cancelled')
      } catch {
        setEnrollments(previousEnrollments)
        toast.error('Failed to cancel enrollment')
      }
    })
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filtered =
    statusFilter === 'all'
      ? enrollments
      : enrollments.filter((e) => e.status === statusFilter)

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading enrollments...
      </p>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" onClick={loadEnrollments} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Enrollments</h2>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter(s)}
              className="text-xs capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            {enrollments.length === 0
              ? 'No enrollments yet. Enroll clients into sequences to start nurturing.'
              : `No ${statusFilter} enrollments found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((enrollment) => (
            <div
              key={enrollment.id}
              className="rounded-lg border p-4 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {enrollment.clients?.full_name ?? 'Unknown Client'}
                  </span>
                  <Badge variant={STATUS_BADGES[enrollment.status] ?? 'default'}>
                    {enrollment.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    Sequence: {enrollment.email_sequences?.name ?? 'Unknown'}
                  </span>
                  <span>Step {enrollment.current_step}</span>
                  <span>Enrolled: {formatDate(enrollment.enrolled_at)}</span>
                  {enrollment.next_send_at && (
                    <span>
                      Next send: {formatDate(enrollment.next_send_at)}
                    </span>
                  )}
                  {enrollment.completed_at && (
                    <span>
                      Completed: {formatDate(enrollment.completed_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {enrollment.status === 'active' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handlePause(enrollment.id)}
                      disabled={isPending}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleCancel(enrollment.id)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {enrollment.status === 'paused' && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancel(enrollment.id)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
