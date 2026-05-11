/**
 * Conversation State Machine for Multi-Turn AI Calls
 *
 * Replaces the rigid 2-step gather flow with intelligent multi-turn
 * conversations. Tracks what has been collected, determines what to ask
 * next, and generates natural prompts for each step.
 *
 * State is stored in-memory keyed by Twilio CallSid. Calls are short-lived
 * (under 2 minutes), so in-memory storage is appropriate.
 *
 * Pure utility: no 'use server', no DB access, no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationStep =
  | 'greeting'
  | 'availability_check'
  | 'price_inquiry'
  | 'quantity_inquiry'
  | 'delivery_inquiry'
  | 'follow_up'
  | 'clarification'
  | 'closing'

export interface ConversationContext {
  callSid: string
  role: string
  ingredient: string
  vendorName: string
  currentStep: ConversationStep
  turnCount: number
  maxTurns: number
  collected: {
    available: boolean | null
    price: string | null
    quantity: string | null
    deliveryWindow: string | null
    conditions: string[]
    rawTranscript: string[]
  }
  needsClarification: boolean
  clarificationReason: string | null
}

export interface StepResult {
  nextStep: ConversationStep
  twimlPrompt: string
  shouldEnd: boolean
}

// ---------------------------------------------------------------------------
// In-memory store (keyed by CallSid)
// ---------------------------------------------------------------------------

const contextStore = new Map<string, ConversationContext>()

// Auto-cleanup: cap total entries to prevent memory leaks.
// Calls are short-lived, so this is a safety net.

function pruneStaleContexts(): void {
  // Only prune when the map grows large enough to matter
  if (contextStore.size < 50) return
  // Cap total entries. In practice, calls end and clearContext is called.
  if (contextStore.size > 200) {
    const keys = Array.from(contextStore.keys())
    // Remove oldest entries (first inserted)
    const toRemove = keys.slice(0, keys.length - 100)
    toRemove.forEach((k) => contextStore.delete(k))
  }
}

export function createContext(
  callSid: string,
  params: {
    role: string
    ingredient: string
    vendorName: string
    maxTurns?: number
  }
): ConversationContext {
  pruneStaleContexts()

  const ctx: ConversationContext = {
    callSid,
    role: params.role,
    ingredient: params.ingredient,
    vendorName: params.vendorName,
    currentStep: 'greeting',
    turnCount: 0,
    maxTurns: params.maxTurns ?? 4,
    collected: {
      available: null,
      price: null,
      quantity: null,
      deliveryWindow: null,
      conditions: [],
      rawTranscript: [],
    },
    needsClarification: false,
    clarificationReason: null,
  }
  contextStore.set(callSid, ctx)
  return ctx
}

export function getContext(callSid: string): ConversationContext | null {
  return contextStore.get(callSid) ?? null
}

export function updateContext(callSid: string, updates: Partial<ConversationContext>): void {
  const existing = contextStore.get(callSid)
  if (!existing) return

  // Shallow merge top-level, deep merge collected
  if (updates.collected) {
    existing.collected = {
      ...existing.collected,
      ...updates.collected,
      // Append conditions rather than replacing
      conditions: updates.collected.conditions
        ? [...existing.collected.conditions, ...updates.collected.conditions]
        : existing.collected.conditions,
      // Append transcripts rather than replacing
      rawTranscript: updates.collected.rawTranscript
        ? [...existing.collected.rawTranscript, ...updates.collected.rawTranscript]
        : existing.collected.rawTranscript,
    }
    delete updates.collected
  }

  Object.assign(existing, updates)
  contextStore.set(callSid, existing)
}

export function clearContext(callSid: string): void {
  contextStore.delete(callSid)
}

// ---------------------------------------------------------------------------
// Availability resolution (same word lists as gather/route.ts)
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

// Phrases indicating the vendor needs a moment or will call back
const HOLD_PHRASES = [
  'let me check',
  'hold on',
  'one moment',
  'one second',
  'give me a sec',
  'let me look',
  'hang on',
  'checking now',
  'just a moment',
  'bear with me',
]

// Phrases indicating future availability (not currently in stock but coming)
const FUTURE_PHRASES = [
  'getting a delivery',
  'coming in',
  'expect it',
  'arriving',
  'should have',
  'getting some',
  'on order',
  'ordered',
  'shipment',
  'tomorrow',
  'thursday',
  'friday',
  'next week',
  'later today',
  'this afternoon',
  'pick up',
]

// Phrases indicating conditions or special terms
const CONDITION_PHRASES = [
  'only in cases',
  'case only',
  'minimum order',
  'minimum',
  'bulk only',
  'cash only',
  'cash discount',
  'special order',
  'by the case',
  'whole only',
  'pre-order',
  'advance notice',
  'call ahead',
  'limited',
  'while supplies last',
]

function resolveAvailability(transcript: string): 'yes' | 'no' | null {
  const lower = transcript.toLowerCase()
  if (YES_WORDS.some((w) => lower.includes(w))) return 'yes'
  if (NO_WORDS.some((w) => lower.includes(w))) return 'no'
  return null
}

function detectHoldRequest(transcript: string): boolean {
  const lower = transcript.toLowerCase()
  return HOLD_PHRASES.some((p) => lower.includes(p))
}

function detectFutureAvailability(transcript: string): boolean {
  const lower = transcript.toLowerCase()
  return FUTURE_PHRASES.some((p) => lower.includes(p))
}

function extractConditions(transcript: string): string[] {
  const lower = transcript.toLowerCase()
  return CONDITION_PHRASES.filter((p) => lower.includes(p))
}

// ---------------------------------------------------------------------------
// Core logic: determine what to ask next
// ---------------------------------------------------------------------------

export function determineNextStep(ctx: ConversationContext, latestTranscript: string): StepResult {
  try {
    // Append this transcript to raw log
    const transcriptEntry = latestTranscript.trim()
    if (transcriptEntry) {
      ctx.collected.rawTranscript.push(transcriptEntry)
    }

    ctx.turnCount++

    // Hard cap: close regardless after maxTurns
    if (ctx.turnCount >= ctx.maxTurns) {
      return buildClosing(ctx)
    }

    // Detect conditions mentioned in this turn
    const newConditions = extractConditions(latestTranscript)
    if (newConditions.length > 0) {
      ctx.collected.conditions.push(
        ...newConditions.filter((c) => !ctx.collected.conditions.includes(c))
      )
    }

    // Branch 1: Vendor asked us to hold ("let me check")
    if (detectHoldRequest(latestTranscript)) {
      return {
        nextStep: 'clarification',
        twimlPrompt: 'Sure, take your time. I am in no rush.',
        shouldEnd: false,
      }
    }

    // Branch 2: Availability not yet determined
    if (ctx.collected.available === null) {
      const avail = resolveAvailability(latestTranscript)

      if (avail === 'yes') {
        ctx.collected.available = true

        // If they also mentioned a condition, follow up on it first
        if (newConditions.length > 0) {
          const condition = newConditions[0]
          return {
            nextStep: 'follow_up',
            twimlPrompt: `You mentioned ${condition}. Could you tell me more about that?`,
            shouldEnd: false,
          }
        }

        // Ask for price next
        return {
          nextStep: 'price_inquiry',
          twimlPrompt: `Great! What is the current price per pound for ${ctx.ingredient}?`,
          shouldEnd: false,
        }
      }

      if (avail === 'no') {
        ctx.collected.available = false

        // Check if they mentioned future availability
        if (detectFutureAvailability(latestTranscript)) {
          return {
            nextStep: 'follow_up',
            twimlPrompt:
              'Got it, not right now. You mentioned it might be coming in. Do you know when, and could I pick it up then?',
            shouldEnd: false,
          }
        }

        // Confirmed unavailable, close the call
        return buildClosing(ctx)
      }

      // Ambiguous response (neither yes nor no)
      // Check for future availability mentions even without clear yes/no
      if (detectFutureAvailability(latestTranscript)) {
        ctx.collected.available = false
        return {
          nextStep: 'follow_up',
          twimlPrompt:
            'Sounds like it might be coming in soon. Do you have a date or time I could check back?',
          shouldEnd: false,
        }
      }

      // Ask for clarification
      ctx.needsClarification = true
      ctx.clarificationReason = 'availability_ambiguous'
      return {
        nextStep: 'clarification',
        twimlPrompt: `I am sorry, I did not quite catch that. Do you currently have ${ctx.ingredient} in stock?`,
        shouldEnd: false,
      }
    }

    // Branch 3: Available=true, collecting details
    if (ctx.collected.available === true) {
      // If we just asked about conditions and got a response, move to price
      if (ctx.currentStep === 'follow_up' && ctx.collected.price === null) {
        return {
          nextStep: 'price_inquiry',
          twimlPrompt: `Got it, thanks for clarifying. What is the current price on ${ctx.ingredient}?`,
          shouldEnd: false,
        }
      }

      // If price not yet captured
      if (ctx.collected.price === null) {
        // Check if this transcript contains price info (they volunteered it)
        const priceMatch = extractPriceFromTranscript(latestTranscript)
        if (priceMatch) {
          ctx.collected.price = priceMatch
          // We have availability + price, close
          return buildClosing(ctx)
        }

        return {
          nextStep: 'price_inquiry',
          twimlPrompt: `What is the current price per pound for ${ctx.ingredient}?`,
          shouldEnd: false,
        }
      }

      // Price captured, we are done
      return buildClosing(ctx)
    }

    // Branch 4: Available=false but we asked a follow-up (future availability)
    // The follow-up response came back; capture it and close
    if (ctx.collected.available === false) {
      // Capture any delivery window info from the follow-up
      ctx.collected.deliveryWindow = latestTranscript.trim() || null
      return buildClosing(ctx)
    }

    // Fallback: close
    return buildClosing(ctx)
  } catch (err) {
    console.error('[conversation-state] determineNextStep error:', err)
    return buildClosing(ctx)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildClosing(ctx: ConversationContext): StepResult {
  ctx.currentStep = 'closing'

  let prompt: string
  if (ctx.collected.available === true && ctx.collected.price) {
    prompt = 'Perfect, got all of that. Thanks so much, really appreciate it. Have a great day!'
  } else if (ctx.collected.available === true) {
    prompt = 'Got it, that is really helpful. Thanks a lot, take care!'
  } else if (ctx.collected.available === false) {
    prompt = 'No problem at all, I appreciate you letting me know. Take care, have a good one!'
  } else {
    prompt = 'Thanks so much for your time. Have a great day!'
  }

  return {
    nextStep: 'closing',
    twimlPrompt: prompt,
    shouldEnd: true,
  }
}

/**
 * Simple price extraction from transcript.
 * Looks for dollar signs, "dollars", or bare numbers with units.
 * This is a lightweight check to detect volunteered prices;
 * the full extraction in gather/route.ts does the canonical parse.
 */
function extractPriceFromTranscript(transcript: string): string | null {
  // "$X.XX" pattern
  const dollarSign = transcript.match(/\$[\d,.]+/)
  if (dollarSign) return dollarSign[0]

  // "X dollars" pattern
  const dollarWord = transcript.match(/\b(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?)/i)
  if (dollarWord) return `$${dollarWord[1]}`

  // "X per pound" / "X a pound" pattern
  const perUnit = transcript.match(
    /\b(\d+(?:\.\d{1,2})?)\s*(?:a|per|\/)\s*(?:pound|lb|lbs|ounce|oz|each|piece|case|dozen)/i
  )
  if (perUnit) return `$${perUnit[1]}`

  return null
}
