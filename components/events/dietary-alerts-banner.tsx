'use client'

// DietaryAlertsBanner - Shows all dietary restrictions from the event's client + guests
// with per-person attribution. Each person links to their client page (if they are the booker).
// Shown on event detail regardless of menu status so the chef knows restrictions early.

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Users,
} from '@/components/ui/icons'
import {
  getEventDietaryContext,
  type EventDietaryContext,
  type PersonDietaryInfo,
} from '@/lib/events/dietary-context-actions'

type Props = {
  eventId: string
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-800',
    bg: 'bg-red-950/40',
    text: 'text-red-300',
    icon: 'text-red-500',
    badge: 'error' as const,
  },
  warning: {
    border: 'border-amber-800',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    icon: 'text-amber-500',
    badge: 'warning' as const,
  },
  info: {
    border: 'border-stone-700',
    bg: 'bg-stone-900/40',
    text: 'text-stone-300',
    icon: 'text-stone-400',
    badge: 'default' as const,
  },
}

const ROLE_LABELS = {
  client: 'Client',
  guest: 'Guest',
  plus_one: '+1',
}

function PersonRow({ person }: { person: PersonDietaryInfo }) {
  const style = SEVERITY_STYLES[person.severity]
  const RoleIcon = person.role === 'client' ? User : Users

  const nameElement = person.clientId ? (
    <Link
      href={`/clients/${person.clientId}`}
      className="text-sm font-medium text-brand-400 hover:text-brand-300 hover:underline"
    >
      {person.name}
    </Link>
  ) : (
    <span className="text-sm font-medium text-stone-100">{person.name}</span>
  )

  return (
    <div className={`rounded-md border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <RoleIcon className={`h-4 w-4 shrink-0 ${style.icon}`} />
        {nameElement}
        <Badge variant={style.badge}>{ROLE_LABELS[person.role]}</Badge>
      </div>

      {/* Allergies */}
      {person.allergies.length > 0 && (
        <div className="mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-red-400 mr-2">
            Allergies:
          </span>
          <span className="inline-flex flex-wrap gap-1">
            {person.allergies.map((a) => (
              <Badge key={a} variant="error">
                {a}
              </Badge>
            ))}
          </span>
        </div>
      )}

      {/* Dietary Restrictions */}
      {person.dietaryRestrictions.length > 0 && (
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-amber-400 mr-2">
            Restrictions:
          </span>
          <span className="inline-flex flex-wrap gap-1">
            {person.dietaryRestrictions.map((r) => (
              <Badge key={r} variant="warning">
                {r}
              </Badge>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}

export function DietaryAlertsBanner({ eventId }: Props) {
  const [context, setContext] = useState<EventDietaryContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getEventDietaryContext(eventId)
        if (!cancelled) setContext(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dietary context')
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">Could not load dietary data: {error}</p>
        </div>
      </div>
    )
  }

  if (isPending || !context) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-stone-400 shrink-0 animate-pulse" />
          <p className="text-sm text-stone-400">Loading dietary restrictions...</p>
        </div>
      </div>
    )
  }

  // No dietary data at all
  if (context.people.length === 0) {
    return null
  }

  const bannerStyle = context.hasCritical
    ? 'border-red-800 bg-red-950/30'
    : 'border-amber-800 bg-amber-950/30'

  const headerColor = context.hasCritical ? 'text-red-300' : 'text-amber-300'
  const iconColor = context.hasCritical ? 'text-red-500' : 'text-amber-500'

  return (
    <div className={`rounded-lg border ${bannerStyle} p-4`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className={`h-5 w-5 shrink-0 ${iconColor}`} />
          <h3 className={`text-sm font-semibold ${headerColor}`}>Dietary Alerts</h3>
          <div className="flex items-center gap-1.5">
            <Badge variant={context.hasCritical ? 'error' : 'warning'}>
              {context.people.length} {context.people.length === 1 ? 'person' : 'people'}
            </Badge>
            {context.totalAllergies > 0 && (
              <Badge variant="error">
                {context.totalAllergies} {context.totalAllergies === 1 ? 'allergy' : 'allergies'}
              </Badge>
            )}
            {context.totalRestrictions > 0 && (
              <Badge variant="warning">
                {context.totalRestrictions}{' '}
                {context.totalRestrictions === 1 ? 'restriction' : 'restrictions'}
              </Badge>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
        )}
      </button>

      {/* Collapsed summary: one line per person */}
      {!expanded && (
        <div className="mt-2 space-y-1">
          {context.people.map((person) => {
            const items = [...person.allergies, ...person.dietaryRestrictions]
            return (
              <p key={`${person.name}-${person.role}`} className="text-xs text-stone-400">
                <span className="font-medium text-stone-300">{person.name}</span> (
                {ROLE_LABELS[person.role]}): {items.join(', ')}
              </p>
            )
          })}
        </div>
      )}

      {/* Expanded: full detail per person */}
      {expanded && (
        <div className="mt-4 space-y-2">
          {context.people.map((person) => (
            <PersonRow key={`${person.name}-${person.role}`} person={person} />
          ))}
        </div>
      )}
    </div>
  )
}
