// Next Best Actions Widget - shows top 5 client actions needed on the dashboard

import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientActionIcon } from '@/components/clients/client-action-icon'
import type { NextBestAction } from '@/lib/clients/next-best-action'

const URGENCY_DOT: Record<NextBestAction['urgency'], string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-400',
  normal: 'bg-brand-400',
  low: 'bg-stone-300',
}

interface Props {
  actions: NextBestAction[]
}

export function NextBestActionsWidget({ actions }: Props) {
  if (actions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Client Actions</CardTitle>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            All Clients <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">Next best action per client</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actions.map((action) => {
            const primaryReason = action.reasons[0]?.message ?? null
            return (
              <li key={action.clientId}>
                <Link
                  href={action.href}
                  className="flex items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-stone-800 transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[action.urgency]}`}
                  />
                  <ClientActionIcon
                    actionType={action.actionType}
                    className="h-3.5 w-3.5 shrink-0 text-stone-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-200 truncate">
                      {action.clientName}
                    </p>
                    <p className="text-xs-tight text-stone-500 truncate">{action.label}</p>
                    {action.interventionLabel ? (
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-stone-400">
                        {action.interventionLabel}
                      </p>
                    ) : null}
                    {primaryReason ? (
                      <p className="mt-0.5 text-[11px] leading-4 text-stone-400 line-clamp-2">
                        {primaryReason}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
