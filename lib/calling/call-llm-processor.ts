'use server'

// LLM post-processing for call transcripts via Gemma 4 (local Ollama).
// Extracts structured data from vendor call transcripts: availability,
// pricing, delivery, quantity, sentiment, and follow-up signals.
// Falls back to keyword extraction when Ollama is offline.

import { Ollama, type ChatResponse } from 'ollama'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { extractFromKeywords } from './keyword-extractor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallExtractionResult {
  // Availability
  available: boolean | null
  confidence: number // 0-1
  availability_notes: string | null // "only in 5lb cases", "getting delivery Thursday"

  // Pricing
  price: number | null
  price_unit: string | null // "lb", "case", "each", "bunch"
  price_conditions: string | null // "bulk only", "cash discount"
  price_competitiveness: number // 0-10 vs known market rates

  // Quantity
  quantity_available: number | null
  quantity_unit: string | null

  // Delivery
  delivery_available: boolean | null
  delivery_window: string | null // "tomorrow AM", "Thursday 6-8am"
  delivery_minimum: string | null // "$200 minimum"
  delivery_contact: string | null

  // Sentiment
  vendor_sentiment: 'positive' | 'neutral' | 'hesitant' | 'negative'
  urgency_detected: boolean
  follow_up_needed: boolean
  follow_up_reason: string | null

  // Raw
  summary: string // 1-2 sentence human-readable summary
}

export interface IngredientSynthesis {
  ingredient: string
  total_vendors_called: number
  vendors_confirmed: number
  vendors_unavailable: number
  best_price: { vendor: string; price: number; unit: string } | null
  delivery_options: Array<{ vendor: string; window: string }>
  recommendation: string // "Best option: Harbor Fish at $14.50/lb with AM delivery"
  risks: string[] // "Limited stock at 2 vendors", "Price 20% above market"
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALL_EXTRACTION_TIMEOUT_MS = 30_000 // 30s max for single transcript
const SYNTHESIS_TIMEOUT_MS = 30_000
const EXTRACTION_TEMPERATURE = 0.15 // Low for deterministic structured output
const SYNTHESIS_TEMPERATURE = 0.3

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Ollama ${label} timed out after ${Math.round(timeoutMs / 1000)}s`))
    }, timeoutMs)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are analyzing a phone call transcript between an AI assistant and a food vendor/supplier. The AI assistant called this vendor to check on ingredient availability, pricing, and delivery options for a private chef.

Extract structured data from the conversation. Return ONLY valid JSON, no markdown fences, no explanation, no extra text.

JSON schema:
{
  "available": true/false/null,
  "confidence": 0.0 to 1.0,
  "availability_notes": "string or null",
  "price": number or null (dollar amount, e.g. 14.50),
  "price_unit": "string or null (lb, case, each, bunch, dozen, oz, etc.)",
  "price_conditions": "string or null (bulk only, cash discount, etc.)",
  "price_competitiveness": 0 to 10 (your estimate; 5 = average, 8+ = good deal, 2 or less = expensive),
  "quantity_available": number or null,
  "quantity_unit": "string or null",
  "delivery_available": true/false/null,
  "delivery_window": "string or null (e.g. tomorrow AM, Thursday 6-8am)",
  "delivery_minimum": "string or null (e.g. $200 minimum)",
  "delivery_contact": "string or null (name of delivery person or contact mentioned)",
  "vendor_sentiment": "positive" or "neutral" or "hesitant" or "negative",
  "urgency_detected": true/false,
  "follow_up_needed": true/false,
  "follow_up_reason": "string or null",
  "summary": "1-2 sentence human-readable summary of the call outcome"
}

Rules:
- If the vendor confirmed availability, set available=true. If they said they do not have it, set available=false. If unclear, set null.
- confidence reflects how certain you are about the availability determination (0.0 = no idea, 1.0 = absolutely certain).
- For price, extract the numeric dollar value only (no $ sign). If they said "$14.50 a pound", price=14.50, price_unit="lb".
- price_competitiveness: estimate based on the ingredient type and price. 5 is average. Without market context, default to 5.
- urgency_detected: true if vendor mentioned limited stock, prices changing, seasonal ending, etc.
- follow_up_needed: true if the call was inconclusive, vendor asked the chef to call back, or important info was missing.
- summary: write from the chef's perspective. Example: "Harbor Fish has wild salmon at $14.50/lb, can deliver Thursday AM."
- Never use em dashes in any field. Use commas, semicolons, or separate sentences.
- Return ONLY the JSON object. No wrapping, no explanation.`

const SYNTHESIS_SYSTEM_PROMPT = `You are a procurement analyst for a private chef. Given extraction results from multiple vendor calls about the same ingredient, synthesize a recommendation.

Return ONLY valid JSON, no markdown fences, no explanation.

JSON schema:
{
  "ingredient": "string",
  "total_vendors_called": number,
  "vendors_confirmed": number,
  "vendors_unavailable": number,
  "best_price": { "vendor": "string", "price": number, "unit": "string" } or null,
  "delivery_options": [{ "vendor": "string", "window": "string" }],
  "recommendation": "string (1-2 sentences, e.g. Best option: Harbor Fish at $14.50/lb with AM delivery)",
  "risks": ["string array of concerns"]
}

Rules:
- best_price: the vendor with the lowest price per unit. If no prices were captured, set null.
- delivery_options: only include vendors that confirmed delivery capability with a time window.
- recommendation: be direct and actionable. State the best vendor, price, and delivery option.
- risks: flag limited stock, high prices vs market, single-source dependency, or missing data.
- Never use em dashes. Use commas, semicolons, or separate sentences.
- Return ONLY the JSON object.`

// ---------------------------------------------------------------------------
// JSON parsing with repair
// ---------------------------------------------------------------------------

function tryParseJSON(text: string): Record<string, unknown> | null {
  // Strip markdown fences if the model wrapped the response
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // First attempt: parse directly
  try {
    return JSON.parse(cleaned)
  } catch {
    // noop
  }

  // Second attempt: find the first { ... } block in the response
  const braceStart = cleaned.indexOf('{')
  const braceEnd = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(cleaned.slice(braceStart, braceEnd + 1))
    } catch {
      // noop
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Result validation and defaults
// ---------------------------------------------------------------------------

function validateExtraction(raw: Record<string, unknown>): CallExtractionResult {
  const validSentiments = ['positive', 'neutral', 'hesitant', 'negative'] as const
  const sentiment = validSentiments.includes(raw.vendor_sentiment as any)
    ? (raw.vendor_sentiment as 'positive' | 'neutral' | 'hesitant' | 'negative')
    : 'neutral'

  return {
    available: typeof raw.available === 'boolean' ? raw.available : null,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
    availability_notes: typeof raw.availability_notes === 'string' ? raw.availability_notes : null,
    price: typeof raw.price === 'number' ? raw.price : null,
    price_unit: typeof raw.price_unit === 'string' ? raw.price_unit : null,
    price_conditions: typeof raw.price_conditions === 'string' ? raw.price_conditions : null,
    price_competitiveness:
      typeof raw.price_competitiveness === 'number'
        ? Math.max(0, Math.min(10, raw.price_competitiveness))
        : 0,
    quantity_available: typeof raw.quantity_available === 'number' ? raw.quantity_available : null,
    quantity_unit: typeof raw.quantity_unit === 'string' ? raw.quantity_unit : null,
    delivery_available: typeof raw.delivery_available === 'boolean' ? raw.delivery_available : null,
    delivery_window: typeof raw.delivery_window === 'string' ? raw.delivery_window : null,
    delivery_minimum: typeof raw.delivery_minimum === 'string' ? raw.delivery_minimum : null,
    delivery_contact: typeof raw.delivery_contact === 'string' ? raw.delivery_contact : null,
    vendor_sentiment: sentiment,
    urgency_detected: typeof raw.urgency_detected === 'boolean' ? raw.urgency_detected : false,
    follow_up_needed: typeof raw.follow_up_needed === 'boolean' ? raw.follow_up_needed : false,
    follow_up_reason: typeof raw.follow_up_reason === 'string' ? raw.follow_up_reason : null,
    summary:
      typeof raw.summary === 'string' && raw.summary.length > 0
        ? raw.summary
        : 'Call completed; details could not be parsed.',
  }
}

function validateSynthesis(
  raw: Record<string, unknown>,
  ingredientName: string
): IngredientSynthesis {
  const bestPrice =
    raw.best_price && typeof raw.best_price === 'object'
      ? {
          vendor: String((raw.best_price as any).vendor ?? 'Unknown'),
          price: Number((raw.best_price as any).price ?? 0),
          unit: String((raw.best_price as any).unit ?? 'each'),
        }
      : null

  const deliveryOptions = Array.isArray(raw.delivery_options)
    ? raw.delivery_options
        .filter((d: any) => d && typeof d.vendor === 'string' && typeof d.window === 'string')
        .map((d: any) => ({ vendor: String(d.vendor), window: String(d.window) }))
    : []

  const risks = Array.isArray(raw.risks)
    ? raw.risks.filter((r: any) => typeof r === 'string').map(String)
    : []

  return {
    ingredient: typeof raw.ingredient === 'string' ? raw.ingredient : ingredientName,
    total_vendors_called:
      typeof raw.total_vendors_called === 'number' ? raw.total_vendors_called : 0,
    vendors_confirmed: typeof raw.vendors_confirmed === 'number' ? raw.vendors_confirmed : 0,
    vendors_unavailable: typeof raw.vendors_unavailable === 'number' ? raw.vendors_unavailable : 0,
    best_price: bestPrice,
    delivery_options: deliveryOptions,
    recommendation:
      typeof raw.recommendation === 'string' && raw.recommendation.length > 0
        ? raw.recommendation
        : 'No clear recommendation; insufficient data from vendor calls.',
    risks,
  }
}

// ---------------------------------------------------------------------------
// Ollama call helper
// ---------------------------------------------------------------------------

async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  timeoutMs: number,
  label: string
): Promise<string> {
  const config = getOllamaConfig()
  const model = getOllamaModel('standard')
  const ollama = new Ollama({ host: config.baseUrl })
  const startTime = Date.now()

  const response = await withTimeout(
    ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        num_predict: 1024,
        temperature,
      },
      keep_alive: '30m',
    } as any) as unknown as Promise<ChatResponse>,
    timeoutMs,
    label
  )

  const text = response.message.content || ''
  const durationMs = Date.now() - startTime
  console.log(`[call-llm] ${label}: ${text.length} chars, ${model}, ${durationMs}ms`)
  return text
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a completed call transcript through Gemma 4 for structured
 * extraction. Falls back to keyword-based extraction when Ollama is
 * unavailable or returns unusable output.
 */
export async function processCallTranscript(params: {
  transcript: string
  ingredientName: string
  vendorName: string
  callRole: string
}): Promise<CallExtractionResult> {
  const { transcript, ingredientName, vendorName, callRole } = params

  // Empty transcript: return empty result immediately
  if (!transcript || transcript.trim().length === 0) {
    return extractFromKeywords('', ingredientName, vendorName)
  }

  // If Ollama is not enabled, use keyword fallback
  if (!isOllamaEnabled()) {
    console.log('[call-llm] Ollama not enabled; using keyword extraction fallback')
    return extractFromKeywords(transcript, ingredientName, vendorName)
  }

  try {
    const userPrompt = [
      `Vendor: ${vendorName}`,
      `Ingredient: ${ingredientName}`,
      `Call role: ${callRole}`,
      '',
      'Transcript:',
      transcript,
    ].join('\n')

    const responseText = await callOllama(
      EXTRACTION_SYSTEM_PROMPT,
      userPrompt,
      EXTRACTION_TEMPERATURE,
      CALL_EXTRACTION_TIMEOUT_MS,
      'extract'
    )

    if (!responseText || responseText.trim().length === 0) {
      console.warn('[call-llm] Empty response from Ollama; falling back to keywords')
      return extractFromKeywords(transcript, ingredientName, vendorName)
    }

    const parsed = tryParseJSON(responseText)
    if (!parsed) {
      console.warn('[call-llm] Could not parse Ollama JSON response; falling back to keywords')
      return extractFromKeywords(transcript, ingredientName, vendorName)
    }

    return validateExtraction(parsed)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[call-llm] Ollama extraction failed: ${errMsg}; falling back to keywords`)
    return extractFromKeywords(transcript, ingredientName, vendorName)
  }
}

/**
 * Process multiple call transcripts from a batch. Returns a map keyed by
 * a composite key of "vendorName::ingredientName" for each call.
 *
 * Processes sequentially to avoid overloading a local Ollama instance.
 */
export async function processBatchTranscripts(
  calls: Array<{
    transcript: string
    ingredientName: string
    vendorName: string
    callRole: string
  }>
): Promise<Map<string, CallExtractionResult>> {
  const results = new Map<string, CallExtractionResult>()

  for (const call of calls) {
    const key = `${call.vendorName}::${call.ingredientName}`
    try {
      const result = await processCallTranscript(call)
      results.set(key, result)
    } catch (err) {
      console.error(`[call-llm] Batch item failed for ${key}:`, err)
      results.set(key, extractFromKeywords(call.transcript, call.ingredientName, call.vendorName))
    }
  }

  return results
}

/**
 * Synthesize results from multiple vendor calls about the same ingredient.
 * Produces an actionable recommendation: best price, delivery options, risks.
 *
 * Uses Ollama for synthesis when available; otherwise builds a basic
 * synthesis from the structured results directly.
 */
export async function synthesizeIngredientResults(
  ingredientName: string,
  results: CallExtractionResult[]
): Promise<IngredientSynthesis> {
  if (results.length === 0) {
    return {
      ingredient: ingredientName,
      total_vendors_called: 0,
      vendors_confirmed: 0,
      vendors_unavailable: 0,
      best_price: null,
      delivery_options: [],
      recommendation: `No vendor calls completed for ${ingredientName}.`,
      risks: ['No vendor data available'],
    }
  }

  // Always compute a basic synthesis from structured data as a fallback
  const basicSynthesis = buildBasicSynthesis(ingredientName, results)

  // Try LLM synthesis if Ollama is available
  if (!isOllamaEnabled()) {
    return basicSynthesis
  }

  try {
    const userPrompt = [
      `Ingredient: ${ingredientName}`,
      `Number of vendor calls: ${results.length}`,
      '',
      'Extraction results from each vendor call:',
      JSON.stringify(results, null, 2),
    ].join('\n')

    const responseText = await callOllama(
      SYNTHESIS_SYSTEM_PROMPT,
      userPrompt,
      SYNTHESIS_TEMPERATURE,
      SYNTHESIS_TIMEOUT_MS,
      'synthesize'
    )

    if (!responseText || responseText.trim().length === 0) {
      return basicSynthesis
    }

    const parsed = tryParseJSON(responseText)
    if (!parsed) {
      return basicSynthesis
    }

    return validateSynthesis(parsed, ingredientName)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[call-llm] Synthesis failed: ${errMsg}; using basic synthesis`)
    return basicSynthesis
  }
}

// ---------------------------------------------------------------------------
// Basic synthesis (no LLM required)
// ---------------------------------------------------------------------------

function buildBasicSynthesis(
  ingredientName: string,
  results: CallExtractionResult[]
): IngredientSynthesis {
  const confirmed = results.filter((r) => r.available === true)
  const unavailable = results.filter((r) => r.available === false)

  // Find best price among confirmed vendors
  let bestPrice: { vendor: string; price: number; unit: string } | null = null
  for (const r of confirmed) {
    if (r.price !== null && r.price > 0) {
      if (!bestPrice || r.price < bestPrice.price) {
        bestPrice = {
          vendor: r.summary.split(':')[0] || 'Unknown',
          price: r.price,
          unit: r.price_unit || 'each',
        }
      }
    }
  }

  // Collect delivery options
  const deliveryOptions: Array<{ vendor: string; window: string }> = []
  for (const r of confirmed) {
    if (r.delivery_available && r.delivery_window) {
      deliveryOptions.push({
        vendor: r.summary.split(':')[0] || 'Unknown',
        window: r.delivery_window,
      })
    }
  }

  // Build risks
  const risks: string[] = []
  if (confirmed.length === 0) {
    risks.push(`No vendors confirmed availability for ${ingredientName}`)
  } else if (confirmed.length === 1) {
    risks.push('Single-source dependency: only one vendor confirmed')
  }
  if (results.some((r) => r.urgency_detected)) {
    risks.push('Limited stock or urgency detected at one or more vendors')
  }
  if (confirmed.length > 0 && !bestPrice) {
    risks.push('No pricing data captured from any confirmed vendor')
  }

  // Build recommendation
  let recommendation: string
  if (confirmed.length === 0) {
    recommendation = `No vendors have ${ingredientName} available. Consider alternative ingredients or suppliers.`
  } else if (bestPrice) {
    const deliveryNote = deliveryOptions.length > 0 ? `, delivery ${deliveryOptions[0].window}` : ''
    recommendation = `Best option: ${bestPrice.vendor} at $${bestPrice.price}/${bestPrice.unit}${deliveryNote}.`
  } else {
    recommendation = `${confirmed.length} vendor(s) confirmed availability but no pricing was captured. Follow up for quotes.`
  }

  return {
    ingredient: ingredientName,
    total_vendors_called: results.length,
    vendors_confirmed: confirmed.length,
    vendors_unavailable: unavailable.length,
    best_price: bestPrice,
    delivery_options: deliveryOptions,
    recommendation,
    risks,
  }
}
