// Next Best Action Card — shows the single recommended action for a client
// Displayed on the client detail page under the header.

import Link from 'next/link'
import { ArrowRight, MessageCircle, Calendar, RefreshCw, Gift, Sparkles, Heart } from 'lucide-react'
import type { NextBestAction } from '@/lib/clients/next-best-action'

const ACTION_ICONS: Record<NextBestAction['actionType'], React.ComponentType<{ className?: string }>> = {
  reply_inquiry:    MessageCircle,
  follow_up_quote:  MessageCircle,
  re_engage:        RefreshCw,
  schedule_event:   Calendar,
  request_feedback: Heart,
  send_birthday:    Gift,
  ask_referral:     Sparkles,
  reach_out:        MessageCircle,
  none:             ArrowRight,
}

const URGENCY_STYLES: Record<NextBestAction['urgency'], string> = {
  critical: 'border-red-200 bg-red-50',
  high:     'border-amber-200 bg-amber-50',
  normal:   'border-brand-200 bg-brand-50/40',
  low:      'border-stone-200 bg-stone-50',
}

const URGENCY_ICON_COLOR: Record<NextBestAction['urgency'], string> = {
  critical: 'text-red-500',
  high:     'text-amber-500',
  normal:   'text-brand-500',
  low:      'text-stone-400',
}

interface Props {
  action: NextBestAction
}

export function NextBestActionCard({ action }: Props) {
  const Icon = ACTION_ICONS[action.actionType]
  const containerClass = URGENCY_STYLES[action.urgency]
  const iconClass = URGENCY_ICON_COLOR[action.urgency]

  return (
    <Link
      href={action.href}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-opacity hover:opacity-80 ${containerClass}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900">{action.label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{action.description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-stone-400 shrink-0" />
    </Link>
  )
}
