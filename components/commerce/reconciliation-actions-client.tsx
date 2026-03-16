// Reconciliation Detail Actions - review report + resolve flags
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Eye } from '@/components/ui/icons'
import {
  reviewReconciliationReport,
  resolveReconciliationFlag,
} from '@/lib/commerce/reconciliation-actions'

type Flag = {
  type: string
  severity: 'info' | 'warning' | 'error'
  message: string
  status: 'open' | 'resolved' | 'ignored'
  resolvedAt?: string
}

type Props = {
  reportId: string
  reviewed: boolean
  flags: Flag[]
}

export function ReconciliationActions({ reportId, reviewed, flags }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleReview() {
    startTransition(async () => {
      try {
        await reviewReconciliationReport(reportId)
        toast.success('Report marked as reviewed')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to review report')
      }
    })
  }

  function handleResolveFlag(flagIndex: number, resolution: 'resolved' | 'ignored') {
    startTransition(async () => {
      try {
        await resolveReconciliationFlag(reportId, flagIndex, resolution)
        toast.success(`Flag ${resolution}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to resolve flag')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Review button */}
      {!reviewed && (
        <Button variant="primary" onClick={handleReview} disabled={isPending}>
          <Eye className="w-4 h-4 mr-2" />
          Mark as Reviewed
        </Button>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-stone-200 font-medium">Flags ({flags.length})</h3>
            {flags.map((flag, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  flag.severity === 'error'
                    ? 'bg-red-500/10'
                    : flag.severity === 'warning'
                      ? 'bg-amber-500/10'
                      : 'bg-blue-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      flag.status === 'resolved'
                        ? 'success'
                        : flag.status === 'ignored'
                          ? 'default'
                          : flag.severity === 'error'
                            ? 'error'
                            : 'warning'
                    }
                  >
                    {flag.status}
                  </Badge>
                  <span
                    className={`text-sm ${
                      flag.severity === 'error'
                        ? 'text-red-400'
                        : flag.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                    }`}
                  >
                    {flag.message}
                  </span>
                </div>

                {flag.status === 'open' && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => handleResolveFlag(idx, 'resolved')}
                      disabled={isPending}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleResolveFlag(idx, 'ignored')}
                      disabled={isPending}
                      className="text-stone-400"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
