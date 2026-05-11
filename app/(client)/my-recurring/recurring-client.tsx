'use client'

import { Repeat, Calendar, Users, DollarSign, ChefHat } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ClientRecurringService,
  SERVICE_TYPE_LABELS,
  FREQUENCY_LABELS,
} from '@/lib/recurring/client-recurring-actions'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' },
  paused: { label: 'Paused', color: 'bg-amber-950/50 text-amber-400 border-amber-800/50' },
  ended: { label: 'Ended', color: 'bg-stone-800 text-stone-500 border-stone-700' },
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecurringClient({ services }: { services: ClientRecurringService[] }) {
  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Repeat className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No recurring services.</p>
          <p className="text-stone-500 text-xs mt-1">
            When you set up a recurring meal program with your chef, it will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const active = services.filter((s) => s.status === 'active')
  const other = services.filter((s) => s.status !== 'active')

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}

      {other.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            Past Services
          </h2>
          {other.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ service: s }: { service: ClientRecurringService }) {
  const badge = STATUS_BADGE[s.status] || STATUS_BADGE.ended
  const days = s.dayOfWeek?.map((d: number) => DAY_NAMES[d]).join(', ')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4 text-brand-400" />
            {SERVICE_TYPE_LABELS[s.serviceType] || s.serviceType}
          </CardTitle>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 text-stone-400">
            <Calendar className="w-4 h-4 text-stone-500" />
            <div>
              <p className="text-xs text-stone-500">Frequency</p>
              <p className="text-stone-200">{FREQUENCY_LABELS[s.frequency] || s.frequency}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone-400">
            <DollarSign className="w-4 h-4 text-stone-500" />
            <div>
              <p className="text-xs text-stone-500">Rate</p>
              <p className="text-stone-200">
                {formatCents(s.rateCents)}/{s.frequency === 'monthly' ? 'mo' : 'wk'}
              </p>
            </div>
          </div>

          {s.typicalGuestCount && (
            <div className="flex items-center gap-2 text-stone-400">
              <Users className="w-4 h-4 text-stone-500" />
              <div>
                <p className="text-xs text-stone-500">Guests</p>
                <p className="text-stone-200">{s.typicalGuestCount}</p>
              </div>
            </div>
          )}

          {s.chefName && (
            <div className="flex items-center gap-2 text-stone-400">
              <ChefHat className="w-4 h-4 text-stone-500" />
              <div>
                <p className="text-xs text-stone-500">Chef</p>
                <p className="text-stone-200">{s.chefName}</p>
              </div>
            </div>
          )}
        </div>

        {days && (
          <p className="text-xs text-stone-500 mt-3">
            Days: <span className="text-stone-300">{days}</span>
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
          <span>Started {formatDate(s.startDate)}</span>
          {s.endDate && <span>Ended {formatDate(s.endDate)}</span>}
        </div>

        {s.notes && (
          <p className="text-xs text-stone-400 mt-2 p-2 bg-stone-800/50 rounded">{s.notes}</p>
        )}
      </CardContent>
    </Card>
  )
}
