'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SignalBanner } from './signal-banner'
import { dismissSignalAction, actOnSignal } from '@/lib/cil/signal-actions'
import type { ProactiveSignal } from '@/lib/cil/types'

interface Props {
  initialSignals: ProactiveSignal[]
}

export function DailySignalBanner({ initialSignals }: Props) {
  const [signals, setSignals] = useState(initialSignals)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const handleDismiss = useCallback(
    (id: string) => {
      setSignals((prev) => prev.filter((s) => s.id !== id))
      startTransition(async () => {
          try {
          const result = await dismissSignalAction(id)
          if (!result.success) {
            setSignals(initialSignals)
          }
          } catch {
            // Prevent unhandled rejection
          }
      })
    },
    [initialSignals]
  )

  const handleAct = useCallback(
    (signal: ProactiveSignal) => {
      setSignals((prev) => prev.filter((s) => s.id !== signal.id))
      startTransition(async () => {
          try {
          await actOnSignal(signal)
          if (signal.actionType === 'navigate' && signal.actionPayload?.href) {
            router.push(signal.actionPayload.href as string)
          }
          } catch {
            // Prevent unhandled rejection
          }
      })
    },
    [router]
  )

  return <SignalBanner signals={signals} onDismiss={handleDismiss} onAct={handleAct} />
}
