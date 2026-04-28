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
import { validateTwilioWebhook } from '@/lib/calling/twilio-webhook-auth'
import {
  twimlResponse,
  closingTwiml,
  buildAvailabilityStep2Twiml,
  buildDeliveryStep2Twiml,
  buildVenueStep2Twiml,
  DEFAULT_VOICE,
} from '@/lib/calling/voice-helpers'
import { analyzeVoiceAffect } from '@/lib/affective/voice-affect'

// Q51: Strip trailing slash - same vulnerability as Q50 in twilio-webhook-auth.
// Trailing slash on NEXTAUTH_URL produces double-slash callback URLs that break
// Twilio signature validation on every subsequent callback.
const APP_URL = (process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com').replace(/\/+$/, '')

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
const AI_CALL_OPT_OUT_ACTION = 'ai_call_opt_out_requested'
const AI_CALL_OPT_OUT_PHRASES = [
  'stop calling',
  'do not call',
  "don't call",
  'dont call',
  'take me off',
  'take us off',
  'remove me',
  'remove us',
  'no ai calls',
  'no automated calls',
]

function hasAiCallOptOutRequest(speech: string | null): boolean {
  if (!speech) return false
  const lower = speech.toLowerCase()
  return AI_CALL_OPT_OUT_PHRASES.some((phrase) => lower.includes(phrase))
}

function isOutboundCallRole(role: string): boolean {
  return [
    'vendor_availability',
    'vendor_delivery',
    'venue_confirmation',
    'equipment_rental',
  ].includes(role)
}

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
    const majorNum = parseInt(wordNumbers[m3[1].toLowerCase()] ?? '0', 10)
    const minorNum = m3[2] ? parseInt(wordNumbers[m3[2].toLowerCase()] ?? '0', 10) : null
    if (majorNum) {
      if (minorNum !== null) {
        // "forty five" = compound number (40+5=45), not dollars.cents
        const isTens = majorNum % 10 === 0 && majorNum >= 20
        const isUnits = minorNum >= 1 && minorNum <= 9
        if (isTens && isUnits) return `$${majorNum + minorNum}`
        return `$${majorNum}.${String(minorNum).padStart(2, '0')}`
      }
      return `$${majorNum}`
    }
  }

  // "45 a pound", "45/lb", "45 per case" - bare digit with unit, no currency word
  const bareDigitWithUnit = new RegExp(
    `\\b(\\d+(?:\\.\\d{1,2})?)\\s*(?:a|per|/)\\s*${UNIT_WORDS}`,
    'i'
  )
  const m4 = speech.match(bareDigitWithUnit)
  if (m4) return `$${m4[1]}`

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

async function handleAiCallOptOut(params: {
  db: any
  callId: string | null
  aiCallId: string | null
  role: string
  speech: string
  confidence: number | null
}): Promise<NextResponse> {
  const { db, callId, aiCallId, role, speech, confidence } = params
  await logTranscript(db, aiCallId, 1, 'caller', speech, 'speech', confidence)

  let aiCall: any = null
  if (aiCallId) {
    try {
      const { data } = await db
        .from('ai_calls')
        .select(
          'chef_id, contact_phone, contact_name, subject, action_log, extracted_data, full_transcript'
        )
        .eq('id', aiCallId)
        .single()
      aiCall = data

      const existingLog = Array.isArray(aiCall?.action_log) ? aiCall.action_log : []
      const existingData =
        aiCall?.extracted_data && typeof aiCall.extracted_data === 'object'
          ? aiCall.extracted_data
          : {}
      const existingTranscript =
        typeof aiCall?.full_transcript === 'string' && aiCall.full_transcript.trim()
          ? `${aiCall.full_transcript}\n${speech}`
          : speech

      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: null,
          full_transcript: existingTranscript,
          extracted_data: {
            ...existingData,
            ai_call_opt_out: {
              requested: true,
              evidence: speech,
              role,
            },
            ...affectiveAnalysisData({
              transcript: speech,
              role,
              direction: 'outbound',
              confidence,
            }),
          },
          action_log: [
            ...existingLog,
            {
              action: AI_CALL_OPT_OUT_ACTION,
              at: new Date().toISOString(),
              role,
              evidence: speech.slice(0, 500),
            },
          ],
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
    } catch (err) {
      console.error('[calling/gather] ai-call opt-out write failed:', err)
    }
  }

  let supplierCall: any = null
  if (callId) {
    try {
      const { data } = await db
        .from('supplier_calls')
        .update({
          status: 'completed',
          result: null,
          speech_transcript: speech,
          error_message: 'Contact requested no AI assistant calls',
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .select('chef_id, vendor_id, vendor_name, ingredient_name')
        .single()
      supplierCall = data
    } catch (err) {
      console.error('[calling/gather] supplier_calls opt-out write failed:', err)
    }
  }

  if (supplierCall) {
    try {
      await broadcast(`chef-${supplierCall.chef_id}`, 'supplier_call_result', {
        callId,
        aiCallId,
        vendorId: supplierCall.vendor_id,
        vendorName: supplierCall.vendor_name,
        ingredientName: supplierCall.ingredient_name,
        result: null,
        status: 'completed',
        priceQuoted: null,
        quantityAvailable: null,
      })
    } catch (err) {
      console.error('[calling/gather] supplier opt-out broadcast failed:', err)
    }
  } else if (aiCall) {
    try {
      await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
        aiCallId,
        role,
        contactName: aiCall.contact_name,
        subject: aiCall.subject,
        status: 'completed',
        extractedData: {
          ai_call_opt_out: {
            requested: true,
            evidence: speech,
            role,
          },
        },
      })
    } catch (err) {
      console.error('[calling/gather] ai-call opt-out broadcast failed:', err)
    }
  }

  return closingTwiml(
    "Understood. We'll stop AI assistant calls to this number. Thank you for letting me know."
  )
}

function affectiveAnalysisData(params: {
  transcript: string | null
  role: string
  direction?: string | null
  confidence?: number | null
}): Record<string, any> {
  if (!params.transcript) return {}
  return {
    affective_analysis: analyzeVoiceAffect({
      transcript: params.transcript,
      source: 'call',
      role: params.role,
      direction: params.direction ?? null,
      speechConfidence: params.confidence ?? null,
    }),
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const valid = await validateTwilioWebhook(req, formData)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

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
  const retry = parseInt(searchParams.get('retry') ?? '0', 10)

  const db: any = createAdminClient()

  if (speech && isOutboundCallRole(role) && hasAiCallOptOutRequest(speech)) {
    return handleAiCallOptOut({ db, callId, aiCallId, role, speech, confidence })
  }

  if (role === 'vendor_delivery')
    return handleVendorDelivery(db, aiCallId, step, speech, digits, confidence)
  if (role === 'venue_confirmation')
    return handleVenueConfirmation(db, aiCallId, step, speech, digits, confidence)
  if (role === 'inbound_vendor_callback')
    return handleInboundVendorCallback(db, aiCallId, step, speech, digits, confidence)
  if (role === 'inbound_unknown') return handleInboundUnknown(db, aiCallId, speech)

  // Default: vendor_availability
  return handleVendorAvailability(db, callId, aiCallId, step, speech, digits, confidence, retry)
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
  confidence: number | null,
  retry = 0
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
      // Recover ingredient name from the most recent completed/no_answer call for this vendor
      let ingredientName = 'Inbound callback'
      if (aiCall.vendor_id) {
        const { data: priorCall } = await db
          .from('supplier_calls')
          .select('ingredient_name')
          .eq('chef_id', aiCall.chef_id)
          .eq('vendor_id', aiCall.vendor_id)
          .in('status', ['completed', 'no_answer', 'busy'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (priorCall?.ingredient_name && priorCall.ingredient_name !== 'Inbound callback') {
          ingredientName = priorCall.ingredient_name
        }
      }

      const { data: newCall } = await db
        .from('supplier_calls')
        .insert({
          chef_id: aiCall.chef_id,
          vendor_id: aiCall.vendor_id ?? null,
          vendor_name: vendorName,
          vendor_phone: vendorPhone,
          ingredient_name: ingredientName,
          status: 'in_progress',
          ai_call_id: aiCallId,
        })
        .select('id')
        .single()
      if (newCall) {
        callId = newCall.id
        // Fix #8: bi-directional link - ai_calls already has supplier_call_id = null
        // at this point (call was initiated before a supplier_calls record existed).
        // Stamp it so queryAiCallFeedback and call sheet lookups can navigate both ways.
        await db
          .from('ai_calls')
          .update({ supplier_call_id: newCall.id, updated_at: new Date().toISOString() })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error(
              '[calling/gather] ai_calls.supplier_call_id backfill failed - bi-directional link broken:',
              err
            )
          })
      }
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

    // Q57: Guard step-2 supplier_calls write - price/qty data captured by voice
    // but never persisted if this throws. 500 = Twilio retries = call replays.
    let callRecord: any = null
    try {
      const { data } = await db
        .from('supplier_calls')
        .update({
          price_quoted: priceQuoted,
          quantity_available: quantityAvailable,
          speech_transcript: speech,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .select('chef_id, vendor_id, vendor_phone, vendor_name, ingredient_name, result')
        .single()
      callRecord = data
    } catch (err) {
      console.error('[calling/gather] supplier_calls step-2 write failed:', err)
    }

    if (aiCallId) {
      const aiExtracted: Record<string, any> = {}
      if (priceQuoted) aiExtracted.price_quoted = priceQuoted
      if (quantityAvailable) aiExtracted.quantity_available = quantityAvailable
      Object.assign(
        aiExtracted,
        affectiveAnalysisData({
          transcript: speech,
          role: 'vendor_availability',
          direction: 'outbound',
          confidence,
        })
      )
      await db
        .from('ai_calls')
        .update({
          result: callRecord?.result ?? null,
          status: 'completed',
          ...(Object.keys(aiExtracted).length > 0 ? { extracted_data: aiExtracted } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          // CRITICAL: if this write fails, result='yes' is never persisted on ai_calls
          // and the Tier 2 ingredient feedback loop permanently loses this call signal.
          console.error(
            '[calling/gather] ai_calls result/status/extracted_data write failed (step2):',
            err
          )
        })
    }

    // Fix #2: for national directory calls (vendor_id = null), look up a saved
    // vendor by phone so the sentinel write reaches vendor_price_points.
    let effectiveVendorId = callRecord?.vendor_id ?? null
    if (!effectiveVendorId && callRecord?.vendor_phone) {
      try {
        const { data: savedVendor } = await db
          .from('vendors')
          .select('id')
          .eq('chef_id', callRecord.chef_id)
          .eq('phone', callRecord.vendor_phone)
          .maybeSingle()
        if (savedVendor) effectiveVendorId = savedVendor.id
      } catch (err) {
        console.error(
          '[calling/gather] vendor phone lookup for effectiveVendorId failed - sentinel/price write skipped:',
          err
        )
      }
    }

    if (callRecord && effectiveVendorId) {
      const today = (() => {
        const _d = new Date()
        return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
      })()

      // Twilio retry guard: check if a price point already exists for this
      // vendor + ingredient + date before inserting. Prevents duplicates when
      // Twilio retries the webhook due to a slow or non-2xx response.
      let pricePointAlreadyExists = false
      try {
        const { data: existing } = await db
          .from('vendor_price_points')
          .select('id')
          .eq('chef_id', callRecord.chef_id)
          .eq('vendor_id', effectiveVendorId)
          .ilike('item_name', callRecord.ingredient_name)
          .eq('recorded_at', today)
          .limit(1)
          .maybeSingle()
        pricePointAlreadyExists = !!existing
      } catch (err) {
        console.error(
          '[calling/gather] price-point existence check failed - duplicate write guard disabled for this webhook:',
          err
        )
      }

      let actionTaken: string | null = null

      if (!pricePointAlreadyExists && priceQuoted) {
        // Price captured: write a full price point
        try {
          const priceCents = parsePriceToCents(priceQuoted)
          const unit = extractUnit(speech || '') || 'each'
          if (priceCents !== null) {
            await db.from('vendor_price_points').insert({
              chef_id: callRecord.chef_id,
              vendor_id: effectiveVendorId,
              item_name: callRecord.ingredient_name,
              price_cents: priceCents,
              unit,
              notes: `AI call: "${speech}"`,
              recorded_at: today,
            })
            actionTaken = 'vendor_price_point_created'
          }
        } catch (err) {
          console.error('[calling/gather] vendor_price_points (price) error:', err)
        }
      } else if (!pricePointAlreadyExists && callRecord?.result === 'yes') {
        // Availability confirmed but no price given.
        // Write price_cents=1 as a sentinel ("confirmed available, price unknown").
        // This graduates the vendor from Tier 3 to Tier 2 on next resolution query.
        // price_cents=1 is distinguishable from a real price and will not display.
        // The ai_calls.result='yes' query also catches this, but writing here ensures
        // the signal persists beyond the 14-day ai_calls feedback window.
        try {
          await db.from('vendor_price_points').insert({
            chef_id: callRecord.chef_id,
            vendor_id: effectiveVendorId,
            item_name: callRecord.ingredient_name,
            price_cents: 1,
            unit: 'confirmed',
            notes: `AI call: availability confirmed, price not captured`,
            recorded_at: today,
          })
          actionTaken = 'vendor_price_point_created'
        } catch (err) {
          console.error('[calling/gather] vendor_price_points (availability) error:', err)
        }
      } else if (pricePointAlreadyExists) {
        actionTaken = 'vendor_price_point_skipped_duplicate'
      }

      // Record auto-actions in ai_calls.action_log for auditability.
      // Read existing array first so we append rather than overwrite - a single
      // call can have multiple action entries (price + sentinel on separate retries).
      if (aiCallId && actionTaken) {
        try {
          const { data: currentAiCall } = await db
            .from('ai_calls')
            .select('action_log')
            .eq('id', aiCallId)
            .single()
          const existingLog = Array.isArray(currentAiCall?.action_log)
            ? currentAiCall.action_log
            : []
          await db
            .from('ai_calls')
            .update({
              action_log: [
                ...existingLog,
                { action: actionTaken, at: new Date().toISOString(), vendor_id: effectiveVendorId },
              ],
              updated_at: new Date().toISOString(),
            })
            .eq('id', aiCallId)
        } catch (err) {
          console.error('[calling/gather] action_log update error:', err)
        }
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
    // Q54: Guard supplier_calls write - unguarded throw = 500 = Twilio retries
    // every 5 min for 24 hours. Must still proceed to step-2 for price/qty capture.
    try {
      await db
        .from('supplier_calls')
        .update({ result: 'yes', updated_at: new Date().toISOString() })
        .eq('id', callId)
    } catch (err) {
      console.error('[calling/gather] supplier_calls result=yes write failed:', err)
    }
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({ result: 'yes', updated_at: new Date().toISOString() })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          // Critical: if result='yes' write fails, Tier 2 feedback loop silently misses this call
          console.error('[calling/gather] ai_calls result=yes write failed:', err)
        })
    }
    const gatherAction = `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callId)}&step=2&role=vendor_availability${aiCallId ? `&aiCallId=${encodeURIComponent(aiCallId)}` : ''}`
    return twimlResponse(buildAvailabilityStep2Twiml(gatherAction))
  }

  if (result === 'no') {
    // Q55: Guard supplier_calls write - .single() throws on no match, and any
    // DB error = 500 = Twilio retry storm. Must still return closing TwiML.
    let callRecord: any = null
    try {
      const { data } = await db
        .from('supplier_calls')
        .update({ result: 'no', status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', callId)
        .select('chef_id, vendor_name, ingredient_name')
        .single()
      callRecord = data
    } catch (err) {
      console.error('[calling/gather] supplier_calls result=no write failed:', err)
    }

    if (aiCallId) {
      const affectiveData = affectiveAnalysisData({
        transcript: speech,
        role: 'vendor_availability',
        direction: 'outbound',
        confidence,
      })
      await db
        .from('ai_calls')
        .update({
          result: 'no',
          status: 'completed',
          ...(Object.keys(affectiveData).length > 0 ? { extracted_data: affectiveData } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[calling/gather] ai_calls result=no write failed:', err)
        })
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
      } catch (err) {
        console.error('[calling/gather] broadcast error (result=no):', err)
      }
    }
    return closingTwiml(
      'No problem at all, I appreciate you letting me know. Take care, have a good one!'
    )
  }

  // On first timeout (retry=0): re-prompt once with a shorter question.
  // On second timeout (retry=1): close the call.
  if (retry === 0 && callId) {
    const retryAction =
      `${APP_URL}/api/calling/gather?callId=${encodeURIComponent(callId)}&step=1&role=vendor_availability&retry=1` +
      (aiCallId ? `&aiCallId=${encodeURIComponent(aiCallId)}` : '')
    return twimlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response>` +
        `<Say voice="${DEFAULT_VOICE}">Sorry, I didn't quite catch that. Could you say yes if you have it in stock, or no if you don't?</Say>` +
        `<Gather input="speech dtmf" timeout="6" action="${retryAction.replace(/&/g, '&amp;')}" method="POST"></Gather>` +
        `<Hangup/></Response>`
    )
  }

  // Timeout close: mark completed and broadcast so the UI card transitions out of 'calling'.
  // Without the broadcast, the card stays stuck until the Twilio status callback fires.
  // Q56: Guard timeout close write - unguarded throw = 500 = Twilio retry storm.
  let timedOutRecord: any = null
  try {
    const { data } = await db
      .from('supplier_calls')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', callId)
      .select('chef_id, vendor_id, vendor_name, ingredient_name')
      .single()
    timedOutRecord = data
  } catch (err) {
    console.error('[calling/gather] supplier_calls timeout close write failed:', err)
  }

  if (aiCallId) {
    await db
      .from('ai_calls')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] ai_calls timeout status update failed:', err)
      })
  }

  if (timedOutRecord) {
    try {
      await broadcast(`chef-${timedOutRecord.chef_id}`, 'supplier_call_result', {
        callId,
        aiCallId,
        vendorId: timedOutRecord.vendor_id,
        vendorName: timedOutRecord.vendor_name,
        ingredientName: timedOutRecord.ingredient_name,
        result: null,
        status: 'completed',
        priceQuoted: null,
        quantityAvailable: null,
      })
    } catch (err) {
      console.error('[calling/gather] broadcast error (timeout):', err)
    }
  }

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

    // Merge step-2 contact/notes into extracted_data.
    // If the read fails, log it - step-1 delivery_window will be overwritten with
    // just contact_notes and lost permanently. Fall back to empty object.
    let existingCallData: Record<string, any> = {}
    try {
      const { data: existingCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .single()
      existingCallData = (existingCall?.extracted_data as Record<string, any>) ?? {}
    } catch (err) {
      console.error(
        '[calling/gather] vendor_delivery step2 existingCall read failed - step-1 delivery_window lost:',
        err
      )
    }
    const updatedData = {
      ...existingCallData,
      contact_notes: speech,
      ...affectiveAnalysisData({
        transcript: speech,
        role: 'vendor_delivery',
        direction: 'outbound',
        confidence,
      }),
    }

    await db
      .from('ai_calls')
      .update({
        status: 'completed',
        extracted_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] vendor_delivery step2 extracted_data write failed:', err)
      })

    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, contact_name, subject')
      .eq('id', aiCallId)
      .single()
    if (aiCall) {
      try {
        await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
          aiCallId,
          role: 'vendor_delivery',
          contactName: aiCall.contact_name,
          subject: aiCall.subject,
          status: 'completed',
          extractedData: updatedData,
        })
      } catch (err) {
        console.error('[calling/gather] vendor_delivery step2 broadcast failed:', err)
      }
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
      .update({
        extracted_data: {
          delivery_window: timeWindow,
          ...affectiveAnalysisData({
            transcript: speech,
            role: 'vendor_delivery',
            direction: 'outbound',
            confidence,
          }),
        },
      })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] vendor_delivery step1 delivery_window write failed:', err)
      })
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

    // Merge step-2 kitchen restrictions into extracted_data.
    // If the read fails, log it - step-1 access_window will be overwritten with
    // just kitchen_notes and lost permanently. Fall back to empty object.
    let existingVenueData: Record<string, any> = {}
    try {
      const { data: existingCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .single()
      existingVenueData = (existingCall?.extracted_data as Record<string, any>) ?? {}
    } catch (err) {
      console.error(
        '[calling/gather] venue_confirmation step2 existingCall read failed - step-1 access_window lost:',
        err
      )
    }
    const updatedData = {
      ...existingVenueData,
      kitchen_notes: speech,
      ...affectiveAnalysisData({
        transcript: speech,
        role: 'venue_confirmation',
        direction: 'outbound',
        confidence,
      }),
    }

    await db
      .from('ai_calls')
      .update({
        status: 'completed',
        extracted_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] venue_confirmation step2 extracted_data write failed:', err)
      })

    const { data: aiCall } = await db
      .from('ai_calls')
      .select('chef_id, contact_name, subject')
      .eq('id', aiCallId)
      .single()
    if (aiCall) {
      try {
        await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
          aiCallId,
          role: 'venue_confirmation',
          contactName: aiCall.contact_name,
          subject: aiCall.subject,
          status: 'completed',
          extractedData: updatedData,
        })
      } catch (err) {
        console.error('[calling/gather] venue_confirmation step2 broadcast failed:', err)
      }
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
      .update({
        extracted_data: {
          access_window: timeWindow,
          ...affectiveAnalysisData({
            transcript: speech,
            role: 'venue_confirmation',
            direction: 'outbound',
            confidence,
          }),
        },
      })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] venue_confirmation step1 access_window write failed:', err)
      })
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

    // Write the confirmation utterance to full_transcript so it's visible in Call Sheet.
    // Without this, the transcript column stays null even though speech was captured.
    if (speech) {
      await db
        .from('ai_calls')
        .update({
          full_transcript: speech,
          extracted_data: {
            ...affectiveAnalysisData({
              transcript: speech,
              role: 'inbound_vendor_callback',
              direction: 'inbound',
              confidence,
            }),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error(
            '[calling/gather] inbound_vendor_callback full_transcript write failed:',
            err
          )
        })
    }

    // Pivot into availability check
    const gatherAction = `${APP_URL}/api/calling/gather?aiCallId=${encodeURIComponent(aiCallId)}&step=1&role=vendor_availability`
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Perfect, thanks for calling back. Do you have the item in stock? Just say yes or no, or press 1 for yes and 2 for no.</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${gatherAction}" method="POST" hints="yes, yeah, we do, absolutely, no, nope, out of stock" enhanced="true"/>
  <Hangup/>
</Response>`)
  }

  // Vendor declined or wrong number - mark the ai_calls record completed so it
  // doesn't show as permanently in_progress in Call Sheet.
  await db
    .from('ai_calls')
    .update({
      status: 'completed',
      full_transcript: speech || null,
      ...(speech
        ? {
            extracted_data: {
              ...affectiveAnalysisData({
                transcript: speech,
                role: 'inbound_vendor_callback',
                direction: 'inbound',
                confidence,
              }),
            },
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', aiCallId)
    .catch((err: unknown) => {
      console.error('[calling/gather] inbound_vendor_callback decline status write failed:', err)
    })

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
        extracted_data: {
          message: speech,
          ...affectiveAnalysisData({
            transcript: speech,
            role: 'inbound_unknown',
            direction: 'inbound',
          }),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiCallId)
      .catch((err: unknown) => {
        console.error('[calling/gather] inbound_unknown transcript+status write failed:', err)
      })

    if (aiCall) {
      // Surface message in quick notes so chef sees it without visiting Call Sheet
      const callerLabel = aiCall.contact_name || aiCall.contact_phone || 'Unknown caller'
      await db
        .from('chef_quick_notes')
        .insert({
          chef_id: aiCall.chef_id,
          text: `Inbound call from ${callerLabel}: "${speech}"`,
        })
        .catch((err: unknown) => {
          console.error('[calling/gather] inbound_unknown quick_note insert failed:', err)
        })

      // Q58: Guard broadcast - unguarded throw = 500 = Twilio retries,
      // unknown caller hears greeting replayed.
      try {
        await broadcast(`chef-${aiCall.chef_id}`, 'ai_call_result', {
          aiCallId,
          role: 'inbound_unknown',
          status: 'completed',
          callerPhone: aiCall.contact_phone,
          message: speech,
        })
      } catch (err) {
        console.error('[calling/gather] inbound_unknown broadcast failed:', err)
      }
    }
  }
  return closingTwiml(
    "Got it, thank you. We'll make sure someone gets back to you shortly. Have a great day!"
  )
}
