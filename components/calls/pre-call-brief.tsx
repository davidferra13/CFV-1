'use client'

import { useState } from 'react'
import {
  User,
  Calendar,
  DollarSign,
  Heart,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PreCallBrief } from '@/lib/calls/pre-call-brief-actions'
import { toast } from 'sonner'

type Props = {
  brief: PreCallBrief
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-stone-800 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-3 text-left hover:text-stone-100 transition-colors"
      >
        <Icon className="w-4 h-4 text-stone-400 shrink-0" />
        <span className="text-sm font-medium text-stone-200 flex-1">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-stone-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-500" />
        )}
      </button>
      {open && <div className="pb-3 pl-6">{children}</div>}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-stone-500 shrink-0">{label}:</span>
      <span className="text-stone-300">{value}</span>
    </div>
  )
}

function TagList({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null
  return (
    <div className="py-0.5">
      <span className="text-xs text-stone-500">{label}:</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => (
          <span key={item} className="text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

const TIER_COLORS: Record<string, string> = {
  champion: 'text-yellow-400',
  loyal: 'text-green-400',
  at_risk: 'text-amber-400',
  dormant: 'text-red-400',
  new: 'text-blue-400',
}

const PAYMENT_COLORS: Record<string, string> = {
  excellent: 'text-green-400',
  good: 'text-blue-400',
  fair: 'text-amber-400',
  unknown: 'text-stone-400',
}

export function PreCallBrief({ brief }: Props) {
  function copyToClipboard() {
    const lines: string[] = [
      `Pre-Call Brief: ${brief.contactName}`,
      `Generated: ${new Date(brief.generatedAt).toLocaleString()}`,
      '',
    ]

    if (brief.client) {
      lines.push('== Client Info ==')
      lines.push(`Name: ${brief.client.name}`)
      if (brief.client.email) lines.push(`Email: ${brief.client.email}`)
      if (brief.client.phone) lines.push(`Phone: ${brief.client.phone}`)
      if (brief.client.dietaryRestrictions.length)
        lines.push(`Dietary: ${brief.client.dietaryRestrictions.join(', ')}`)
      if (brief.client.allergies.length)
        lines.push(`Allergies: ${brief.client.allergies.join(', ')}`)
      lines.push('')
    }

    lines.push('== Financial ==')
    lines.push(`Total Spent: ${formatCurrency(brief.financial.totalSpentCents)}`)
    lines.push(`Avg Event Value: ${formatCurrency(brief.financial.averageEventValueCents)}`)
    lines.push(`Payment Behavior: ${brief.financial.paymentBehavior}`)
    if (brief.financial.outstandingBalanceCents > 0)
      lines.push(`Outstanding: ${formatCurrency(brief.financial.outstandingBalanceCents)}`)
    lines.push('')

    lines.push('== Events ==')
    lines.push(`Total Events: ${brief.eventHistory.totalEvents}`)
    lines.push('')

    lines.push('== Open Items ==')
    lines.push(`Pending Quotes: ${brief.openItems.pendingQuotes}`)
    lines.push(`Upcoming Events: ${brief.openItems.upcomingEvents}`)
    lines.push(`Open Inquiries: ${brief.openItems.openInquiries}`)

    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Brief copied to clipboard')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle as="h3">Intelligence Brief</CardTitle>
          <p className="text-xs text-stone-500 mt-0.5">
            Generated {new Date(brief.generatedAt).toLocaleString()}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={copyToClipboard} title="Copy to clipboard">
          <Copy className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-0 pt-0">
        {/* Client Info */}
        {brief.client && (
          <Section title="Client Info" icon={User}>
            <DataRow label="Name" value={brief.client.name} />
            <DataRow label="Email" value={brief.client.email} />
            <DataRow label="Phone" value={brief.client.phone} />
            <DataRow label="Preferred Contact" value={brief.client.preferredContact} />
            <DataRow label="Spice Tolerance" value={brief.client.spiceTolerance} />
            <TagList items={brief.client.dietaryRestrictions} label="Dietary Restrictions" />
            <TagList items={brief.client.allergies} label="Allergies" />
            <TagList items={brief.client.dislikes} label="Dislikes" />
            <TagList items={brief.client.favoriteCuisines} label="Favorite Cuisines" />
            {brief.client.notes && (
              <p className="text-xs text-stone-400 mt-1 italic">{brief.client.notes}</p>
            )}
          </Section>
        )}

        {/* Event History */}
        <Section title={`Event History (${brief.eventHistory.totalEvents})`} icon={Calendar}>
          {brief.eventHistory.events.length === 0 ? (
            <p className="text-xs text-stone-500">No event history</p>
          ) : (
            <div className="space-y-1">
              {brief.eventHistory.events.slice(0, 5).map((event) => (
                <div key={event.id} className="text-xs flex items-center gap-2">
                  <span className="text-stone-400">
                    {event.date
                      ? new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No date'}
                  </span>
                  <span className="text-stone-300">{event.title || event.occasion || 'Event'}</span>
                  {event.guestCount && (
                    <span className="text-stone-500">{event.guestCount} guests</span>
                  )}
                  <span
                    className={`capitalize ${
                      event.status === 'completed'
                        ? 'text-green-400'
                        : event.status === 'cancelled'
                          ? 'text-red-400'
                          : 'text-stone-400'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              ))}
              {brief.eventHistory.totalEvents > 5 && (
                <p className="text-xs text-stone-500">
                  +{brief.eventHistory.totalEvents - 5} more events
                </p>
              )}
            </div>
          )}
        </Section>

        {/* Financial Summary */}
        <Section title="Financial Summary" icon={DollarSign}>
          <DataRow label="Total Spent" value={formatCurrency(brief.financial.totalSpentCents)} />
          <DataRow
            label="Avg Event Value"
            value={formatCurrency(brief.financial.averageEventValueCents)}
          />
          <div className="flex gap-2 text-sm py-0.5">
            <span className="text-stone-500 shrink-0">Payment Behavior:</span>
            <span
              className={`capitalize ${PAYMENT_COLORS[brief.financial.paymentBehavior] || 'text-stone-300'}`}
            >
              {brief.financial.paymentBehavior}
            </span>
          </div>
          {brief.financial.outstandingBalanceCents > 0 && (
            <DataRow
              label="Outstanding"
              value={formatCurrency(brief.financial.outstandingBalanceCents)}
            />
          )}
        </Section>

        {/* Health Score */}
        {brief.healthScore && (
          <Section title="Client Health" icon={Heart} defaultOpen={false}>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-stone-100">{brief.healthScore.score}</span>
              <span className="text-xs text-stone-400">/100</span>
              <span
                className={`text-sm capitalize font-medium ${TIER_COLORS[brief.healthScore.tier] || 'text-stone-300'}`}
              >
                {brief.healthScore.tier.replace(/_/g, ' ')}
              </span>
            </div>
          </Section>
        )}

        {/* Open Items */}
        <Section title="Open Items" icon={FileText} defaultOpen={false}>
          <DataRow label="Pending Quotes" value={String(brief.openItems.pendingQuotes)} />
          <DataRow label="Upcoming Events" value={String(brief.openItems.upcomingEvents)} />
          <DataRow label="Open Inquiries" value={String(brief.openItems.openInquiries)} />
        </Section>

        {/* Last Communication */}
        {brief.lastCommunication && (
          <div className="flex items-center gap-2 pt-3 text-xs text-stone-400">
            <Clock className="w-3 h-3" />
            <span>
              Last communication:{' '}
              {new Date(brief.lastCommunication).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* No client linked message */}
        {!brief.client && (
          <div className="py-4 text-center">
            <p className="text-sm text-stone-400">
              No client linked to this call. Link a client to see their full intelligence brief.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
