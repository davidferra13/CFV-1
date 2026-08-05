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
        try {
        await dismissSignalAction(id)
        } catch {
          // Prevent unhandled rejection
        }
    })
  }

  function handleAct(signal: ProactiveSignal) {
    startTransition(async () => {
        try {
        await actOnSignal(signal)
        } catch {
          // Prevent unhandled rejection
        }
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
