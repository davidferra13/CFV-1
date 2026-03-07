'use client'

import type { HubMessage, HubNotificationType } from '@/lib/hub/types'

// ---------------------------------------------------------------------------
// Notification Card - Rich actionable cards rendered inside the circle feed.
// Each notification_type gets a distinct icon, color, and layout.
// ---------------------------------------------------------------------------

interface NotificationCardProps {
  message: HubMessage
}

const NOTIFICATION_CONFIG: Record<
  HubNotificationType,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  quote_sent: {
    icon: '💰',
    label: 'Quote',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/30 border-amber-700/50',
  },
  quote_accepted: {
    icon: '🎉',
    label: 'Quote Accepted',
    color: 'text-green-300',
    bgColor: 'bg-green-900/30 border-green-700/50',
  },
  payment_received: {
    icon: '✅',
    label: 'Payment',
    color: 'text-green-300',
    bgColor: 'bg-green-900/30 border-green-700/50',
  },
  event_confirmed: {
    icon: '📅',
    label: 'Confirmed',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30 border-blue-700/50',
  },
  event_completed: {
    icon: '🏁',
    label: 'Complete',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/30 border-purple-700/50',
  },
  menu_shared: {
    icon: '🍽️',
    label: 'Menu',
    color: 'text-orange-300',
    bgColor: 'bg-orange-900/30 border-orange-700/50',
  },
  photos_ready: {
    icon: '📸',
    label: 'Photos',
    color: 'text-pink-300',
    bgColor: 'bg-pink-900/30 border-pink-700/50',
  },
  contract_ready: {
    icon: '📝',
    label: 'Contract',
    color: 'text-stone-300',
    bgColor: 'bg-stone-800/50 border-stone-600/50',
  },
  invoice_sent: {
    icon: '🧾',
    label: 'Invoice',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/30 border-amber-700/50',
  },
  guest_count_updated: {
    icon: '👥',
    label: 'Guest Update',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30 border-blue-700/50',
  },
  dietary_updated: {
    icon: '🥗',
    label: 'Dietary Update',
    color: 'text-green-300',
    bgColor: 'bg-green-900/30 border-green-700/50',
  },
  running_late: {
    icon: '⏰',
    label: 'Update',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900/30 border-yellow-700/50',
  },
  repeat_booking_request: {
    icon: '🔄',
    label: 'Booking Request',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30 border-blue-700/50',
  },
}

export function HubNotificationCard({ message }: NotificationCardProps) {
  const notifType = message.notification_type
  if (!notifType) return null

  const config = NOTIFICATION_CONFIG[notifType] ?? {
    icon: '📢',
    label: 'Update',
    color: 'text-stone-300',
    bgColor: 'bg-stone-800/50 border-stone-600/50',
  }

  const metadata = (message.system_metadata ?? {}) as Record<string, unknown>

  return (
    <div className="flex justify-center px-4 py-2">
      <div className={`w-full max-w-md rounded-xl border p-4 ${config.bgColor}`}>
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
            {config.label}
          </span>
          <span className="ml-auto text-[10px] text-stone-500">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Body */}
        {message.body && (
          <p className="mb-3 text-sm leading-relaxed text-stone-200">{message.body}</p>
        )}

        {/* Structured metadata display */}
        <NotificationMetadata notifType={notifType} metadata={metadata} />

        {/* CTA button */}
        {message.action_url && message.action_label && (
          <a
            href={message.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-lg bg-[var(--hub-primary,#e88f47)] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            {message.action_label}
          </a>
        )}

        {/* Source badge */}
        {message.source === 'email' && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-500">
            <MailIcon />
            <span>via email</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Render structured data based on notification type
function NotificationMetadata({
  notifType,
  metadata,
}: {
  notifType: HubNotificationType
  metadata: Record<string, unknown>
}) {
  if (notifType === 'quote_sent') {
    const totalCents = metadata.total_cents as number | undefined
    const depositCents = metadata.deposit_cents as number | undefined
    const perPersonCents = metadata.per_person_cents as number | undefined
    if (!totalCents) return null

    return (
      <div className="rounded-lg bg-black/20 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-stone-400">Total</span>
          <span className="text-lg font-semibold text-amber-300">
            ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
        {perPersonCents ? (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-stone-400">Per person</span>
            <span className="text-sm text-stone-300">${(perPersonCents / 100).toFixed(2)}</span>
          </div>
        ) : null}
        {depositCents ? (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-stone-400">Deposit to book</span>
            <span className="text-sm text-stone-300">${(depositCents / 100).toFixed(2)}</span>
          </div>
        ) : null}
      </div>
    )
  }

  if (notifType === 'payment_received') {
    const amountCents = metadata.amount_cents as number | undefined
    const paymentType = metadata.payment_type as string | undefined
    if (!amountCents) return null

    return (
      <div className="rounded-lg bg-black/20 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-stone-400">
            {paymentType === 'deposit' ? 'Deposit' : 'Payment'}
          </span>
          <span className="text-lg font-semibold text-green-300">
            ${(amountCents / 100).toFixed(2)}
          </span>
        </div>
      </div>
    )
  }

  if (notifType === 'event_confirmed') {
    const eventDate = metadata.event_date as string | undefined
    const location = metadata.location as string | undefined
    const guestCount = metadata.guest_count as number | undefined
    if (!eventDate && !location && !guestCount) return null

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        {eventDate && (
          <div className="flex justify-between">
            <span className="text-stone-400">Date</span>
            <span className="text-stone-200">{eventDate}</span>
          </div>
        )}
        {location && (
          <div className="mt-1 flex justify-between">
            <span className="text-stone-400">Location</span>
            <span className="text-stone-200">{location}</span>
          </div>
        )}
        {guestCount && (
          <div className="mt-1 flex justify-between">
            <span className="text-stone-400">Guests</span>
            <span className="text-stone-200">{guestCount}</span>
          </div>
        )}
      </div>
    )
  }

  if (notifType === 'menu_shared') {
    const menuName = metadata.menu_name as string | undefined
    const courseCount = metadata.course_count as number | undefined
    if (!menuName) return null

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-400">Menu</span>
          <span className="text-stone-200">{menuName}</span>
        </div>
        {courseCount ? (
          <div className="mt-1 flex justify-between">
            <span className="text-stone-400">Courses</span>
            <span className="text-stone-200">{courseCount}</span>
          </div>
        ) : null}
      </div>
    )
  }

  if (notifType === 'guest_count_updated') {
    const newCount = metadata.new_count as number | undefined
    const previousCount = metadata.previous_count as number | undefined
    if (!newCount) return null

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-400">Guest count</span>
          <span className="text-stone-200">
            {previousCount ? `${previousCount} → ` : ''}
            {newCount}
          </span>
        </div>
      </div>
    )
  }

  if (notifType === 'dietary_updated') {
    const guestName = metadata.guest_name as string | undefined
    const restrictions = metadata.restrictions as string[] | undefined
    const allergies = metadata.allergies as string[] | undefined

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        {guestName && <div className="mb-1 font-medium text-stone-200">{guestName}</div>}
        {restrictions && restrictions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {restrictions.map((r) => (
              <span key={r} className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300">
                {r}
              </span>
            ))}
          </div>
        )}
        {allergies && allergies.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {allergies.map((a) => (
              <span key={a} className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-300">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (notifType === 'running_late') {
    const eta = metadata.eta_minutes as number | undefined
    if (!eta) return null

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-400">ETA</span>
          <span className="text-yellow-300">{eta} minutes</span>
        </div>
      </div>
    )
  }

  if (notifType === 'photos_ready') {
    const photoCount = metadata.photo_count as number | undefined
    if (!photoCount) return null

    return (
      <div className="rounded-lg bg-black/20 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-400">Photos available</span>
          <span className="text-pink-300">{photoCount}</span>
        </div>
      </div>
    )
  }

  return null
}

function MailIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  )
}
