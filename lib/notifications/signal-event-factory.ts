import type { ChefSignal, ChefSignalContext } from './noise-simulator'
import type { Notification, NotificationAction } from './types'
import { createSourceTruthCheck, evaluateSourceTruth } from './source-truth-guard'
import { getSignalPolicy } from './signal-os'

export type SignalNotificationRow = Pick<
  Notification,
  | 'id'
  | 'action'
  | 'title'
  | 'body'
  | 'event_id'
  | 'inquiry_id'
  | 'client_id'
  | 'metadata'
  | 'created_at'
>

type SignalMetadata = Record<string, unknown>

function stringFromMetadata(metadata: SignalMetadata, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return undefined
}

function numberFromMetadata(metadata: SignalMetadata, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function booleanFromMetadata(metadata: SignalMetadata, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'boolean') return value
  }
  return undefined
}

export function createSignalFromNotification(row: SignalNotificationRow): ChefSignal {
  const metadata = row.metadata ?? {}
  const context: ChefSignalContext = {
    duplicateKey: stringFromMetadata(metadata, ['duplicateKey', 'duplicate_key']),
    alreadyHandled: booleanFromMetadata(metadata, ['alreadyHandled', 'already_handled']),
    chefCurrentlyViewingContext: booleanFromMetadata(metadata, [
      'chefCurrentlyViewingContext',
      'chef_currently_viewing_context',
    ]),
    hoursUntilEvent: numberFromMetadata(metadata, ['hoursUntilEvent', 'hours_until_event']),
    activeEventLinked: booleanFromMetadata(metadata, ['activeEventLinked', 'active_event_linked']),
    sourceFailure: booleanFromMetadata(metadata, ['sourceFailure', 'source_failure']),
  }

  return {
    id: `notification:${row.id}`,
    action: row.action,
    title: row.title,
    body: row.body ?? undefined,
    occurredAt: row.created_at,
    eventId: row.event_id ?? undefined,
    inquiryId: row.inquiry_id ?? undefined,
    clientId: row.client_id ?? undefined,
    staffId: stringFromMetadata(metadata, ['staffId', 'staff_id']),
    vendorId: stringFromMetadata(metadata, ['vendorId', 'vendor_id']),
    moneyAmountCents: numberFromMetadata(metadata, [
      'moneyAmountCents',
      'money_amount_cents',
      'amount_cents',
    ]),
    context,
  }
}

export function createSignalsFromNotifications(rows: SignalNotificationRow[]): ChefSignal[] {
  return rows.map(createSignalFromNotification)
}

export function guardNotificationSignalSource(row: SignalNotificationRow) {
  const policy = getSignalPolicy(row.action as NotificationAction)
  const checks = [
    createSourceTruthCheck({
      key: 'notification',
      label: 'Notification record',
      source: 'notifications',
      value: row.id,
    }),
  ]

  if (policy.source === 'event') {
    checks.push(
      createSourceTruthCheck({
        key: 'event',
        label: 'Event context',
        source: 'notifications.event_id',
        value: row.event_id,
      })
    )
  }

  if (policy.source === 'client' || policy.source === 'marketplace') {
    checks.push(
      createSourceTruthCheck({
        key: 'client-or-inquiry',
        label: 'Client or inquiry context',
        source: 'notifications.client_id or notifications.inquiry_id',
        value: row.client_id ?? row.inquiry_id,
        blocking: false,
      })
    )
  }

  return evaluateSourceTruth(checks)
}
