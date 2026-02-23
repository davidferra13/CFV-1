// CallReminderEmail — used for:
//   1. Chef reminder (isChefReminder=true): "You have a call in X hours"
//   2. Client notification (isChefReminder=false): "Your chef has scheduled a call"

import { Text, Button as EmailButton, Section } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'
import type { CallType } from '@/lib/calls/actions'

const CALL_TYPE_LABELS: Record<CallType, string> = {
  discovery: 'discovery call',
  follow_up: 'follow-up call',
  proposal_walkthrough: 'proposal walkthrough',
  pre_event_logistics: 'pre-event logistics call',
  vendor_supplier: 'vendor call',
  partner: 'partner call',
  general: 'call',
  prospecting: 'prospecting call',
}

type CallReminderEmailProps = {
  recipientName: string
  chefName: string
  callType: CallType
  scheduledAt: string // ISO string
  durationMinutes: number
  title: string | null
  isChefReminder: boolean
  hoursUntil?: number // e.g. 24 or 1 (for subject line)
}

export function CallReminderEmail({
  recipientName,
  chefName,
  callType,
  scheduledAt,
  durationMinutes,
  title,
  isChefReminder,
  hoursUntil,
}: CallReminderEmailProps) {
  const typeLabel = CALL_TYPE_LABELS[callType] ?? 'call'
  const date = new Date(scheduledAt)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const callLabel = title ?? `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)}`

  const preview = isChefReminder
    ? hoursUntil === 1
      ? `Your ${typeLabel} is in 1 hour`
      : `Reminder: ${typeLabel} tomorrow`
    : `Your call with ${chefName} is confirmed`

  return (
    <BaseLayout preview={preview}>
      {isChefReminder ? (
        <>
          <Text style={heading}>
            {hoursUntil === 1
              ? `Your ${typeLabel} starts in 1 hour`
              : `Call reminder: ${formattedDate}`}
          </Text>
          <Text style={paragraph}>Hi {recipientName},</Text>
          <Text style={paragraph}>
            You have a <strong>{callLabel}</strong> scheduled for <strong>{formattedDate}</strong>{' '}
            at <strong>{formattedTime}</strong> ({durationMinutes} min).
          </Text>
          <Text style={paragraph}>
            Open ChefFlow to review your prep checklist and agenda before the call.
          </Text>
        </>
      ) : (
        <>
          <Text style={heading}>Your call with {chefName} is confirmed</Text>
          <Text style={paragraph}>Hi {recipientName},</Text>
          <Text style={paragraph}>
            {chefName} has scheduled a <strong>{callLabel}</strong> with you for{' '}
            <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong> ({durationMinutes}{' '}
            min).
          </Text>
          <Text style={paragraph}>
            Please make sure you&apos;re available at that time. If you need to reschedule, reach
            out to {chefName} directly.
          </Text>
        </>
      )}

      <Text style={muted}>
        {formattedDate} · {formattedTime} · {durationMinutes} minutes
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
  borderTop: '1px solid #f3f4f6',
  paddingTop: '12px',
}
