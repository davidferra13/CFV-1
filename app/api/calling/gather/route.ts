/**
 * Gather Endpoint
 *
 * Twilio POSTs here after the vendor responds - either by speaking
 * (yes/no/yeah/nope/we do/we don't) or pressing a digit (1=yes, 2=no).
 *
 * Resolves the result, updates the call record, broadcasts via SSE,
 * and plays a natural closing line before hanging up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'

const YES_WORDS = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'we do',
  'absolutely',
  'correct',
  'sure',
  'affirmative',
  'we have',
  'in stock',
  'got it',
  'got some',
]
const NO_WORDS = [
  'no',
  'nope',
  'nah',
  "we don't",
  "don't have",
  'out of stock',
  'not right now',
  'unavailable',
  'we do not',
  'not available',
  'sorry',
]

function resolveResult(digits: string | null, speech: string | null): 'yes' | 'no' | null {
  if (digits === '1') return 'yes'
  if (digits === '2') return 'no'

  if (speech) {
    const lower = speech.toLowerCase()
    if (YES_WORDS.some((w) => lower.includes(w))) return 'yes'
    if (NO_WORDS.some((w) => lower.includes(w))) return 'no'
  }

  return null
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const digits = formData.get('Digits') as string | null
  const speech = formData.get('SpeechResult') as string | null

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')

  if (!callId) {
    return twiml(
      '<Response><Say voice="Polly.Joanna-Neural">Thanks so much, have a great day!</Say></Response>'
    )
  }

  const result = resolveResult(digits, speech)
  const db: any = createAdminClient()

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

  const closing =
    result === 'yes'
      ? 'Perfect, thank you! We really appreciate it. Have a great rest of your day!'
      : result === 'no'
        ? 'Got it, no worries at all. Thanks for your time, have a great day!'
        : 'No worries, thanks so much for picking up. Have a great day!'

  return twiml(`<Response><Say voice="Polly.Joanna-Neural">${closing}</Say></Response>`)
}

function twiml(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
