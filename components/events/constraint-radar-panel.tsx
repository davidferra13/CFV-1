'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { CheckCircle, Clock, DollarSign, Shield } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { detectConstraintCollisions } from '@/lib/events/constraint-collisions'
import type { ConstraintRadarData } from '@/lib/events/constraint-radar-types'

type ConstraintRadarPanelProps = {
  data: ConstraintRadarData
  eventId: string
}

type StatusTone = 'green' | 'yellow' | 'red' | 'gray'

type RadarItem = {
  key: string
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  tone: StatusTone
  primary: string
  secondary: string
  note?: { text: string; className: string }
}

const toneClasses: Record<StatusTone, string> = {
  green: 'bg-emerald-500 ring-emerald-400 text-transparent',
  yellow: 'bg-amber-500 ring-amber-400 text-transparent',
  red: 'bg-red-500 ring-red-400 text-transparent',
  gray: 'bg-stone-500 ring-stone-500 text-transparent',
}

const toneVariants: Record<StatusTone, BadgeProps['variant']> = {
  green: 'success',
  yellow: 'warning',
  red: 'error',
  gray: 'default',
}

function titleize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getDietaryTone(data: ConstraintRadarData['dietary']): StatusTone {
  if (data.complexityLevel === 'no_client' || data.complexityLevel === 'unknown') return 'gray'
  if (data.complexityLevel === 'high' || data.complexityLevel === 'critical') return 'red'
  if (data.criticalConflicts > 0) return 'red'
  if (data.complexityLevel === 'moderate' || data.activeConflicts > 0) return 'yellow'
  return 'green'
}

function getFinancialTone(data: ConstraintRadarData['financial']): StatusTone {
  if (data.budgetStatus === 'unknown' || data.paymentStatus === 'unknown') return 'gray'
  if (data.budgetStatus === 'critical' || data.paymentStatus === 'unpaid') return 'red'
  if (data.budgetStatus === 'warning' || data.paymentStatus === 'partial') return 'yellow'
  return 'green'
}

function getLogisticsTone(data: ConstraintRadarData['logistics']): StatusTone {
  if (data.daysUntilEvent === null) return 'gray'
  if (data.groceryDeadlinePassed || data.daysUntilEvent < 3) return 'red'
  if ((data.daysUntilEvent >= 3 && data.daysUntilEvent <= 7) || !data.hasPrepTimeline) {
    return 'yellow'
  }
  return 'green'
}

function getCompletionTone(data: ConstraintRadarData['completion']): StatusTone {
  if (data.score >= 80) return 'green'
  if (data.score >= 50) return 'yellow'
  return 'red'
}

export function ConstraintRadarPanel({ data, eventId }: ConstraintRadarPanelProps) {
  if (!data) {
    return (
      <Card className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse bg-muted h-20 rounded-lg" />
          ))}
        </div>
      </Card>
    )
  }

  const collisions = detectConstraintCollisions(data)

  const dietaryPrimary =
    data.dietary.complexityLevel === 'no_client'
      ? 'No client'
      : data.dietary.complexityLevel === 'unknown'
        ? 'Unknown'
        : titleize(data.dietary.complexityLevel)

  const foodCost = data.financial.foodCostPct
  const financialPrimary =
    data.financial.budgetStatus === 'unknown'
      ? 'Unknown'
      : `${titleize(data.financial.budgetStatus)}${foodCost !== null ? ` (${Math.round(foodCost)}%)` : ''}`

  const daysUntilEvent = data.logistics.daysUntilEvent
  const prepStartDate = formatDate(data.logistics.prepStartDate)

  const items: RadarItem[] = [
    {
      key: 'dietary',
      label: 'Dietary',
      href: `/events/${eventId}?tab=overview`,
      icon: Shield,
      tone: getDietaryTone(data.dietary),
      primary: dietaryPrimary,
      secondary:
        data.dietary.activeConflicts > 0 ? `${data.dietary.activeConflicts} conflicts` : 'Clear',
      note: data.dietary.unconfirmedAllergies
        ? { text: 'Unconfirmed allergies', className: 'text-amber-400' }
        : undefined,
    },
    {
      key: 'financial',
      label: 'Financial',
      href: `/events/${eventId}?tab=money`,
      icon: DollarSign,
      tone: getFinancialTone(data.financial),
      primary: financialPrimary,
      secondary: `${titleize(data.financial.paymentStatus)} payment`,
    },
    {
      key: 'logistics',
      label: 'Logistics',
      href: `/events/${eventId}?tab=prep`,
      icon: Clock,
      tone: getLogisticsTone(data.logistics),
      primary: daysUntilEvent === null ? 'No date set' : `${daysUntilEvent} days out`,
      secondary: prepStartDate ? `Prep starts ${prepStartDate}` : 'No prep timeline',
      note: data.logistics.groceryDeadlinePassed
        ? { text: 'Grocery deadline passed', className: 'text-red-400' }
        : undefined,
    },
    {
      key: 'completion',
      label: 'Completion',
      href: data.completion.topBlocker?.url ?? `/events/${eventId}`,
      icon: CheckCircle,
      tone: getCompletionTone(data.completion),
      primary: `${data.completion.score}%`,
      secondary:
        data.completion.topBlocker?.label === 'Error loading'
          ? 'Error loading'
          : data.completion.blockingCount > 0
            ? `${data.completion.blockingCount} blockers`
            : 'Ready',
      note: data.completion.topBlocker
        ? { text: data.completion.topBlocker.label, className: 'text-brand-400' }
        : undefined,
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-100">Constraint Radar</h2>
          <p className="text-sm text-stone-400 mt-1">
            Dietary, money, prep, and readiness constraints in one view.
          </p>
        </div>
      </div>
      {collisions.length > 0 && (
        <div className="space-y-2 mb-3">
          {collisions.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-between gap-3 ${
                alert.severity === 'critical'
                  ? 'bg-red-950/60 border border-red-800/60 text-red-300'
                  : 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
              }`}
            >
              <span>
                {alert.severity === 'critical' ? 'Urgent: ' : 'Warning: '}
                {alert.message}
              </span>
              <Link
                href={`/events/${eventId}?tab=${alert.resolveTab}`}
                className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                  alert.severity === 'critical'
                    ? 'text-red-400 hover:text-red-200'
                    : 'text-amber-400 hover:text-amber-200'
                }`}
              >
                Resolve &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className="block rounded-lg border border-stone-700 bg-stone-900/60 p-4 transition-colors hover:border-brand-600 hover:bg-stone-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-stone-300" />
                  <span className="truncate text-sm font-medium text-stone-300">{item.label}</span>
                </div>
                <Badge
                  aria-label={`${item.label} ${item.tone}`}
                  variant={toneVariants[item.tone]}
                  className={`h-2.5 w-2.5 shrink-0 rounded-full p-0 ${toneClasses[item.tone]}`}
                />
              </div>
              <p className="mt-4 truncate text-lg font-semibold text-stone-100">{item.primary}</p>
              <p className="mt-1 truncate text-sm text-stone-400">{item.secondary}</p>
              {item.note && (
                <p className={`mt-2 truncate text-xs font-medium ${item.note.className}`}>
                  {item.note.text}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
