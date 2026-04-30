import {
  readInterruptionAuditMetadata,
  type InterruptionAuditMetadata,
} from '@/lib/notifications/interruption-policy'
import type { Notification } from '@/lib/notifications/types'

type Props = {
  notification: Notification
  compact?: boolean
}

const LEVEL_LABELS: Record<InterruptionAuditMetadata['level'], string> = {
  silent: 'Silent',
  badge: 'Badge only',
  soft: 'Soft tap',
  double: 'Double tap',
  urgent: 'Urgent buzz',
}

export function NotificationInterruptionReason({ notification, compact = false }: Props) {
  const audit = readInterruptionAuditMetadata(notification.metadata)
  if (!audit) return null

  if (compact) {
    return (
      <p className="mt-1 text-xxs text-stone-500">
        {LEVEL_LABELS[audit.level]}: {audit.reason}
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-md border border-stone-800 bg-stone-950/40 px-2.5 py-2">
      <p className="text-xxs font-medium text-stone-300">
        Why this alert: <span className="font-normal text-stone-400">{audit.reason}</span>
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer text-xxs text-stone-500">Haptic audit</summary>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xxs text-stone-500">
          <dt>Level</dt>
          <dd className="text-stone-400">{LEVEL_LABELS[audit.level]}</dd>
          <dt>Group</dt>
          <dd className="text-stone-400">{audit.group}</dd>
          <dt>Digest</dt>
          <dd className="text-stone-400">{audit.shouldDigest ? 'Yes' : 'No'}</dd>
          <dt>Quiet bypass</dt>
          <dd className="text-stone-400">{audit.bypassQuietHours ? 'Yes' : 'No'}</dd>
          <dt>Event focus</dt>
          <dd className="text-stone-400">
            {audit.eventDayFocusApplied
              ? 'Applied'
              : audit.eventDayFocusActive
                ? 'Active'
                : 'Inactive'}
          </dd>
          <dt>Pattern</dt>
          <dd className="text-stone-400">
            {audit.pattern.length > 0 ? audit.pattern.join(', ') : 'None'}
          </dd>
        </dl>
      </details>
    </div>
  )
}
