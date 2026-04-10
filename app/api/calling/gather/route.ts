/**
 * Gather (Keypress) Endpoint
 *
 * Twilio POSTs here after the vendor presses a digit.
 * 1 = yes (they have it), 2 = no (they don't).
 *
 * Updates the supplier_calls record and broadcasts the result
 * to the chef via SSE so the UI updates in real time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const digit = formData.get('Digits') as string | null
  const callSid = formData.get('CallSid') as string | null

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')

  if (!callId) {
    return respondTwiml('<Response><Say>An error occurred. Goodbye.</Say></Response>')
  }

  const result = digit === '1' ? 'yes' : digit === '2' ? 'no' : null
  const db: any = createAdminClient()

  // Update the call record
  const { data: callRecord } = await db
    .from('supplier_calls')
    .update({
      result,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', callId)
    .select('chef_id, vendor_name, ingredient_name')
    .single()

  // Broadcast result to chef's SSE channel
  if (callRecord) {
    try {
      await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
        callId,
        vendorName: callRecord.vendor_name,
        ingredientName: callRecord.ingredient_name,
        result,
      })
    } catch (err) {
      console.error('[calling/gather] broadcast error:', err)
    }
  }

  // Thank the vendor and hang up
  const message =
    result === 'yes'
      ? 'Thank you for confirming. The chef will be in touch. Goodbye.'
      : result === 'no'
        ? 'Thank you for letting us know. Goodbye.'
        : 'We did not capture your response. Thank you. Goodbye.'

  return respondTwiml(`<Response><Say voice="Polly.Joanna">${message}</Say></Response>`)
}

function respondTwiml(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
