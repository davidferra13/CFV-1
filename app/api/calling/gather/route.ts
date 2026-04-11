/**
 * Gather Endpoint - AI Calling System
 *
 * Twilio POSTs here after each Gather interaction on any call role.
 * Dispatches to per-role handlers. Logs every utterance to ai_call_transcripts.
 *
 * Roles handled:
 *   vendor_availability  - yes/no stock check + price/qty (default, existing)
 *   vendor_delivery      - delivery window + contact name
 *   venue_confirmation   - access time + kitchen notes
 *   inbound_vendor_callback - vendor calling back
 *   inbound_unknown      - capture free-form message from unknown caller
 *
 * HARD RULE: This endpoint never handles client-facing call roles.
 * Clients receive email and SMS only. Voice is for vendors and businesses only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'
import {
  twimlResponse,
  closingTwiml,
  buildAvailabilityStep2Twiml,
  buildDeliveryStep2Twiml,
  buildVenueStep2Twiml,
  DEFAULT_VOICE,
} from '@/lib/calling/voice-helpers'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

// ---------------------------------------------------------------------------
// Availability resolution helpers
// ---------------------------------------------------------------------------

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
  'we got',
  'have it',
  'we carry',
  'carry that',
  'definitely',
  'of course',
  'certainly',
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
  "don't carry",
  "we're out",
  'fresh out',
  'sold out',
  'not in',
  'none left',
]

function resolveAvailability(digits: string | null, speech: string | null): 'yes' | 'no' | null {
  if (digits === '1') return 'yes'
  if (digits === '2') return 'no'
  if (speech) {
    const lower = speech.toLowerCase()
    if (YES_WORDS.some((w) => lower.includes(w))) return 'yes'
    if (NO_WORDS.some((w) => lower.includes(w))) return 'no'
  }
  return null
}

// ---------------------------------------------------------------------------
// Price and quantity extraction
// ---------------------------------------------------------------------------

const UNIT_WORDS =
  '(?:pound|lb|lbs|ounce|oz|piece|each|unit|item|dozen|case|box|bag|gallon|quart|pint|liter|kilogram|kg)'
const PER_UNIT = `(?:\\s*(?:a|per|\\/)\\s*${UNIT_WORDS})?`

function extractPrice(speech: string): string | null {
  const dollarSignPattern = new RegExp(`\\$[\\d,.]+${PER_UNIT}`, 'i')
  const m1 = speech.match(dollarSignPattern)
  if (m1) return m1[0].trim()

  const dollarWordPattern = new RegExp(
    `\\b(\\d+(?:\\.\\d+)?)\\s*(?:dollars?|bucks?)(?:\\s+(?:and\\s+)?(\\d+)\\s*cents?)?${PER_UNIT}`,
    'i'
  )
  const m2 = speech.match(dollarWordPattern)
  if (m2) {
    const dollars = m2[1]
    const cents = m2[2] ? `.${m2[2].padStart(2, '0')}` : ''
    return `$${dollars}${cents}`
  }

  const wordNumbers: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60',
    seventy: '70',
    eighty: '80',
    ninety: '90',
  }
  const normalised = speech.toLowerCase().replace(/[-]/g, ' ')
  const wordNumPattern = new RegExp(
    `\\b(${Object.keys(wordNumbers).join('|')})(?:\\s+(${Object.keys(wordNumbers).join('|')}))?${PER_UNIT}`,
    'i'
  )
  const m3 = normalised.match(wordNumPattern)
  if (m3) {
    const major = wordNumbers[m3[1].toLowerCase()]
    const minor = m3[2] ? wordNumbers[m3[2].toLowerCase()] : null
    if (major) return minor ? `$${major}.${minor.padStart(2, '0')}` : `$${major}`
  }

  return null
}

function extractQuantity(speech: string): string | null {
  const quantityPattern =
    /\b(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?|ounces?|oz|pieces?|units?|items?|dozens?|cases?|boxes?|bags?|gallons?|quarts?|pints?|liters?|kilograms?|kgs?)\b/i
  const roughPattern =
    /\b(a few|several|some|plenty|a lot|half a|a quarter|about \d+|around \d+)\b/i
  return speech.match(quantityPattern)?.[0].trim() ?? speech.match(roughPattern)?.[0].trim() ?? null
}

function parsePriceToCents(priceStr: string): number | null {
  const match = priceStr.match(/\$(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  return Math.round(parseFloat(match[1]) * 100)
}

function extractUnit(speech: string): string | null {
  return (
    speech
      .match(
        /\b(pounds?|lbs?|ounces?|oz|pieces?|each|units?|dozens?|cases?|boxes?|bags?|gallons?|quarts?|pints?|liters?|kilograms?|kgs?)\b/i
      )?.[1]
      .toLowerCase() ?? null
  )
}

function extractTimeWindow(speech: string): string | null {
  const between = speech.match(
    /between\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+and\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
  )
  if (between) return `between ${between[1]} and ${between[2]}`
  const around = speech.match(/(?:around|at|approximately)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (around) return around[0]
  const specific = speech.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)
  if (specific) return specific[0]
  const period = speech.match(/\b(morning|afternoon|evening|early|late)\b/i)
  if (period) return period[0]
  return speech.length < 100 ? speech.trim() : speech.slice(0, 100).trim()
}

// ---------------------------------------------------------------------------
// Transcript logging
// ---------------------------------------------------------------------------

async function logTranscript(
  db: any,
  aiCallId: string | null,
  step: number,
  speaker: 'ai' | 'caller',
  content: string,
  inputType: 'speech' | 'dtmf' | 'timeout' | 'ai_prompt',
  confidence?: number | null
) {
  if (!aiCallId) return
  try {
    await db.from('ai_call_transcripts').insert({
      ai_call_id: aiCallId,
      step,
      speaker,
      content,
      confidence: confidence ?? null,
      input_type: inputType,
    })
  } catch (err) {
    console.error('[calling/gather] transcript log error:', err)
  }
}

// Safe JSON stringify for use in raw SQL JSONB concat (escapes single quotes)
function toJsonbSafe(obj: unknown): string {
  return JSON.stringify(obj).replace(/'/g, "''")
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const digits = formData.get('Digits') as string | null
  const speech = (formData.get('SpeechResult') as string | null)?.trim() || null
  const confidence = formData.get('Confidence')
    ? parseFloat(formData.get('Confidence') as string)
    : null

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId') // supplier_calls.id (legacy vendor availability)
  const aiCallId = searchParams.get('aiCallId') // ai_calls.id (all new roles)
  const step = parseInt(searchParams.get('step') ?? '1', 10)
  const role = searchParams.get('role') ?? 'vendor_availability'

  const db: any = createAdminClient()

  if (role === 'vendor_delivery')
    return handleVendorDelivery(db, aiCallId, step, speech, digits, confidence)
  if (role === 'venue_confirmation')
    return handleVenueConfirmation(db, aiCallId, step, speech, digits, confidence)
  if (role === 'inbound_vendor_callback')
    return handleInboundVendorCallback(db, aiCallId, step, speech, digits, confidence)
  if (role === 'inbound_unknown') return handleInboundUnknown(db, aiCallId, speech)

  // Default: vendor_availability
  return handleVendorAvailability(db, callId, aiCallId, step, speech, digits, confidence)
}

// ---------------------------------------------------------------------------
// vendor_availability
// ---------------------------------------------------------------------------

async function handleVendorAvailability(
  db: any,
  callId: string | null,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null
): Promise<NextResponse> {
  // If no callId but we have aiCallId, look up a recent unanswered supplier_call
  // for this vendor (happens when a vendor calls back inbound).
  if (!callId && aiCallId) {
    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, vendor_id, contact_phone')
      .eq('id', aiCallId)
      .maybeSingle()

    if (aiCall?.vendor_id) {
      const { data: pendingCall } = await db
        .from('supplier_calls')
        .select('id')
        .eq('chef_id', aiCall.chef_id)
        .eq('vendor_id', aiCall.vendor_id)
        .in('status', ['no_answer', 'busy', 'queued'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (pendingCall) callId = pendingCall.id
    }

    // If still no callId, create a new supplier_calls record for this inbound callback
    if (!callId && aiCall) {
      // Look up vendor name and phone for the NOT NULL constraints
      let vendorName = 'Inbound caller'
      let vendorPhone = aiCall.contact_phone || ''
      if (aiCall.vendor_id) {
        const { data: vendor } = await db
          .from('vendors')
          .select('name, phone')
          .eq('id', aiCall.vendor_id)
          .maybeSingle()
        if (vendor) {
          vendorName = vendor.name || vendorName
          vendorPhone = vendor.phone || vendorPhone
        }
      }
      const { data: newCall } = await db
        .from('supplier_calls')
        .insert({
          chef_id: aiCall.chef_id,
          vendor_id: aiCall.vendor_id ?? null,
          vendor_name: vendorName,
          vendor_phone: vendorPhone,
          ingredient_name: 'Inbound callback',
          status: 'in_progress',
          ai_call_id: aiCallId,
        })
        .select('id')
        .single()
      if (newCall) callId = newCall.id
    }
  }

  if (!callId) {
    return closingTwiml('Thanks so much for your time. Have a great day!')
  }

  if (step === 2) {
    const priceQuoted = speech ? extractPrice(speech) : null
    const quantityAvailable = speech ? extractQuantity(speech) : null
    const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    const { data: callRecord } = await db
      .from('supplier_calls')
      .update({
        price_quoted: priceQuoted,
        quantity_available: quantityAvailable,
        speech_transcript: speech,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select('chef_id, vendor_id, vendor_name, ingredient_name, result')
      .single()

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch(() => {})
    }

    if (callRecord && priceQuoted && callRecord.vendor_id) {
      try {
        const priceCents = parsePriceToCents(priceQuoted)
        const unit = extractUnit(speech || '') || 'each'
        if (priceCents !== null) {
          await db.from('vendor_price_points').insert({
            chef_id: callRecord.chef_id,
            vendor_id: callRecord.vendor_id,
            item_name: callRecord.ingredient_name,
            price_cents: priceCents,
            unit,
            notes: `AI call: "${speech}"`,
            recorded_at: new Date().toISOString().slice(0, 10),
          })
        }
      } catch (err) {
        console.error('[calling/gather] vendor_price_points error:', err)
      }
    }

    if (callRecord) {
      try {
        await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
          callId,
          aiCallId,
          vendorId: callRecord.vendor_id,
          vendorName: callRecord.vendor_name,
          ingredientName: callRecord.ingredient_name,
          result: callRecord.result,
          status: 'completed',
          priceQuoted,
          quantityAvailable,
        })
      } catch (err) {
        console.error('[calling/gather] broadcast error (step 2):', err)
      }
    }

    const closing =
      priceQuoted || quantityAvailable
        ? 'Perfect, got all of that. Thanks so much, really appreciate it. Have a great day!'
        : "Got it, that's really helpful. Thanks a lot, take care!"
    return closingTwiml(closing)
  }

  // Step 1
  const result = resolveAvailability(digits, speech)
  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'
  if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

  if (result === 'yes') {
    await db
      .from('supplier_calls')
      .update({ result: 'yes', updated_at: new Date().toISOString() })
      .eq('id', callId)
    const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callId)}&step=2&role=vendor_availability${aiCallId ? `&aiCallId=${encodeURIComponent(aiCallId)}` : ''}`
    return twimlResponse(buildAvailabilityStep2Twiml(gatherAction))
  }

  if (result === 'no') {
    const { data: callRecord } = await db
      .from('supplier_calls')
      .update({ result: 'no', status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', callId)
      .select('chef_id, vendor_name, ingredient_name')
      .single()

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', aiCallId)
        .catch(() => {})
    }

    if (callRecord) {
      try {
        await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
          callId,
          aiCallId,
          vendorId: callRecord.vendor_id,
          vendorName: callRecord.vendor_name,
          ingredientName: callRecord.ingredient_name,
          result: 'no',
          status: 'completed',
          priceQuoted: null,
          quantityAvailable: null,
        })
      } catch {}
    }
    return closingTwiml(
      'No problem at all, I appreciate you letting me know. Take care, have a good one!'
    )
  }

  await db
    .from('supplier_calls')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', callId)
  return closingTwiml(
    "Sorry, I didn't quite catch that. No worries, thanks so much for picking up!"
  )
}

// ---------------------------------------------------------------------------
// vendor_delivery
// ---------------------------------------------------------------------------

async function handleVendorDelivery(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null
): Promise<NextResponse> {
  if (!aiCallId) return closingTwiml('Thanks for your time, have a great day!')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Merge step-2 contact/notes into extracted_data
    const { data: existingCall } = await db
      .from('ai_calls')
      .select('extracted_data')
      .eq('id', aiCallId)
      .single()
    const existing = (existingCall?.extracted_data as Record<string, any>) ?? {}
    const updatedData = { ...existing, contact_notes: speech }

    await db
      .from('ai_calls')
      .update({
        status: 'completed',
        extracted_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch(() => {})

    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, contact_name, subject')
      .eq('id', aiCallId)
      .single()
    if (aiCall) {
      await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
        aiCallId,
        role: 'vendor_delivery',
        contactName: aiCall.contact_name,
        subject: aiCall.subject,
        status: 'completed',
        extractedData: updatedData,
      }).catch(() => {})
    }
    return closingTwiml(
      "Perfect, that's everything we needed. Thank you so much, we really appreciate it!"
    )
  }

  // Step 1: delivery window
  const timeWindow = speech ? extractTimeWindow(speech) : null
  if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

  // Save step-1 delivery window to extracted_data immediately
  if (timeWindow) {
    await db
      .from('ai_calls')
      .update({ extracted_data: { delivery_window: timeWindow } })
      .eq('id', aiCallId)
      .catch(() => {})
  }

  const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallId)}&step=2&role=vendor_delivery`
  return twimlResponse(buildDeliveryStep2Twiml(gatherAction))
}

// ---------------------------------------------------------------------------
// venue_confirmation
// ---------------------------------------------------------------------------

async function handleVenueConfirmation(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null
): Promise<NextResponse> {
  if (!aiCallId) return closingTwiml('Thanks for your time!')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Merge step-2 kitchen restrictions into extracted_data
    const { data: existingCall } = await db
      .from('ai_calls')
      .select('extracted_data')
      .eq('id', aiCallId)
      .single()
    const existing = (existingCall?.extracted_data as Record<string, any>) ?? {}
    const updatedData = { ...existing, kitchen_notes: speech }

    await db
      .from('ai_calls')
      .update({
        status: 'completed',
        extracted_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch(() => {})

    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, contact_name, subject')
      .eq('id', aiCallId)
      .single()
    if (aiCall) {
      await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
        aiCallId,
        role: 'venue_confirmation',
        contactName: aiCall.contact_name,
        subject: aiCall.subject,
        status: 'completed',
        extractedData: updatedData,
      }).catch(() => {})
    }
    return closingTwiml(
      "Great, we've got everything we need. Really appreciate your help, see you on the day!"
    )
  }

  // Step 1: access time + parking
  const timeWindow = speech ? extractTimeWindow(speech) : null
  if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

  // Save step-1 access window to extracted_data immediately
  if (timeWindow) {
    await db
      .from('ai_calls')
      .update({ extracted_data: { access_window: timeWindow } })
      .eq('id', aiCallId)
      .catch(() => {})
  }

  const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallId)}&step=2&role=venue_confirmation`
  return twimlResponse(buildVenueStep2Twiml(gatherAction))
}

// ---------------------------------------------------------------------------
// inbound_vendor_callback
// ---------------------------------------------------------------------------

async function handleInboundVendorCallback(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null
): Promise<NextResponse> {
  if (!aiCallId) return closingTwiml('No worries, sorry to bother you. Have a great day!')

  const isConfirm =
    digits === '1' || (speech && YES_WORDS.some((w) => speech.toLowerCase().includes(w)))

  if (isConfirm) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, 'speech', confidence)

    // Pivot into availability check
    const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallId)}&step=1&role=vendor_availability`
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Perfect, thanks for calling back. Do you have the item in stock? Just say yes or no, or press 1 for yes and 2 for no.</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${gatherAction}" method="POST" hints="yes, yeah, we do, absolutely, no, nope, out of stock" enhanced="true"/>
  <Hangup/>
</Response>`)
  }

  return closingTwiml('No worries at all, sorry for the confusion. Have a great day!')
}

// ---------------------------------------------------------------------------
// inbound_unknown
// ---------------------------------------------------------------------------

async function handleInboundUnknown(
  db: any,
  aiCallId: string | null,
  speech: string | null
): Promise<NextResponse> {
  if (aiCallId && speech) {
    await logTranscript(db, aiCallId, 1, 'caller', speech, 'speech', null)

    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, contact_phone, contact_name')
      .eq('id', aiCallId)
      .single()

    await db
      .from('ai_calls')
      .update({
        status: 'completed',
        full_transcript: speech,
        extracted_data: { message: speech },
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch(() => {})

    if (aiCall) {
      // Surface message in quick notes so chef sees it without visiting Call Sheet
      const callerLabel = aiCall.contact_name || aiCall.contact_phone || 'Unknown caller'
      await db
        .from('chef_quick_notes')
        .insert({
          chef_id: aiCall.chef_id,
          text: `Inbound call from ${callerLabel}: "${speech}"`,
        })
        .catch(() => {})

      await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
        aiCallId,
        role: 'inbound_unknown',
        status: 'completed',
        callerPhone: aiCall.contact_phone,
        message: speech,
      }).catch(() => {})
    }
  }
  return closingTwiml(
    "Got it, thank you. We'll make sure someone gets back to you shortly. Have a great day!"
  )
}
