/**
 * Role Handlers - Gather-step handler functions for new AI calling roles
 *
 * Each handler manages the multi-step conversation flow for a specific type of call.
 * Called from the main app/api/calling/gather/route.ts for modularity.
 *
 * Roles handled:
 *   staff_dispatch       - check staff availability, confirm rate and transportation
 *   equipment_rental     - check equipment availability, get pricing and logistics
 *   venue_scout          - learn about kitchen setup, parking, and restrictions
 *   vendor_onboarding    - establish new vendor relationship (3 steps)
 *   vendor_feedback      - relay feedback and ask about supply consistency
 *   price_check          - systematic price intelligence gathering
 *   phone_tree_navigation - IVR/phone tree navigation, then hand off to actual role
 */

import { NextResponse } from 'next/server'
import {
  twimlResponse,
  closingTwiml,
  speak,
  sayElement,
  DEFAULT_VOICE,
  type SpeakPart,
} from './voice-helpers'
import { getCallScript, buildStepTwiml, buildDisclosureTwiml } from './call-scripts'
import {
  detectIVRMenu,
  decideAction,
  createNavigationState,
  updateNavigationState,
  buildNavigationTwiml,
  detectHumanPickup,
  type NavigationState,
} from './phone-tree-navigator'

const APP_URL = (process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com').replace(/\/+$/, '')

// ---------------------------------------------------------------------------
// Yes/No resolution (shared across handlers)
// ---------------------------------------------------------------------------

const YES_WORDS = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'absolutely',
  'correct',
  'sure',
  'affirmative',
  'definitely',
  'of course',
  'certainly',
  'available',
  'i can',
  'we do',
  'we can',
  'i am',
  'that works',
]
const NO_WORDS = [
  'no',
  'nope',
  'nah',
  'not available',
  'unavailable',
  'busy',
  'booked',
  'cannot',
  "can't",
  "don't have",
  'sorry',
  'not right now',
  'not possible',
  'negative',
]

function resolveYesNo(speech: string | null, digits: string | null): 'yes' | 'no' | null {
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
// Price extraction (same patterns as gather route)
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
        const isTens = majorNum % 10 === 0 && majorNum >= 20
        const isUnits = minorNum >= 1 && minorNum <= 9
        if (isTens && isUnits) return `$${majorNum + minorNum}`
        return `$${majorNum}.${String(minorNum).padStart(2, '0')}`
      }
      return `$${majorNum}`
    }
  }

  // Bare digit with unit: "45 a pound"
  const bareDigitWithUnit = new RegExp(
    `\\b(\\d+(?:\\.\\d{1,2})?)\\s*(?:a|per|/)\\s*${UNIT_WORDS}`,
    'i'
  )
  const m4 = speech.match(bareDigitWithUnit)
  if (m4) return `$${m4[1]}`

  return null
}

// ---------------------------------------------------------------------------
// Transcript logging helper
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
    console.error('[role-handlers] transcript log error:', err)
  }
}

// ---------------------------------------------------------------------------
// Broadcast helper (import from realtime)
// ---------------------------------------------------------------------------

import { broadcast } from '@/lib/realtime/broadcast'

function broadcastCallResult(aiCallId: string | null, role: string, data: Record<string, any>) {
  if (!aiCallId) return
  broadcast(`ai_calls:${aiCallId}`, 'call_result', { role, ...data })
}

// ---------------------------------------------------------------------------
// Gather URL builder
// ---------------------------------------------------------------------------

function gatherUrl(
  role: string,
  aiCallId: string | null,
  step: number,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams({ role, step: String(step) })
  if (aiCallId) params.set('aiCallId', aiCallId)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v)
  }
  return `${APP_URL}/api/calling/gather?${params.toString()}`
}

// ---------------------------------------------------------------------------
// 1. Staff Dispatch
// ---------------------------------------------------------------------------

export async function handleStaffDispatch(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('staff_dispatch')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    const answer = resolveYesNo(speech, digits)

    if (answer === 'no') {
      // Not available. Mark completed and broadcast.
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'not_available',
            extracted_data: { available: false },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] staff_dispatch step1 no update failed:', err)
          })
      }
      broadcastCallResult(aiCallId, 'staff_dispatch', { available: false })
      return twimlResponse(buildDisclosureTwiml(script, 'notAvailable', params))
    }

    if (answer === 'yes') {
      // Proceed to step 2 (rate and transportation)
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            extracted_data: { available: true },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] staff_dispatch step1 yes update failed:', err)
          })
      }
      const nextUrl = gatherUrl('staff_dispatch', aiCallId, 2, params)
      return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
    }

    // Could not parse. Retry once, then close.
    const retry = parseInt(params.retry ?? '0', 10)
    if (retry < 1) {
      const retryUrl = gatherUrl('staff_dispatch', aiCallId, 1, { ...params, retry: '1' })
      const callStep = script.steps[0]
      if (callStep?.followUpPrompt) {
        const ssml = speak(callStep.followUpPrompt)
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
      }
    }

    // Timeout. Close politely.
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'timeout',
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch(() => {})
    }
    return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Extract rate and transportation info from freeform speech
    const rateConfirmed = speech ?? 'confirmed'
    const transportLower = (speech ?? '').toLowerCase()
    let transportation = 'self'
    if (
      transportLower.includes('ride') ||
      transportLower.includes('pick') ||
      transportLower.includes('need a')
    ) {
      transportation = 'needs_ride'
    }

    const extractedData = {
      available: true,
      rate_confirmed: rateConfirmed,
      transportation,
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] staff_dispatch step2 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'staff_dispatch', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 2. Equipment Rental
// ---------------------------------------------------------------------------

export async function handleEquipmentRental(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('equipment_rental')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    const answer = resolveYesNo(speech, digits)

    if (answer === 'no') {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'not_available',
            extracted_data: { available: false },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] equipment_rental step1 no update failed:', err)
          })
      }
      broadcastCallResult(aiCallId, 'equipment_rental', { available: false })
      return twimlResponse(buildDisclosureTwiml(script, 'notAvailable', params))
    }

    if (answer === 'yes') {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            extracted_data: { available: true },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] equipment_rental step1 yes update failed:', err)
          })
      }
      const nextUrl = gatherUrl('equipment_rental', aiCallId, 2, params)
      return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
    }

    // Retry once on unparseable response
    const retry = parseInt(params.retry ?? '0', 10)
    if (retry < 1) {
      const retryUrl = gatherUrl('equipment_rental', aiCallId, 1, { ...params, retry: '1' })
      const callStep = script.steps[0]
      if (callStep?.followUpPrompt) {
        const ssml = speak(callStep.followUpPrompt)
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech dtmf" timeout="12" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
      }
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'timeout',
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch(() => {})
    }
    return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Extract pricing, pickup/return times, deposit from freeform speech
    const rentalPrice = speech ? extractPrice(speech) : null
    const pickupTime = extractTimeReference(speech, 'pickup')
    const returnTime = extractTimeReference(speech, 'return')
    const deposit = extractDeposit(speech)

    const extractedData = {
      available: true,
      rental_price: rentalPrice ?? speech ?? 'see transcript',
      pickup_time: pickupTime ?? 'not specified',
      return_time: returnTime ?? 'not specified',
      deposit: deposit ?? 'not specified',
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] equipment_rental step2 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'equipment_rental', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 3. Venue Scout
// ---------------------------------------------------------------------------

export async function handleVenueScout(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('venue_scout')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    if (!speech) {
      // Timeout on freeform, retry once
      const retry = parseInt(params.retry ?? '0', 10)
      if (retry < 1) {
        const retryUrl = gatherUrl('venue_scout', aiCallId, 1, { ...params, retry: '1' })
        const callStep = script.steps[0]
        if (callStep?.followUpPrompt) {
          const ssml = speak(callStep.followUpPrompt)
          return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech" timeout="15" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
        }
      }
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'timeout',
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch(() => {})
      }
      return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
    }

    // Store partial kitchen description, proceed to step 2
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          extracted_data: { kitchen_description: speech },
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] venue_scout step1 update failed:', err)
        })
    }

    const nextUrl = gatherUrl('venue_scout', aiCallId, 2, params)
    return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Merge parking and restrictions into extracted_data
    // Fetch existing extracted_data first
    let existingData: Record<string, any> = {}
    if (aiCallId) {
      const { data: aiCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .maybeSingle()
      if (aiCall?.extracted_data) existingData = aiCall.extracted_data
    }

    const extractedData = {
      ...existingData,
      parking: speech ?? 'not specified',
      restrictions: speech ?? 'not specified',
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] venue_scout step2 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'venue_scout', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 4. Vendor Onboarding (3-step)
// ---------------------------------------------------------------------------

export async function handleVendorOnboarding(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('vendor_onboarding')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    const answer = resolveYesNo(speech, digits)

    if (answer === 'no') {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'not_available',
            extracted_data: { carries_item: false },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] vendor_onboarding step1 no update failed:', err)
          })
      }
      broadcastCallResult(aiCallId, 'vendor_onboarding', { carries_item: false })
      return twimlResponse(buildDisclosureTwiml(script, 'notAvailable', params))
    }

    if (answer === 'yes') {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            extracted_data: { carries_item: true },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] vendor_onboarding step1 yes update failed:', err)
          })
      }
      const nextUrl = gatherUrl('vendor_onboarding', aiCallId, 2, params)
      return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
    }

    // Retry
    const retry = parseInt(params.retry ?? '0', 10)
    if (retry < 1) {
      const retryUrl = gatherUrl('vendor_onboarding', aiCallId, 1, { ...params, retry: '1' })
      const callStep = script.steps[0]
      if (callStep?.followUpPrompt) {
        const ssml = speak(callStep.followUpPrompt)
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech" timeout="15" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
      }
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'timeout',
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch(() => {})
    }
    return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    if (!speech) {
      // Timeout, close politely
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'timeout',
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch(() => {})
      }
      return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
    }

    // Store partial data: min order, delivery/pickup, lead time
    let existingData: Record<string, any> = {}
    if (aiCallId) {
      const { data: aiCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .maybeSingle()
      if (aiCall?.extracted_data) existingData = aiCall.extracted_data
    }

    const deliveryLower = speech.toLowerCase()
    let deliveryMethod = 'unknown'
    if (deliveryLower.includes('deliver')) deliveryMethod = 'delivery'
    else if (deliveryLower.includes('pickup') || deliveryLower.includes('pick up'))
      deliveryMethod = 'pickup'
    else if (deliveryLower.includes('both')) deliveryMethod = 'both'

    const updatedData = {
      ...existingData,
      min_order: speech,
      delivery_or_pickup: deliveryMethod,
      lead_time: speech,
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          extracted_data: updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] vendor_onboarding step2 update failed:', err)
        })
    }

    // Proceed to step 3
    const nextUrl = gatherUrl('vendor_onboarding', aiCallId, 3, params)
    return twimlResponse(buildStepTwiml(script, 3, params, nextUrl))
  }

  if (step === 3) {
    if (speech) await logTranscript(db, aiCallId, 3, 'caller', speech, inputType as any, confidence)

    // Merge ordering method and payment terms
    let existingData: Record<string, any> = {}
    if (aiCallId) {
      const { data: aiCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .maybeSingle()
      if (aiCall?.extracted_data) existingData = aiCall.extracted_data
    }

    // Detect ordering method
    const methodLower = (speech ?? '').toLowerCase()
    let orderingMethod = 'unknown'
    if (methodLower.includes('phone') || methodLower.includes('call')) orderingMethod = 'phone'
    else if (methodLower.includes('email') || methodLower.includes('e-mail'))
      orderingMethod = 'email'
    else if (
      methodLower.includes('online') ||
      methodLower.includes('website') ||
      methodLower.includes('web')
    )
      orderingMethod = 'online'

    const extractedData = {
      ...existingData,
      ordering_method: orderingMethod,
      payment_terms: speech ?? 'not specified',
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] vendor_onboarding step3 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'vendor_onboarding', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 5. Vendor Feedback
// ---------------------------------------------------------------------------

export async function handleVendorFeedback(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('vendor_feedback')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    if (!speech) {
      // No response to feedback delivery. Retry once.
      const retry = parseInt(params.retry ?? '0', 10)
      if (retry < 1) {
        const retryUrl = gatherUrl('vendor_feedback', aiCallId, 1, { ...params, retry: '1' })
        const callStep = script.steps[0]
        if (callStep?.followUpPrompt) {
          const ssml = speak(callStep.followUpPrompt)
          return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
        }
      }
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'timeout',
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch(() => {})
      }
      return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
    }

    // Store vendor response, proceed to step 2
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          extracted_data: { vendor_response: speech },
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] vendor_feedback step1 update failed:', err)
        })
    }

    const nextUrl = gatherUrl('vendor_feedback', aiCallId, 2, params)
    return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Merge supply info into extracted_data
    let existingData: Record<string, any> = {}
    if (aiCallId) {
      const { data: aiCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .maybeSingle()
      if (aiCall?.extracted_data) existingData = aiCall.extracted_data
    }

    const extractedData = {
      ...existingData,
      supply_info: speech ?? 'not specified',
    }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] vendor_feedback step2 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'vendor_feedback', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 6. Price Check
// ---------------------------------------------------------------------------

export async function handlePriceCheck(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const script = getCallScript('price_check')
  if (!script) return closingTwiml('Sorry, something went wrong. Goodbye.')

  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'

  if (step === 1) {
    if (speech) await logTranscript(db, aiCallId, 1, 'caller', speech, inputType as any, confidence)

    if (!speech) {
      const retry = parseInt(params.retry ?? '0', 10)
      if (retry < 1) {
        const retryUrl = gatherUrl('price_check', aiCallId, 1, { ...params, retry: '1' })
        const callStep = script.steps[0]
        if (callStep?.followUpPrompt) {
          const ssml = speak(callStep.followUpPrompt)
          return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayElement(ssml)}
  <Gather input="speech" timeout="12" speechTimeout="auto" action="${retryUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
  </Gather>
  ${sayElement(speak(script.closingMessages.timeout))}
  <Hangup/>
</Response>`)
        }
      }
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'timeout',
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch(() => {})
      }
      return twimlResponse(buildDisclosureTwiml(script, 'timeout', params))
    }

    // Extract price from speech
    const price = extractPrice(speech)
    const item1 = params.item1 ?? 'item'

    const prices: Record<string, string> = {}
    if (price) {
      prices[item1] = price
    } else {
      // Store raw speech as price info if we cannot parse a specific price
      prices[item1] = speech
    }

    // If there are more items (item2, item3), proceed to step 2
    if (params.item2) {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            extracted_data: { prices },
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch((err: unknown) => {
            console.error('[role-handlers] price_check step1 update failed:', err)
          })
      }
      const nextUrl = gatherUrl('price_check', aiCallId, 2, params)
      return twimlResponse(buildStepTwiml(script, 2, params, nextUrl))
    }

    // Single item, done.
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: { prices },
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] price_check step1 single update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'price_check', { prices })
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  if (step === 2) {
    if (speech) await logTranscript(db, aiCallId, 2, 'caller', speech, inputType as any, confidence)

    // Fetch existing prices from step 1
    let existingData: Record<string, any> = {}
    if (aiCallId) {
      const { data: aiCall } = await db
        .from('ai_calls')
        .select('extracted_data')
        .eq('id', aiCallId)
        .maybeSingle()
      if (aiCall?.extracted_data) existingData = aiCall.extracted_data
    }

    const prices: Record<string, string> = existingData.prices ?? {}

    if (speech) {
      // Try to extract multiple prices from the response
      const allPrices = extractAllPrices(speech)
      const item2 = params.item2 ?? 'item2'
      const item3 = params.item3 ?? 'item3'

      if (allPrices.length >= 2) {
        prices[item2] = allPrices[0]
        prices[item3] = allPrices[1]
      } else if (allPrices.length === 1) {
        prices[item2] = allPrices[0]
        prices[item3] = speech
      } else {
        // Store raw speech for both
        prices[item2] = speech
        if (params.item3) prices[item3] = speech
      }
    }

    const extractedData = { prices }

    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'confirmed',
          extracted_data: extractedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch((err: unknown) => {
          console.error('[role-handlers] price_check step2 update failed:', err)
        })
    }

    broadcastCallResult(aiCallId, 'price_check', extractedData)
    return twimlResponse(buildDisclosureTwiml(script, 'success', params))
  }

  return closingTwiml('Thanks for your time. Have a great day.')
}

// ---------------------------------------------------------------------------
// 7. Phone Tree Navigation
// ---------------------------------------------------------------------------

export async function handlePhoneTreeNavigation(
  db: any,
  aiCallId: string | null,
  step: number,
  speech: string | null,
  digits: string | null,
  confidence: number | null,
  params: Record<string, string>
): Promise<NextResponse> {
  const inputType = digits ? 'dtmf' : speech ? 'speech' : 'timeout'
  if (speech)
    await logTranscript(db, aiCallId, step, 'caller', speech, inputType as any, confidence)

  // Deserialize navigation state from params
  let navState: NavigationState
  if (params.navState) {
    try {
      navState = JSON.parse(params.navState)
    } catch {
      navState = createNavigationState()
    }
  } else {
    navState = createNavigationState()
  }

  const ingredientQuery = params.ingredientQuery ?? params.item1 ?? ''
  const targetRole = params.targetRole ?? 'vendor_availability'

  // If no speech (timeout), wait and retry
  if (!speech && !digits) {
    if (navState.navigationAttempts >= navState.maxAttempts) {
      if (aiCallId) {
        await db
          .from('ai_calls')
          .update({
            status: 'completed',
            result: 'ivr_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', aiCallId)
          .catch(() => {})
      }
      return closingTwiml('Sorry, having trouble reaching someone. Will try again later.')
    }

    // Wait and gather again
    const updatedState = { ...navState, navigationAttempts: navState.navigationAttempts + 1 }
    const nextParams = { ...params, navState: JSON.stringify(updatedState) }
    const nextUrl = gatherUrl('phone_tree_navigation', aiCallId, step + 1, nextParams)
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="5"/>
  <Gather input="speech dtmf" timeout="15" speechTimeout="auto" action="${nextUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}"></Say>
  </Gather>
  <Pause length="5"/>
  <Redirect method="POST">${nextUrl.replace(/&/g, '&amp;')}</Redirect>
</Response>`)
  }

  const speechText = speech ?? ''

  // Check if a human has picked up
  if (detectHumanPickup(speechText)) {
    // Human detected. Transition to the target role handler.
    navState.humanDetected = true

    if (aiCallId) {
      await logTranscript(
        db,
        aiCallId,
        step,
        'ai',
        `[IVR navigation complete. Human detected. Transitioning to ${targetRole}.]`,
        'ai_prompt'
      )
    }

    // Build a gather URL for the target role at step 1
    const targetParams = { ...params }
    delete targetParams.navState
    delete targetParams.targetRole
    const targetUrl = gatherUrl(targetRole, aiCallId, 1, targetParams)

    // Re-introduce ourselves to the human and gather their response
    const script = getCallScript(
      targetRole === 'vendor_availability' ? 'sourcing_availability' : targetRole
    )
    if (script && script.steps[0]) {
      return twimlResponse(buildStepTwiml(script, 1, targetParams, targetUrl))
    }

    // Fallback if no script found
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" timeout="12" speechTimeout="auto" action="${targetUrl.replace(/&/g, '&amp;')}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Hi, thanks for picking up. I have a quick question about availability.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">Sorry, missed you there. We will try again later.</Say>
  <Hangup/>
</Response>`)
  }

  // Use the phone-tree-navigator to decide action
  const action = decideAction(speechText, ingredientQuery, navState)
  const updatedState = updateNavigationState(navState, action)

  // Log the navigation decision
  if (aiCallId) {
    await logTranscript(db, aiCallId, step, 'ai', `[Navigation: ${action.reason}]`, 'ai_prompt')
  }

  // If hangup, mark as failed
  if (action.action === 'hangup') {
    if (aiCallId) {
      await db
        .from('ai_calls')
        .update({
          status: 'completed',
          result: 'ivr_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', aiCallId)
        .catch(() => {})
    }
    return closingTwiml(
      action.message ?? 'Sorry, having trouble reaching the right department. Will try again later.'
    )
  }

  // Build next gather URL with updated state
  const nextParams = { ...params, navState: JSON.stringify(updatedState) }
  const nextUrl = gatherUrl('phone_tree_navigation', aiCallId, step + 1, nextParams)

  // Generate TwiML from the navigator
  const twiml = buildNavigationTwiml(action, nextUrl)
  return twimlResponse(twiml)
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function extractTimeReference(speech: string | null, type: 'pickup' | 'return'): string | null {
  if (!speech) return null
  const lower = speech.toLowerCase()

  // Look for time patterns near the type keyword
  const typeKeywords =
    type === 'pickup'
      ? ['pickup', 'pick up', 'pick it up', 'ready']
      : ['return', 'bring back', 'drop off', 'due back']

  // General time extraction
  const timePattern = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/gi
  const times = Array.from(lower.matchAll(timePattern)).map((m) => m[0])

  if (times.length === 0) {
    // Check for period words
    const periods = lower.match(/\b(morning|afternoon|evening|early|late|day before|day of)\b/i)
    if (periods) return periods[0]
    return null
  }

  // If type keyword is present, return the time closest to it
  for (const kw of typeKeywords) {
    const kwIdx = lower.indexOf(kw)
    if (kwIdx >= 0) {
      // Find the closest time to this keyword
      let closest: string | null = null
      let closestDist = Infinity
      for (const t of times) {
        const tIdx = lower.indexOf(t)
        const dist = Math.abs(tIdx - kwIdx)
        if (dist < closestDist) {
          closestDist = dist
          closest = t
        }
      }
      if (closest) return closest
    }
  }

  // If multiple times, return first for pickup, last for return
  if (type === 'pickup' && times.length > 0) return times[0]
  if (type === 'return' && times.length > 0) return times[times.length - 1]

  return null
}

function extractDeposit(speech: string | null): string | null {
  if (!speech) return null
  const lower = speech.toLowerCase()

  // Look for deposit mentions
  if (!lower.includes('deposit')) return null

  // Try to find a dollar amount near "deposit"
  const depositIdx = lower.indexOf('deposit')
  const pricePattern = /\$[\d,.]+|\d+\s*(?:dollars?|bucks?)/gi
  const prices = Array.from(lower.matchAll(pricePattern))

  let closest: string | null = null
  let closestDist = Infinity
  for (const match of prices) {
    const dist = Math.abs((match.index ?? 0) - depositIdx)
    if (dist < closestDist) {
      closestDist = dist
      closest = match[0]
    }
  }

  if (closest) return closest

  // Check for "no deposit" or similar
  if (lower.includes('no deposit')) return 'none'

  return 'required (see transcript)'
}

function extractAllPrices(speech: string): string[] {
  const results: string[] = []

  // Match $X.XX patterns
  const dollarPattern =
    /\$[\d,.]+(?:\s*(?:a|per|\/)\s*(?:pound|lb|lbs|ounce|oz|piece|each|unit|item|dozen|case|box|bag|gallon|quart|pint|liter|kilogram|kg))?/gi
  const matches = speech.match(dollarPattern)
  if (matches) {
    for (const m of matches) results.push(m.trim())
  }

  // Match "X dollars" patterns
  if (results.length === 0) {
    const wordPattern = /\b(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?)(?:\s+(?:and\s+)?(\d+)\s*cents?)?/gi
    let m: RegExpExecArray | null
    while ((m = wordPattern.exec(speech)) !== null) {
      const dollars = m[1]
      const cents = m[2] ? `.${m[2].padStart(2, '0')}` : ''
      results.push(`$${dollars}${cents}`)
    }
  }

  return results
}
