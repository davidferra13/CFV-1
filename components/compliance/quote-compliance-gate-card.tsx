import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getQuoteComplianceGateForChef } from '@/lib/compliance/compliance-concierge-actions'

function stateVariant(state: string) {
  if (state === 'clear') return 'success'
  if (state === 'blocked' || state === 'expired-proof') return 'error'
  if (state === 'consult-professional' || state === 'unknown-jurisdiction') return 'warning'
  return 'default'
}

export async function QuoteComplianceGateCard({
  quoteId,
  eventId,
}: {
  quoteId: string
  eventId?: string | null
}) {
  const gate = await getQuoteComplianceGateForChef(quoteId)
  const visibleFactors = gate.blockingFactors.length > 0 ? gate.blockingFactors : gate.warnings

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-stone-100">Compliance Gate</h2>
            <Badge variant={stateVariant(gate.readinessState) as any}>
              {gate.readinessState.replace('-', ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">{gate.message}</p>
        </div>
        {eventId && (
          <Link href={`/events/${eventId}/compliance`}>
            <Button variant="secondary" size="sm">
              Event Packet
            </Button>
          </Link>
        )}
      </div>

      {visibleFactors.length > 0 && (
        <div className="mt-3 grid gap-2">
          {visibleFactors.slice(0, 3).map((factor) => (
            <div
              key={factor.key}
              className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-stone-200">{factor.label}</p>
                <Badge variant={stateVariant(factor.state) as any}>
                  {factor.state.replace('-', ' ')}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-500">{factor.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
