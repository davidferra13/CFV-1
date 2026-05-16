// Event Countdown for Client Portal
// Shows days until event with stage-appropriate content at each interval.
// Matches cadence messages so the portal and emails stay in sync.
'use client'

import { Calendar, Clock, ChefHat, ShoppingCart, CheckCircle } from '@/components/ui/icons'

interface EventCountdownProps {
  eventDate: string
  occasion: string
  chefName: string
  guestCount: number | null
  location: string | null
  arrivalTime: string | null
  menuName: string | null
  menuLocked: boolean
  prepTimeline: string | null
}

type CountdownStage =
  | 'far_out'
  | '30_days'
  | '14_days'
  | '7_days'
  | '3_days'
  | '1_day'
  | 'event_day'
  | 'past'

function getStage(daysUntil: number): CountdownStage {
  if (daysUntil < 0) return 'past'
  if (daysUntil === 0) return 'event_day'
  if (daysUntil <= 1) return '1_day'
  if (daysUntil <= 3) return '3_days'
  if (daysUntil <= 7) return '7_days'
  if (daysUntil <= 14) return '14_days'
  if (daysUntil <= 30) return '30_days'
  return 'far_out'
}

function getStageMessage(stage: CountdownStage, chefName: string, occasion: string): string {
  switch (stage) {
    case 'far_out':
      return `${chefName} will begin planning closer to the date. Sit back and relax.`
    case '30_days':
      return `${chefName} is beginning menu preparation. If you have dietary updates, now is a great time to share them.`
    case '14_days':
      return `Two weeks out. Your menu is coming together. Confirm your guest count if anything has changed.`
    case '7_days':
      return `${chefName} is sourcing ingredients this week. Your final menu is ready for review.`
    case '3_days':
      return `${chefName} begins prep soon. Everything is on track for your ${occasion}.`
    case '1_day':
      return `Tomorrow is the day! Everything is set for your ${occasion}.`
    case 'event_day':
      return `Today! ${chefName} is preparing for your ${occasion}. Enjoy your evening.`
    case 'past':
      return 'This event has passed. We hope it was wonderful!'
    default:
      return ''
  }
}

function getStageIcon(stage: CountdownStage) {
  switch (stage) {
    case 'far_out':
    case '30_days':
      return <Calendar className="h-5 w-5 text-blue-400" />
    case '14_days':
      return <Clock className="h-5 w-5 text-amber-400" />
    case '7_days':
      return <ShoppingCart className="h-5 w-5 text-green-400" />
    case '3_days':
    case '1_day':
      return <ChefHat className="h-5 w-5 text-purple-400" />
    case 'event_day':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    default:
      return <Calendar className="h-5 w-5 text-muted-foreground" />
  }
}

export function EventCountdown({
  eventDate,
  occasion,
  chefName,
  guestCount,
  location,
  arrivalTime,
  menuName,
  menuLocked,
  prepTimeline,
}: EventCountdownProps) {
  const eventDt = new Date(eventDate)
  const now = new Date()
  const diffMs = eventDt.getTime() - now.getTime()
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const stage = getStage(daysUntil)

  if (stage === 'past') return null

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5 space-y-4">
      {/* Countdown header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStageIcon(stage)}
          <h3 className="text-sm font-medium text-stone-200">
            {stage === 'event_day'
              ? 'Today!'
              : `${daysUntil} day${daysUntil === 1 ? '' : 's'} until your ${occasion}`}
          </h3>
        </div>
        <span className="text-xs text-stone-500">
          {eventDt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Stage message */}
      <p className="text-sm text-stone-400 leading-relaxed">
        {getStageMessage(stage, chefName, occasion)}
      </p>

      {/* Contextual details based on stage */}
      {(stage === '7_days' || stage === '3_days' || stage === '1_day' || stage === 'event_day') && (
        <div className="border-t border-stone-800 pt-3 space-y-2">
          {menuName && (
            <DetailRow label="Menu" value={`${menuName}${menuLocked ? ' (finalized)' : ''}`} />
          )}
          {guestCount && <DetailRow label="Guests" value={String(guestCount)} />}
          {arrivalTime && (stage === '1_day' || stage === '3_days' || stage === 'event_day') && (
            <DetailRow label="Chef Arrives" value={arrivalTime} />
          )}
          {location && (stage === '1_day' || stage === 'event_day') && (
            <DetailRow label="Location" value={location} />
          )}
        </div>
      )}

      {/* Prep timeline (visible 7 days before) */}
      {prepTimeline && (stage === '7_days' || stage === '3_days') && (
        <div className="border-t border-stone-800 pt-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
            Prep Timeline
          </p>
          <p className="text-sm text-stone-300">{prepTimeline}</p>
        </div>
      )}

      {/* Day-of checklist */}
      {stage === 'event_day' && (
        <div className="border-t border-stone-800 pt-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Day-of Checklist
          </p>
          <ul className="space-y-1">
            <ChecklistItem label="Menu finalized" done={menuLocked} />
            <ChecklistItem label="Guest count confirmed" done={!!guestCount} />
            <ChecklistItem label="Location confirmed" done={!!location} />
            <ChecklistItem label="Chef arrival time set" done={!!arrivalTime} />
          </ul>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-200 font-medium">{value}</span>
    </div>
  )
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-stone-600" />
      )}
      <span className={done ? 'text-stone-300' : 'text-stone-500'}>{label}</span>
    </li>
  )
}
