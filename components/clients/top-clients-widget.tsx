'use client'

// Top Clients by Revenue Widget - Dashboard widget showing highest-value clients.
// Displays top 10 clients ranked by total revenue with tier badges.

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { TIER_CONFIG } from '@/lib/clients/lifetime-value-constants'
import type { TopClientByRevenue } from '@/lib/clients/lifetime-value-actions'

interface Props {
  clients: TopClientByRevenue[]
}

export function TopClientsWidget({ clients }: Props) {
  if (clients.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Top Clients by Revenue</CardTitle>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            All Clients <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-xs text-stone-500">
                <th className="text-left pb-2 font-medium">Client</th>
                <th className="text-right pb-2 font-medium">Revenue</th>
                <th className="text-right pb-2 font-medium hidden sm:table-cell">Events</th>
                <th className="text-right pb-2 font-medium hidden md:table-cell">Last Event</th>
                <th className="text-right pb-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50">
              {clients.map((client) => {
                const tierInfo = TIER_CONFIG[client.tier]
                return (
                  <tr key={client.clientId} className="hover:bg-stone-800/50 transition-colors">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/clients/${client.clientId}`}
                        className="text-stone-200 hover:text-brand-400 font-medium truncate block max-w-[160px]"
                      >
                        {client.clientName}
                      </Link>
                    </td>
                    <td className="py-2 text-right text-stone-200 font-medium">
                      {formatCurrency(client.totalRevenueCents)}
                    </td>
                    <td className="py-2 text-right text-stone-400 hidden sm:table-cell">
                      {client.totalEventCount}
                    </td>
                    <td className="py-2 text-right text-stone-500 text-xs hidden md:table-cell">
                      {client.lastEventDate
                        ? new Date(client.lastEventDate + 'T12:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierInfo.color}`}
                      >
                        {tierInfo.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
