import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createEventCompliancePacketSnapshot,
  getEventCompliancePacket,
} from '@/lib/compliance/compliance-concierge-actions'

function stateVariant(state: string) {
  if (state === 'clear') return 'success'
  if (state === 'blocked' || state === 'expired-proof') return 'error'
  if (state === 'consult-professional' || state === 'unknown-jurisdiction') return 'warning'
  return 'default'
}

export async function EventCompliancePacketCard({
  eventId,
  compact = false,
}: {
  eventId: string
  compact?: boolean
}) {
  const packet = await getEventCompliancePacket(eventId)

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Compliance Packet</CardTitle>
          <Badge variant={stateVariant(packet.readinessState) as any}>
            {packet.readinessState.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-stone-400">{packet.clientSafeSummary}</p>

        {!compact && packet.factors.length > 0 && (
          <div className="grid gap-2">
            {packet.factors.map((factor) => (
              <div
                key={factor.key}
                className="rounded-lg border border-stone-800 bg-stone-950/50 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-stone-100">{factor.label}</p>
                  <Badge variant={stateVariant(factor.state) as any}>
                    {factor.state.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{factor.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {compact && packet.factors.length > 0 && (
          <p className="text-xs text-stone-500">
            {packet.factors.length} compliance factor{packet.factors.length === 1 ? '' : 's'} need
            attention.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${eventId}/compliance`}>
            <Button variant="secondary" size="sm">
              Open Packet
            </Button>
          </Link>
          <form
            action={async () => {
              'use server'
              await createEventCompliancePacketSnapshot(eventId)
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Save Snapshot
            </Button>
          </form>
        </div>

        <p className="text-xs text-stone-600">{packet.disclaimer}</p>
      </CardContent>
    </Card>
  )
}
