import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  CALL_REMINDER_1H_EMAIL_REPAIR_KIND,
  CALL_REMINDER_24H_EMAIL_REPAIR_KIND,
  DAILY_REPORT_EMAIL_REPAIR_KIND,
  FOLLOW_UP_DUE_EMAIL_REPAIR_KIND,
  QUOTE_SENT_REPAIR_KIND,
  getFailureRepairKind,
  getFailureRepairLabel,
} from '@/lib/monitoring/failure-repair'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('classifies explicit quote delivery failures as repairable', () => {
  const kind = getFailureRepairKind({
    source: 'quote-transition',
    operation: 'send_quote_email',
    context: { repairKind: QUOTE_SENT_REPAIR_KIND },
  })

  assert.equal(kind, QUOTE_SENT_REPAIR_KIND)
  assert.equal(getFailureRepairLabel(kind), 'Retry delivery')
})

test('falls back to the legacy quote transition signature when repair metadata is absent', () => {
  const kind = getFailureRepairKind({
    source: 'quote-transition',
    operation: 'send_quote_email',
  })

  assert.equal(kind, QUOTE_SENT_REPAIR_KIND)
})

test('classifies daily report delivery failures only when repair context is present', () => {
  const repairable = getFailureRepairKind({
    source: 'cron:daily-report',
    operation: 'send_daily_report_email',
    context: {
      repairKind: DAILY_REPORT_EMAIL_REPAIR_KIND,
      reportDate: '2026-04-21',
    },
  })
  const missingContext = getFailureRepairKind({
    source: 'cron:daily-report',
    operation: 'send_daily_report_email',
    context: {},
  })

  assert.equal(repairable, DAILY_REPORT_EMAIL_REPAIR_KIND)
  assert.equal(getFailureRepairLabel(repairable), 'Resend daily report')
  assert.equal(missingContext, null)
})

test('classifies follow-up delivery failures only when repair context is present', () => {
  const repairable = getFailureRepairKind({
    source: 'follow-ups-cron',
    operation: 'send_follow_up_due_email',
    context: {
      repairKind: FOLLOW_UP_DUE_EMAIL_REPAIR_KIND,
      clientName: 'Maya Chen',
      followUpDueAt: '2026-04-20T10:00:00.000Z',
    },
  })
  const missingContext = getFailureRepairKind({
    source: 'follow-ups-cron',
    operation: 'send_follow_up_due_email',
    context: { clientName: 'Maya Chen' },
  })

  assert.equal(repairable, FOLLOW_UP_DUE_EMAIL_REPAIR_KIND)
  assert.equal(getFailureRepairLabel(repairable), 'Resend follow-up alert')
  assert.equal(missingContext, null)
})

test('classifies call reminder delivery failures and leaves sent-marker failures non-repairable', () => {
  const repairable24h = getFailureRepairKind({
    source: 'cron:call-reminders',
    operation: 'send_24h_reminder',
    context: {
      repairKind: CALL_REMINDER_24H_EMAIL_REPAIR_KIND,
    },
  })
  const repairable1h = getFailureRepairKind({
    source: 'cron:call-reminders',
    operation: 'send_1h_reminder',
    context: {
      repairKind: CALL_REMINDER_1H_EMAIL_REPAIR_KIND,
    },
  })
  const markerOnly = getFailureRepairKind({
    source: 'cron:call-reminders',
    operation: 'mark_24h_reminder_sent',
    context: {},
  })

  assert.equal(repairable24h, CALL_REMINDER_24H_EMAIL_REPAIR_KIND)
  assert.equal(repairable1h, CALL_REMINDER_1H_EMAIL_REPAIR_KIND)
  assert.equal(getFailureRepairLabel(repairable24h), 'Resend 24h reminder')
  assert.equal(getFailureRepairLabel(repairable1h), 'Resend 1h reminder')
  assert.equal(markerOnly, null)
})

test('leaves unrelated failures non-repairable', () => {
  const kind = getFailureRepairKind({
    source: 'follow-ups-cron',
    operation: 'process_follow_up',
    context: {},
  })

  assert.equal(kind, null)
})

test('quote delivery repair wiring is present in the live source', () => {
  const failureActions = read('lib/monitoring/failure-actions.ts')
  const dailyReportRoute = read('app/api/scheduled/daily-report/route.ts')
  const followUpsRoute = read('app/api/scheduled/follow-ups/route.ts')
  const callRemindersRoute = read('app/api/scheduled/call-reminders/route.ts')
  const quoteActions = read('lib/quotes/actions.ts')
  const quoteDelivery = read('lib/quotes/quote-delivery.ts')
  const callReminderDelivery = read('lib/calls/call-reminder-delivery.ts')
  const adminClient = read('app/(admin)/admin/silent-failures/silent-failures-client.tsx')

  assert.match(failureActions, /repairSideEffectFailure/)
  assert.match(failureActions, /redeliverQuoteSentDelivery/)
  assert.match(failureActions, /redeliverDailyReportEmail/)
  assert.match(failureActions, /redeliverFollowUpDueEmail/)
  assert.match(failureActions, /redeliverCallReminderEmail/)
  assert.match(failureActions, /repair:\s*\{/)

  assert.match(dailyReportRoute, /repairKind:\s*DAILY_REPORT_EMAIL_REPAIR_KIND/)
  assert.match(followUpsRoute, /repairKind:\s*FOLLOW_UP_DUE_EMAIL_REPAIR_KIND/)
  assert.match(callRemindersRoute, /repairKind:\s*CALL_REMINDER_24H_EMAIL_REPAIR_KIND/)
  assert.match(callRemindersRoute, /repairKind:\s*CALL_REMINDER_1H_EMAIL_REPAIR_KIND/)
  assert.match(quoteActions, /repairKind:\s*QUOTE_SENT_REPAIR_KIND/)
  assert.match(quoteDelivery, /sendQuoteSentEmail/)
  assert.match(quoteDelivery, /if \(!emailSent\)/)
  assert.match(callReminderDelivery, /Call reminder email provider did not confirm delivery/)
  assert.match(callReminderDelivery, /reminder_24h_sent_at/)
  assert.match(adminClient, /getFailureRepairLabel/)
})
