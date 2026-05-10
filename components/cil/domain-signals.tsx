import type { ProactiveSignal } from '@/lib/cil/types'
import { getSignalsByDomain } from '@/lib/cil/signal-actions'
import { DomainSignalsClient } from './domain-signals-client'

interface DomainSignalsProps {
  domain: ProactiveSignal['domain']
  limit?: number
}

export async function DomainSignals({ domain, limit = 5 }: DomainSignalsProps) {
  const signals = await getSignalsByDomain(domain)
  const limited = signals.slice(0, limit)

  if (limited.length === 0) return null

  return <DomainSignalsClient signals={limited} />
}
