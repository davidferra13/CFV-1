'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { runPreDeletionChecks, type DeletionBlocker } from '@/lib/compliance/pre-deletion-checks'
import { CheckCircle2, XCircle, Loader2 } from '@/components/ui/icons'

type Props = {
  chefId: string
  onCheckComplete: (hasBlockers: boolean) => void
}

export function PreDeletionChecklist({ chefId, onCheckComplete }: Props) {
  const [blockers, setBlockers] = useState<DeletionBlocker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        setIsLoading(true)
        const result = await runPreDeletionChecks(chefId)
        if (!cancelled) {
          setBlockers(result)
          onCheckComplete(result.length > 0)
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
          onCheckComplete(true)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [chefId, onCheckComplete])

  const checks = [
    { type: 'active_events', label: 'No active events' },
    { type: 'outstanding_payments', label: 'No outstanding payments' },
    { type: 'active_retainers', label: 'No active retainers' },
    { type: 'active_subscription', label: 'Subscription cancelled' },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Deletion Checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running checks...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Deletion Checklist</CardTitle>
        </CardHeader>
        <CardContent className="text-red-400 text-sm">Failed to run checks: {error}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-Deletion Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check) => {
          const blocker = blockers.find((b) => b.type === check.type)
          const passed = !blocker

          return (
            <div key={check.type} className="flex items-start gap-3">
              {passed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${passed ? 'text-stone-300' : 'text-red-400'}`}>
                  {check.label}
                </p>
                {blocker && <p className="text-xs text-red-400/80 mt-0.5">{blocker.message}</p>}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
