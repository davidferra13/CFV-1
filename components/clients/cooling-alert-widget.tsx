'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CoolingClient } from '@/lib/clients/cooling-alert'
import { rebookClient } from '@/lib/clients/rebook-actions'

interface CoolingAlertWidgetProps {
  coolingClients: CoolingClient[]
}

export function CoolingAlertWidget({ coolingClients }: CoolingAlertWidgetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rebookingId, setRebookingId] = useState<string | null>(null)

  function handleRebook(clientId: string, clientName: string) {
    setRebookingId(clientId)
    startTransition(async () => {
      try {
        const result = await rebookClient(clientId)
        if (result.success && result.eventId) {
          router.push(`/events/${result.eventId}/edit`)
        } else {
          // If no completed events, fall back to creating a new event for this client
          router.push(`/events/new?client_id=${clientId}`)
        }
      } catch (err) {
        console.error('[CoolingAlertWidget] Rebook failed:', err)
        // Fall back to new event page
        router.push(`/events/new?client_id=${clientId}`)
      } finally {
        setRebookingId(null)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {/* UserMinus icon inline SVG */}
          <svg
            className="h-5 w-5 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Relationship Cooling Alerts
        </CardTitle>
      </CardHeader>

      <CardContent>
        {coolingClients.length === 0 ? (
          <p className="text-sm text-stone-500 py-2">All client relationships are active.</p>
        ) : (
          <ul className="divide-y divide-stone-800">
            {coolingClients.map((client) => (
              <li key={client.clientId} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-stone-100 truncate">{client.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {client.lastEventDate
                      ? `Last event ${client.daysSinceLastEvent} days ago`
                      : 'No events on record'}
                    {client.tier === 'vip' && (
                      <span className="ml-1.5 text-amber-600 font-medium">VIP</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending && rebookingId === client.clientId}
                    onClick={() => handleRebook(client.clientId, client.name)}
                    className="text-xs"
                  >
                    {isPending && rebookingId === client.clientId ? 'Creating...' : 'Rebook'}
                  </Button>
                  <Link
                    href={`/clients/${client.clientId}?tab=messages`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-400 underline underline-offset-2"
                  >
                    {client.suggestedAction}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
