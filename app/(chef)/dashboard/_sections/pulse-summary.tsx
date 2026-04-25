import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getClientPulse, type ClientPulse, type PulseItem } from '@/lib/clients/pulse-actions'

const urgencyStyles: Record<PulseItem['urgency'], string> = {
  critical: 'border-l-red-500 text-red-600',
  overdue: 'border-l-amber-500 text-amber-600',
  due: 'border-l-blue-500 text-blue-600',
  ok: 'border-l-stone-300 text-stone-400',
}

const urgencyBadge: Record<
  PulseItem['urgency'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  critical: 'error',
  overdue: 'warning',
  due: 'info',
  ok: 'default',
}

function waitingLabel(count: number) {
  return `${count} ${count === 1 ? 'person' : 'people'} waiting on you`
}

function daysLabel(days: number) {
  return `${days} day${days === 1 ? '' : 's'}`
}

function getWorstItem(pulse: ClientPulse) {
  return pulse.items[0]
}

export async function PulseSummary() {
  let pulse: ClientPulse[]

  try {
    pulse = await getClientPulse()
  } catch {
    return null
  }

  if (pulse.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-stone-100">Client Pulse</p>
            <p className="text-xs text-stone-500">No client follow-ups need your attention.</p>
          </div>
          <Badge variant="success">All caught up</Badge>
        </CardContent>
      </Card>
    )
  }

  const visiblePulse = pulse.slice(0, 5)

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-100">{waitingLabel(pulse.length)}</p>
            <p className="text-xs text-stone-500">Most urgent client responses first.</p>
          </div>
          <Button href="/pulse" variant="ghost" size="sm">
            See all
          </Button>
        </div>

        <div className="divide-y divide-stone-800">
          {visiblePulse.map((client) => {
            const item = getWorstItem(client)
            if (!item) return null

            return (
              <a
                key={client.clientId}
                href={item.href}
                className={`flex items-center gap-3 border-l-4 px-3 py-2 transition-colors hover:bg-stone-800/60 ${urgencyStyles[item.urgency]}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-100">
                    {client.clientName}
                  </span>
                  <span className="block truncate text-xs text-stone-500">
                    {item.label}, {daysLabel(item.daysWaiting)} waiting
                  </span>
                </span>
                <Badge
                  variant={urgencyBadge[item.urgency]}
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {item.actionLabel}
                </Badge>
              </a>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
