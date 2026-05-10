'use client'

import type { ProactiveSignal } from '@/lib/cil/types'
import { SignalCard } from './signal-card'

interface SignalBannerProps {
  signals: ProactiveSignal[]
  onDismiss: (id: string) => void
  onAct: (signal: ProactiveSignal) => void
}

export function SignalBanner({ signals, onDismiss, onAct }: SignalBannerProps) {
  // Take top 3 by urgency (already sorted from server)
  const topSignals = signals
    .filter((s) => !s.dismissedAt)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3)

  if (topSignals.length === 0) return null

  return (
    <div className="animate-in slide-in-from-top duration-300">
      <div className="grid grid-cols-1 gap-2 overflow-x-auto md:grid-cols-3 md:overflow-x-visible">
        {topSignals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} onDismiss={onDismiss} onAct={onAct} compact />
        ))}
      </div>
    </div>
  )
}
