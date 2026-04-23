'use server'

// Server actions for the /admin/silent-failures dashboard.
// Read, dismiss, and cleanup side_effect_failures records.

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import {
  CALL_REMINDER_1H_EMAIL_REPAIR_KIND,
  CALL_REMINDER_24H_EMAIL_REPAIR_KIND,
  DAILY_REPORT_EMAIL_REPAIR_KIND,
  FOLLOW_UP_DUE_EMAIL_REPAIR_KIND,
  getFailureRepairKind,
  QUOTE_SENT_REPAIR_KIND,
} from '@/lib/monitoring/failure-repair'
import { revalidatePath } from 'next/cache'

export interface SideEffectFailure {
  id: string
  created_at: string
  source: string
  operation: string
  severity: string
  entity_type: string | null
  entity_id: string | null
  tenant_id: string | null
  error_message: string | null
  context: Record<string, unknown>
  dismissed_at: string | null
  dismissed_by: string | null
}

function normalizeFailureContext(context: unknown): Record<string, unknown> {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return {}
  }

  return { ...(context as Record<string, unknown>) }
}

function readStringContext(
  context: Record<string, unknown>,
  key: string,
  opts?: { allowEmpty?: boolean }
): string | null {
  const value = context[key]
  if (typeof value !== 'string') return null
  if (opts?.allowEmpty) return value
  return value.length > 0 ? value : null
}

export async function getSideEffectFailures(opts?: {
  limit?: number
  includeDismissed?: boolean
  source?: string
  severity?: string
}): Promise<{ failures: SideEffectFailure[]; total: number }> {
  await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const limit = opts?.limit ?? 100

  let query = db
    .from('side_effect_failures')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!opts?.includeDismissed) {
    query = query.is('dismissed_at', null)
  }
  if (opts?.source) {
    query = query.eq('source', opts.source)
  }
  if (opts?.severity) {
    query = query.eq('severity', opts.severity)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[failure-actions] Failed to fetch side_effect_failures:', error)
    return { failures: [], total: 0 }
  }

  return { failures: data ?? [], total: count ?? 0 }
}

export async function getFailureSources(): Promise<string[]> {
  await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const { data } = await db.from('side_effect_failures').select('source').is('dismissed_at', null)

  if (!data) return []

  const unique = [...new Set((data as { source: string }[]).map((r) => r.source))]
  return unique.sort()
}

export async function dismissFailure(id: string): Promise<void> {
  const admin = await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('side_effect_failures')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: admin.email })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to dismiss: ${error.message}`)
  }

  revalidatePath('/admin/silent-failures')
}

export async function dismissAllBySource(source: string): Promise<number> {
  const admin = await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('side_effect_failures')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: admin.email })
    .eq('source', source)
    .is('dismissed_at', null)
    .select('id')

  if (error) {
    throw new Error(`Failed to dismiss: ${error.message}`)
  }

  revalidatePath('/admin/silent-failures')
  return data?.length ?? 0
}

export async function repairSideEffectFailure(id: string): Promise<{ message: string }> {
  const admin = await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db.from('side_effect_failures').select('*').eq('id', id).single()

  if (error || !data) {
    throw new Error('Failure record not found.')
  }

  const failure = data as SideEffectFailure
  if (failure.dismissed_at) {
    throw new Error('Failure is already resolved.')
  }

  const repairKind = getFailureRepairKind(failure)
  if (!repairKind) {
    throw new Error('This failure does not have a registered repair action.')
  }

  if (!failure.entity_id || !failure.tenant_id) {
    throw new Error('Failure is missing the entity scope needed for repair.')
  }

  const repairedAt = new Date().toISOString()
  const currentContext = normalizeFailureContext(failure.context)

  try {
    let result: { message: string }

    switch (repairKind) {
      case QUOTE_SENT_REPAIR_KIND: {
        const { redeliverQuoteSentDelivery } = await import('@/lib/quotes/quote-delivery')
        result = await redeliverQuoteSentDelivery({
          tenantId: failure.tenant_id,
          quoteId: failure.entity_id,
        })
        break
      }
      case DAILY_REPORT_EMAIL_REPAIR_KIND: {
        const reportDate = readStringContext(currentContext, 'reportDate')
        if (!reportDate) {
          throw new Error('Failure is missing the report date needed for repair.')
        }

        const { redeliverDailyReportEmail } = await import('@/lib/reports/daily-report-delivery')
        result = await redeliverDailyReportEmail({
          tenantId: failure.tenant_id,
          reportDate,
        })
        break
      }
      case FOLLOW_UP_DUE_EMAIL_REPAIR_KIND: {
        const clientName = readStringContext(currentContext, 'clientName')
        const followUpDueAt = readStringContext(currentContext, 'followUpDueAt')
        const occasion = readStringContext(currentContext, 'occasion', { allowEmpty: true })
        const followUpNote = readStringContext(currentContext, 'followUpNote', {
          allowEmpty: true,
        })

        if (!clientName || !followUpDueAt) {
          throw new Error('Failure is missing the follow-up context needed for repair.')
        }

        const { redeliverFollowUpDueEmail } = await import('@/lib/inquiries/follow-up-delivery')
        result = await redeliverFollowUpDueEmail({
          tenantId: failure.tenant_id,
          inquiryId: failure.entity_id,
          clientName,
          occasion,
          followUpNote,
          followUpDueAt,
        })
        break
      }
      case CALL_REMINDER_24H_EMAIL_REPAIR_KIND:
      case CALL_REMINDER_1H_EMAIL_REPAIR_KIND: {
        const reminderType = repairKind === CALL_REMINDER_24H_EMAIL_REPAIR_KIND ? '24h' : '1h'
        const { redeliverCallReminderEmail } = await import('@/lib/calls/call-reminder-delivery')
        result = await redeliverCallReminderEmail({
          tenantId: failure.tenant_id,
          callId: failure.entity_id,
          reminderType,
        })
        break
      }
      default:
        throw new Error('Repair handler is not implemented.')
    }

    const { error: updateError } = await db
      .from('side_effect_failures')
      .update({
        dismissed_at: repairedAt,
        dismissed_by: `repair:${admin.email}`,
        context: {
          ...currentContext,
          repair: {
            kind: repairKind,
            repairedAt,
            repairedBy: admin.email,
            result: result.message,
          },
          lastRepairAttempt: {
            at: repairedAt,
            by: admin.email,
            status: 'succeeded',
          },
        },
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to record repair result: ${updateError.message}`)
    }

    revalidatePath('/admin/silent-failures')
    return { message: result.message }
  } catch (repairError) {
    const message =
      repairError instanceof Error ? repairError.message : 'Unknown side-effect repair failure.'

    const repairContext = {
      ...currentContext,
      lastRepairAttempt: {
        at: repairedAt,
        by: admin.email,
        status: 'failed',
        error: message,
      },
    }

    await db.from('side_effect_failures').update({ context: repairContext }).eq('id', id)
    throw new Error(message)
  }
}

export async function getFailureSummary(): Promise<{
  total: number
  bySeverity: Record<string, number>
  bySource: { source: string; count: number }[]
}> {
  await requireAdmin()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('side_effect_failures')
    .select('severity, source')
    .is('dismissed_at', null)

  if (error || !data) {
    return { total: 0, bySeverity: {}, bySource: [] }
  }

  const rows = data as { severity: string; source: string }[]
  const bySeverity: Record<string, number> = {}
  const sourceMap: Record<string, number> = {}

  for (const row of rows) {
    bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1
    sourceMap[row.source] = (sourceMap[row.source] ?? 0) + 1
  }

  const bySource = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return { total: rows.length, bySeverity, bySource }
}
