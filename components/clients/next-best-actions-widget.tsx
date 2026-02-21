// Next Best Actions Widget — shows top 5 client actions needed on the dashboard

import Link from 'next/link'
import { ArrowRight, MessageCircle, Calendar, RefreshCw, Gift, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NextBestAction } from '@/lib/clients/next-best-action'

const ACTION_ICONS: Partial<Record<NextBestAction['actionType'], React.ComponentType<{ className?: string }>>> = {
  reply_inquiry:    MessageCircle,
  follow_up_quote:  MessageCircle,
  re_engage:        RefreshCw,
  schedule_event:   Calendar,
  send_birthday:    Gift,
  ask_referral:     Sparkles,
  reach_out:        MessageCircle,
}

const URGENCY_DOT: Record<NextBestAction['urgency'], string> = {
  critical: 'bg-red-500',
  high:     'bg-amber-400',
  normal:   'bg-brand-400',
  low:      'bg-stone-300',
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
          <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
            All Clients <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">Next best action per client</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actions.map(action => {
            const Icon = ACTION_ICONS[action.actionType]
            return (
              <li key={action.clientId}>
                <Link
                  href={action.href}
                  className="flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-stone-50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[action.urgency]}`} />
                  {Icon && <Icon className="h-3.5 w-3.5 text-stone-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 truncate">{action.clientName}</p>
                    <p className="text-[11px] text-stone-500 truncate">{action.label}</p>
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
