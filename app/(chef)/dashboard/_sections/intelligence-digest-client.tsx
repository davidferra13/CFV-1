'use client'

// Intelligence Digest Client wrapper for dashboard
// Wires dismiss/act actions to the IntelligenceDigest component.

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IntelligenceDigest } from '@/components/intelligence/intelligence-digest'
import {
  dismissIntelligenceSignal,
  executeSignalAction,
} from '@/lib/intelligence/signal-actions-wired'
import type { SignalDigest } from '@/lib/intelligence/signal-actions-wired'
import type { ProactiveSignal } from '@/lib/cil/types'

interface Props {
  digest: SignalDigest
}

export function IntelligenceDigestClient({ digest }: Props) {
  const [topSignals, setTopSignals] = useState(digest.topSignals)
  const [totalCount, setTotalCount] = useState(digest.totalCount)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const handleDismiss = useCallback((id: string) => {
    setTopSignals((prev) => prev.filter((s) => s.signal.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
    startTransition(async () => {
      try {
        await dismissIntelligenceSignal(id)
      } catch {
        // Non-blocking
      }
    })
  }, [])

  const handleAct = useCallback(
    (signal: ProactiveSignal) => {
      setTopSignals((prev) => prev.filter((s) => s.signal.id !== signal.id))
      setTotalCount((prev) => Math.max(0, prev - 1))
      startTransition(async () => {
        try {
          await executeSignalAction(signal)
          if (signal.actionType === 'navigate' && signal.actionPayload?.href) {
            router.push(signal.actionPayload.href as string)
          }
        } catch {
          // Non-blocking
        }
      })
    },
    [router]
  )

  return (
    <IntelligenceDigest
      totalCount={totalCount}
      categoryCounts={digest.categoryCounts}
      topSignals={topSignals}
      periodLabel={digest.periodLabel}
      onDismiss={handleDismiss}
      onAct={handleAct}
    />
  )
}
