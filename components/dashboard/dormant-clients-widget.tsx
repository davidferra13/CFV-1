// Dormant Clients Widget - clients who haven't booked recently

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface DormantClientEntry {
  clientId: string
  clientName: string
  daysSinceLastEvent: number
  lastEventDate: string | null
  lifetimeValueCents: number
}

interface Props {
  clients: DormantClientEntry[]
}

export function DormantClientsWidget({ clients }: Props) {
  if (clients.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Dormant Clients</CardTitle>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            All Clients <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">Clients with no events in 90+ days</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.clientId}>
              <Link
                href={`/clients/${client.clientId}`}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-stone-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-200 truncate">{client.clientName}</p>
                  <p className="text-xs text-stone-500">
                    {client.daysSinceLastEvent}d since last event
                    {client.lastEventDate
                      ? ` (${new Date(client.lastEventDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs text-stone-500">LTV</p>
                  <p className="text-sm font-medium text-stone-300">
                    {formatCurrency(client.lifetimeValueCents)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
