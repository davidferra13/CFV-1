'use client'

import { cn } from '@/lib/utils'
import type { CircleDetail, CircleMemberDetail } from '@/lib/hub/circle-detail-actions'

type Props = { circle: CircleDetail }

type RsvpStatus = 'confirmed' | 'maybe' | 'declined' | 'pending'

const RSVP_CONFIG: Record<
  RsvpStatus,
  { label: string; color: string; dot: string; barColor: string }
> = {
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-400',
    dot: 'bg-emerald-500',
    barColor: 'bg-emerald-500',
  },
  maybe: {
    label: 'Maybe',
    color: 'text-amber-400',
    dot: 'bg-amber-500',
    barColor: 'bg-amber-500',
  },
  declined: {
    label: 'Declined',
    color: 'text-red-400',
    dot: 'bg-red-500',
    barColor: 'bg-red-500',
  },
  pending: {
    label: 'Pending',
    color: 'text-stone-400',
    dot: 'bg-stone-600',
    barColor: 'bg-stone-600',
  },
}

const ROLE_STYLES: Record<string, string> = {
  chef: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  owner: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  member: 'bg-stone-600/30 text-stone-400 border-stone-600/40',
  viewer: 'bg-stone-600/30 text-stone-500 border-stone-600/40',
}

function normalizeRsvp(status: string | null): RsvpStatus {
  if (status && status in RSVP_CONFIG) return status as RsvpStatus
  return 'pending'
}

function groupByRsvp(members: CircleMemberDetail[]) {
  const order: RsvpStatus[] = ['confirmed', 'maybe', 'pending', 'declined']
  const groups: Record<RsvpStatus, CircleMemberDetail[]> = {
    confirmed: [],
    maybe: [],
    pending: [],
    declined: [],
  }
  for (const m of members) {
    groups[normalizeRsvp(m.rsvp_status)].push(m)
  }
  return order.flatMap((status) => groups[status])
}

function getRsvpCounts(members: CircleMemberDetail[]) {
  const counts: Record<RsvpStatus, number> = {
    confirmed: 0,
    maybe: 0,
    declined: 0,
    pending: 0,
  }
  for (const m of members) {
    counts[normalizeRsvp(m.rsvp_status)]++
  }
  return counts
}

function getInitial(name: string): string {
  return (name[0] ?? '?').toUpperCase()
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RsvpSummaryBar({ counts, total }: { counts: Record<RsvpStatus, number>; total: number }) {
  if (total === 0) return null
  const order: RsvpStatus[] = ['confirmed', 'maybe', 'declined', 'pending']

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-800">
        {order.map((status) => {
          const pct = (counts[status] / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={status}
              className={cn('h-full transition-all', RSVP_CONFIG[status].barColor)}
              style={{ width: `${pct}%` }}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {order.map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className={cn('h-2 w-2 rounded-full', RSVP_CONFIG[status].dot)} />
            <span>
              {RSVP_CONFIG[status].label}: {counts[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GuestCard({ member }: { member: CircleMemberDetail }) {
  const rsvp = normalizeRsvp(member.rsvp_status)
  const config = RSVP_CONFIG[rsvp]
  const roleStyle = ROLE_STYLES[member.role] ?? ROLE_STYLES.member

  return (
    <div className="group rounded-xl bg-stone-800/50 border border-stone-700/30 p-4 hover:border-stone-600/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.display_name}
            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 text-sm font-semibold text-stone-300 flex-shrink-0">
            {getInitial(member.display_name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name + badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-stone-100 truncate">{member.display_name}</span>
            {/* Role badge */}
            <span className={cn('text-[10px] rounded-full px-2 py-0.5 border', roleStyle)}>
              {member.role}
            </span>
          </div>

          {/* RSVP status */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
            <span className={cn('text-xs', config.color)}>{config.label}</span>
          </div>

          {/* Email */}
          {member.email && <p className="mt-1 text-xs text-stone-500 truncate">{member.email}</p>}

          {/* Client name */}
          {member.client_name && (
            <p className="mt-0.5 text-xs text-stone-400">Client: {member.client_name}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickActions({ hasRemy }: { hasRemy: boolean }) {
  const btnClass =
    'rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700/30 transition-colors'

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btnClass}>
        Nudge Pending
      </button>
      <button type="button" className={btnClass}>
        Export List
      </button>
      {hasRemy && (
        <button type="button" className={btnClass}>
          Let Remy Handle
        </button>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800 text-3xl mb-4">
        👥
      </div>
      <h3 className="text-lg font-semibold text-stone-200 mb-1">No one invited yet</h3>
      <p className="text-sm text-stone-400 mb-4">
        Add guests to this circle to start tracking RSVPs.
      </p>
      <button
        type="button"
        className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
      >
        Invite Guests
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function WhosComingChannel({ circle }: Props) {
  const members = circle.members
  const total = members.length
  const counts = getRsvpCounts(members)
  const sorted = groupByRsvp(members)
  const hasRemy = circle.chef_show_remy || members.some((m) => m.show_remy)

  if (total === 0) {
    return (
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-100">
              <span>👥</span> Who&apos;s Coming
            </h2>
          </div>
        </div>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-100">
            <span>👥</span> Who&apos;s Coming
          </h2>
          <p className="mt-0.5 text-sm text-stone-400">
            {counts.confirmed} confirmed of {total} invited
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Invite
        </button>
      </div>

      {/* RSVP Summary */}
      <RsvpSummaryBar counts={counts} total={total} />

      {/* Guest Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((member) => (
          <GuestCard key={member.id} member={member} />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions hasRemy={hasRemy} />
    </div>
  )
}
