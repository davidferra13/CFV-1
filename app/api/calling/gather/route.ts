/**
 * Gather Endpoint
 *
 * Twilio POSTs here after each gather interaction.
 *
 * Step 1 (step=1 or missing): Resolve yes/no availability from vendor response.
 *   - If yes: update DB, play confirmation, gather price/quantity (step=2).
 *   - If no:  update DB, broadcast result, play closing.
 *   - If unclear: play closing without a result.
 *
 * Step 2 (step=2): Parse price and quantity from free speech.
 *   - Extracts price (e.g. "$4.50 per pound") and quantity (e.g. "3 pounds").
 *   - Updates DB, broadcasts result, plays closing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { broadcast } from '@/lib/realtime/broadcast'

// ---------------------------------------------------------------------------
// Availability resolution - step 1
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
// Price and quantity extraction - step 2
// ---------------------------------------------------------------------------

const UNIT_WORDS =
  '(?:pound|lb|lbs|ounce|oz|piece|each|unit|item|dozen|case|box|bag|gallon|quart|pint|liter|kilogram|kg)'
const PER_UNIT = `(?:\\s*(?:a|per|\\/)\\s*${UNIT_WORDS})?`

function extractPrice(speech: string): string | null {
  // "$4.50", "$12 a pound"
  const dollarSignPattern = new RegExp(`\\$[\\d,.]+${PER_UNIT}`, 'i')
  const dollarSignMatch = speech.match(dollarSignPattern)
  if (dollarSignMatch) return dollarSignMatch[0].trim()

  // "12 dollars", "4 dollars and 50 cents a pound"
  const dollarWordPattern = new RegExp(
    `\\b(\\d+(?:\\.\\d+)?)\\s*(?:dollars?|bucks?)(?:\\s+(?:and\\s+)?(\\d+)\\s*cents?)?${PER_UNIT}`,
    'i'
  )
  const dollarWordMatch = speech.match(dollarWordPattern)
  if (dollarWordMatch) {
    const dollars = dollarWordMatch[1]
    const cents = dollarWordMatch[2] ? `.${dollarWordMatch[2].padStart(2, '0')}` : ''
    return `$${dollars}${cents}`
  }

  // "four fifty a pound", "six twenty-five each" - verbal price (dollars and cents spoken as two numbers)
  // Map word numbers to digits
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
  const wordNumMatch = normalised.match(wordNumPattern)
  if (wordNumMatch) {
    const major = wordNumbers[wordNumMatch[1].toLowerCase()]
    const minor = wordNumMatch[2] ? wordNumbers[wordNumMatch[2].toLowerCase()] : null
    if (major) {
      const price = minor ? `$${major}.${minor.padStart(2, '0')}` : `$${major}`
      return price
    }
  }

  return null
}

function extractQuantity(speech: string): string | null {
  const quantityPattern =
    /\b(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?|ounces?|oz|pieces?|units?|items?|dozens?|cases?|boxes?|bags?|gallons?|quarts?|pints?|liters?|kilograms?|kgs?)\b/i
  const roughPattern =
    /\b(a few|several|some|plenty|a lot|half a|a quarter|about \d+|around \d+)\b/i

  const quantityMatch = speech.match(quantityPattern)
  if (quantityMatch) return quantityMatch[0].trim()

  const roughMatch = speech.match(roughPattern)
  if (roughMatch) return roughMatch[0].trim()

  return null
}

function parsePriceToCents(priceStr: string): number | null {
  // Extract a numeric value from a price string like "$4.50", "$12"
  const match = priceStr.match(/\$(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  return Math.round(parseFloat(match[1]) * 100)
}

function extractUnit(speech: string): string | null {
  const unitMatch = speech.match(
    /\b(pounds?|lbs?|ounces?|oz|pieces?|each|units?|dozens?|cases?|boxes?|bags?|gallons?|quarts?|pints?|liters?|kilograms?|kgs?)\b/i
  )
  return unitMatch ? unitMatch[1].toLowerCase() : null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function twiml(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function closingTwiml(message: string) {
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return twiml(`<Response><Say voice="Polly.Matthew">${escaped}</Say><Hangup/></Response>`)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const digits = formData.get('Digits') as string | null
  const speech = (formData.get('SpeechResult') as string | null)?.trim() || null

  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')
  const step = searchParams.get('step') || '1'

  if (!callId) {
    return closingTwiml('Thanks so much for your time! Have a great day.')
  }

  const db: any = createAdminClient()

  // ---
  // Step 2: Price and quantity capture
  // ---
  if (step === '2') {
    const priceQuoted = speech ? extractPrice(speech) : null
    const quantityAvailable = speech ? extractQuantity(speech) : null

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

    // Write a vendor price point when a clean price was captured
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
        console.error('[calling/gather] vendor_price_points insert error:', err)
      }
    }

    if (callRecord) {
      try {
        await broadcast(`chef-${callRecord.chef_id}`, 'supplier_call_result', {
          callId,
          vendorName: callRecord.vendor_name,
          ingredientName: callRecord.ingredient_name,
          result: callRecord.result,
          priceQuoted,
          quantityAvailable,
        })
      } catch (err) {
        console.error('[calling/gather] broadcast error (step 2):', err)
      }
    }

    const hasPriceInfo = priceQuoted || quantityAvailable
    const closing = hasPriceInfo
      ? 'Perfect, got it. Thanks a lot, have a good one!'
      : 'Got it, appreciate it. Have a good one!'

    return closingTwiml(closing)
  }

  // ---
  // Step 1: Availability (yes/no)
  // ---
  const result = resolveAvailability(digits, speech)

  if (result === 'yes') {
    // Update DB with availability result - price capture follows in step 2
    await db
      .from('supplier_calls')
      .update({
        result: 'yes',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)

    // Ask for price and quantity with a follow-up gather
    const gatherAction = `${process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'}/api/calling/gather?callId=${encodeURIComponent(callId)}&step=2`

    return twiml(`<Response>
  <Say voice="Polly.Matthew">Awesome, thanks.</Say>
  <Pause length="0.8"/>
  <Gather input="speech" timeout="10" speechTimeout="5" action="${gatherAction}" method="POST">
    <Say voice="Polly.Matthew">One more thing - what's the price on that, and roughly how much do you have available?</Say>
  </Gather>
  <Say voice="Polly.Matthew">Got it, I'll just note it's in stock. Thanks a lot!</Say>
  <Hangup/>
</Response>`)
  }

  if (result === 'no') {
    const { data: callRecord } = await db
      .from('supplier_calls')
      .update({
        result: 'no',
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
          result: 'no',
          priceQuoted: null,
          quantityAvailable: null,
        })
      } catch (err) {
        console.error('[calling/gather] broadcast error (no):', err)
      }
    }

    return closingTwiml('Got it, no problem at all. Thanks for your time!')
  }

  // Unclear response - close without a result
  await db
    .from('supplier_calls')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', callId)

  return closingTwiml("Sorry about that, couldn't quite catch that. Thanks for picking up!")
}
