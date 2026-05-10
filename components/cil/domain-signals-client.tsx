'use client'

import { useTransition } from 'react'
import type { ProactiveSignal } from '@/lib/cil/types'
import { dismissSignalAction, actOnSignal } from '@/lib/cil/signal-actions'
import { SignalCard } from './signal-card'

interface DomainSignalsClientProps {
  signals: ProactiveSignal[]
}

export function DomainSignalsClient({ signals }: DomainSignalsClientProps) {
  const [, startTransition] = useTransition()

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissSignalAction(id)
    })
  }

  function handleAct(signal: ProactiveSignal) {
    startTransition(async () => {
      await actOnSignal(signal)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onDismiss={handleDismiss}
          onAct={handleAct}
          compact
        />
      ))}
    </div>
  )
}
