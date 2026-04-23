export const QUOTE_SENT_REPAIR_KIND = 'quote_sent_redelivery' as const
export const DAILY_REPORT_EMAIL_REPAIR_KIND = 'daily_report_email_redelivery' as const
export const FOLLOW_UP_DUE_EMAIL_REPAIR_KIND = 'follow_up_due_email_redelivery' as const
export const CALL_REMINDER_24H_EMAIL_REPAIR_KIND = 'call_reminder_24h_email_redelivery' as const
export const CALL_REMINDER_1H_EMAIL_REPAIR_KIND = 'call_reminder_1h_email_redelivery' as const

export type FailureRepairKind =
  | typeof QUOTE_SENT_REPAIR_KIND
  | typeof DAILY_REPORT_EMAIL_REPAIR_KIND
  | typeof FOLLOW_UP_DUE_EMAIL_REPAIR_KIND
  | typeof CALL_REMINDER_24H_EMAIL_REPAIR_KIND
  | typeof CALL_REMINDER_1H_EMAIL_REPAIR_KIND

export type RepairableFailureLike = {
  source: string
  operation: string
  context?: unknown
}

function readContextObject(context: unknown): Record<string, unknown> | null {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null
  return context as Record<string, unknown>
}

function readContextRepairKind(context: unknown): string | null {
  const record = readContextObject(context)
  if (!record) return null

  const repairKind = record.repairKind
  return typeof repairKind === 'string' ? repairKind : null
}

function hasDailyReportRepairContext(context: unknown): boolean {
  const record = readContextObject(context)
  return typeof record?.reportDate === 'string' && record.reportDate.length > 0
}

function hasFollowUpRepairContext(context: unknown): boolean {
  const record = readContextObject(context)
  return (
    typeof record?.clientName === 'string' &&
    record.clientName.length > 0 &&
    typeof record.followUpDueAt === 'string' &&
    record.followUpDueAt.length > 0
  )
}

export function getFailureRepairKind(failure: RepairableFailureLike): FailureRepairKind | null {
  const explicitKind = readContextRepairKind(failure.context)
  if (explicitKind === QUOTE_SENT_REPAIR_KIND) {
    return QUOTE_SENT_REPAIR_KIND
  }
  if (
    explicitKind === DAILY_REPORT_EMAIL_REPAIR_KIND &&
    hasDailyReportRepairContext(failure.context)
  ) {
    return DAILY_REPORT_EMAIL_REPAIR_KIND
  }
  if (
    explicitKind === FOLLOW_UP_DUE_EMAIL_REPAIR_KIND &&
    hasFollowUpRepairContext(failure.context)
  ) {
    return FOLLOW_UP_DUE_EMAIL_REPAIR_KIND
  }
  if (explicitKind === CALL_REMINDER_24H_EMAIL_REPAIR_KIND) {
    return CALL_REMINDER_24H_EMAIL_REPAIR_KIND
  }
  if (explicitKind === CALL_REMINDER_1H_EMAIL_REPAIR_KIND) {
    return CALL_REMINDER_1H_EMAIL_REPAIR_KIND
  }

  if (failure.source === 'quote-transition' && failure.operation === 'send_quote_email') {
    return QUOTE_SENT_REPAIR_KIND
  }
  if (
    failure.source === 'cron:daily-report' &&
    failure.operation === 'send_daily_report_email' &&
    hasDailyReportRepairContext(failure.context)
  ) {
    return DAILY_REPORT_EMAIL_REPAIR_KIND
  }
  if (
    failure.source === 'follow-ups-cron' &&
    failure.operation === 'send_follow_up_due_email' &&
    hasFollowUpRepairContext(failure.context)
  ) {
    return FOLLOW_UP_DUE_EMAIL_REPAIR_KIND
  }
  if (failure.source === 'cron:call-reminders' && failure.operation === 'send_24h_reminder') {
    return CALL_REMINDER_24H_EMAIL_REPAIR_KIND
  }
  if (failure.source === 'cron:call-reminders' && failure.operation === 'send_1h_reminder') {
    return CALL_REMINDER_1H_EMAIL_REPAIR_KIND
  }

  return null
}

export function getFailureRepairLabel(kind: FailureRepairKind): string {
  switch (kind) {
    case QUOTE_SENT_REPAIR_KIND:
      return 'Retry delivery'
    case DAILY_REPORT_EMAIL_REPAIR_KIND:
      return 'Resend daily report'
    case FOLLOW_UP_DUE_EMAIL_REPAIR_KIND:
      return 'Resend follow-up alert'
    case CALL_REMINDER_24H_EMAIL_REPAIR_KIND:
      return 'Resend 24h reminder'
    case CALL_REMINDER_1H_EMAIL_REPAIR_KIND:
      return 'Resend 1h reminder'
    default:
      return 'Repair'
  }
}
