/**
 * Twilio Status Callback
 *
 * Twilio posts call lifecycle events here (initiated, ringing, completed, failed, etc).
 * We use this to keep the supplier_calls status column accurate and handle
 * no-answer / busy / failed scenarios that the gather endpoint never sees.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string | null
  const callStatus = formData.get('CallStatus') as string | null
  const callDuration = formData.get('CallDuration') as string | null

  if (!callSid || !callStatus) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const db: any = createAdminClient()

  // Map Twilio statuses to our schema
  const statusMap: Record<string, string> = {
    queued: 'queued',
    initiated: 'queued',
    ringing: 'ringing',
    'in-progress': 'in_progress',
    completed: 'completed',
    failed: 'failed',
    busy: 'busy',
    'no-answer': 'no_answer',
    canceled: 'failed',
  }

  const mappedStatus = statusMap[callStatus] ?? 'failed'
  const isTerminal = ['completed', 'failed', 'busy', 'no_answer'].includes(mappedStatus)

  const update: Record<string, any> = {
    status: mappedStatus,
    updated_at: new Date().toISOString(),
  }
  if (callDuration) update.duration_seconds = parseInt(callDuration, 10)

  const { data: callRecord } = await db
    .from('supplier_calls')
    .update(update)
    .eq('call_sid', callSid)
    .select('id, chef_id, vendor_name, ingredient_name, result')
    .single()

  // If terminal and no result was captured (no-answer, busy, failed), broadcast that too
  if (isTerminal && callRecord && callRecord.result === null) {
    try {
      await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
        callId: callRecord.id,
        vendorName: callRecord.vendor_name,
        ingredientName: callRecord.ingredient_name,
        result: null,
        status: mappedStatus,
      })
    } catch (err) {
      console.error('[calling/status] broadcast error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
