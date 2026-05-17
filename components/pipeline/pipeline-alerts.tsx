'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertTriangle, Flame } from '@/components/ui/icons'
import type { PipelineAlert } from './pipeline-types'

type AlertGroup = {
  type: PipelineAlert['type']
  label: string
  icon: React.ReactNode
  themeClass: string
  items: PipelineAlert[]
}

const alertConfig: Record<
  PipelineAlert['type'],
  { label: string; icon: React.ReactNode; themeClass: string }
> = {
  stale_lead: {
    label: 'Stale Inquiries',
    icon: <Clock size={18} className="text-amber-400" />,
    themeClass: 'border-amber-600/30',
  },
  expiring_contract: {
    label: 'Expiring Contracts',
    icon: <AlertTriangle size={18} className="text-red-400" />,
    themeClass: 'border-red-600/30',
  },
  hot_lead: {
    label: 'Hot Inquiries',
    icon: <Flame size={18} className="text-orange-400" />,
    themeClass: 'border-orange-600/30',
  },
}

function groupAlerts(alerts: PipelineAlert[]): AlertGroup[] {
  const groups: Partial<Record<PipelineAlert['type'], PipelineAlert[]>> = {}

  for (const alert of alerts) {
    if (!groups[alert.type]) {
      groups[alert.type] = []
    }
    groups[alert.type]!.push(alert)
  }

  // Order: hot_lead first, then stale_lead, then expiring_contract
  const order: PipelineAlert['type'][] = ['hot_lead', 'stale_lead', 'expiring_contract']

  return order
    .filter((type) => groups[type] && groups[type]!.length > 0)
    .map((type) => ({
      type,
      ...alertConfig[type],
      items: groups[type]!.slice(0, 5),
    }))
}

interface PipelineAlertsProps {
  alerts: PipelineAlert[]
}

export function PipelineAlerts({ alerts }: PipelineAlertsProps) {
  if (!alerts || alerts.length === 0) return null

  const groups = groupAlerts(alerts)
  if (groups.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.type} className={group.themeClass}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {group.icon}
              <CardTitle as="h3" className="text-base">
                {group.label}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {group.items.map((alert) => (
                <li key={alert.itemId}>
                  <Link
                    href={alert.href}
                    className="text-sm text-stone-300 hover:text-brand-400 transition-colors block truncate"
                  >
                    {alert.message}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
