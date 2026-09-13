'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import { createServerClient } from '@/lib/db/server'
import { normalizeEventTimeTruthValue } from '@/lib/events/time-truth'
import {
  canEditServeTimeFromToday,
  TodayServeTimeSchema,
  type TodayServeTimeInput,
} from '@/lib/events/today-actions-core'

export type TodayServeTimeResult = {
  ok: boolean
  message: string
}

export async function setTodayServeTime(input: TodayServeTimeInput): Promise<TodayServeTimeResult> {
  const user = await requireChef()
  if (!user.tenantId) {
    return { ok: false, message: 'Your chef workspace could not be identified.' }
  }

  const rateLimit = await checkRateLimit(`setTodayServeTime:${user.id}`)
  if (!rateLimit.success) {
    return { ok: false, message: 'Too many attempts. Wait a moment and try again.' }
  }

  const parsed = TodayServeTimeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Choose a valid serve time.' }
  }

  const { eventId, serveTime } = parsed.data
  const db: any = createServerClient()
  const { data: event, error: readError } = await db
    .from('events')
    .select('id, status, serve_time, updated_at, deleted_at')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (readError) {
    console.error('[setTodayServeTime] Event lookup failed:', readError)
    return { ok: false, message: 'The dinner could not be read. Refresh and try again.' }
  }
  if (!event || event.deleted_at) {
    return { ok: false, message: 'That dinner is no longer available.' }
  }
  if (!canEditServeTimeFromToday(event.status)) {
    return { ok: false, message: 'Serve time cannot be changed after service has started.' }
  }
  if (normalizeEventTimeTruthValue(event.serve_time)?.slice(0, 5) === serveTime) {
    return { ok: true, message: 'Serve time is already set.' }
  }

  let updateQuery = db
    .from('events')
    .update({
      serve_time: serveTime,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId)
    .eq('status', event.status)
    .is('deleted_at', null)

  if (event.updated_at) {
    updateQuery = updateQuery.eq('updated_at', event.updated_at)
  }

  const { data: updated, error: updateError } = await updateQuery
    .select('id, serve_time')
    .maybeSingle()

  if (updateError) {
    console.error('[setTodayServeTime] Update failed:', updateError)
    return { ok: false, message: 'Serve time was not saved. Try again.' }
  }
  if (!updated) {
    return { ok: false, message: 'This dinner changed elsewhere. Refresh and try again.' }
  }
  if (normalizeEventTimeTruthValue(updated.serve_time)?.slice(0, 5) !== serveTime) {
    return {
      ok: false,
      message: 'The saved serve time could not be confirmed. Refresh and check it.',
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/schedule`)
  revalidatePath('/calendar')
  invalidateRemyContextCache(user.tenantId)

  return { ok: true, message: 'Serve time saved.' }
}
