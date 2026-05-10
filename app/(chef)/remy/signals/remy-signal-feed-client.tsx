'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SignalFeed } from '@/components/cil/signal-feed'
import { dismissSignalAction, actOnSignal } from '@/lib/cil/signal-actions'
import type { ProactiveSignal } from '@/lib/cil/types'

interface Props {
  initialSignals: ProactiveSignal[]
}

export function RemySignalFeedClient({ initialSignals }: Props) {
  const [signals, setSignals] = useState(initialSignals)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const handleDismiss = useCallback((id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      await dismissSignalAction(id)
    })
  }, [])

  const handleAct = useCallback(
    (signal: ProactiveSignal) => {
      setSignals((prev) => prev.filter((s) => s.id !== signal.id))
      startTransition(async () => {
        await actOnSignal(signal)
        if (signal.actionType === 'navigate' && signal.actionPayload?.href) {
          router.push(signal.actionPayload.href as string)
        }
      })
    },
    [router]
  )

  return <SignalFeed signals={signals} onDismiss={handleDismiss} onAct={handleAct} />
}
