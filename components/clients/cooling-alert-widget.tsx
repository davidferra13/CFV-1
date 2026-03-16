'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CoolingClient } from '@/lib/clients/cooling-alert'

interface CoolingAlertWidgetProps {
  coolingClients: CoolingClient[]
}

export function CoolingAlertWidget({ coolingClients }: CoolingAlertWidgetProps) {
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

                <Link
                  href={`/clients/${client.clientId}?tab=messages`}
                  className="flex-shrink-0 text-xs font-medium text-brand-500 hover:text-brand-400 underline underline-offset-2"
                >
                  {client.suggestedAction}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
