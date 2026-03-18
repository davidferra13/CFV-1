'use server'

// Remy - Intent Classifier
// Uses the fast Ollama model to classify messages as question vs command.
// PRIVACY: Chef messages may contain client names - must stay local.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import type { MessageIntent } from '@/lib/ai/remy-types'

const ClassificationSchema = z.object({
  intent: z.enum(['question', 'command', 'mixed']),
  confidence: z.number().min(0).max(1),
  commandPart: z.string().optional(),
  questionPart: z.string().optional(),
})

const CLASSIFIER_SYSTEM_PROMPT = `You classify private chef business messages into intent types.

QUESTION: Asking for information, advice, analysis, or general conversation. No specific action is needed.
Examples:
- "How is my revenue this month?"
- "What should I cook for a gluten-free dinner?"
- "Any tips for pricing a 20-person event?"
- "Tell me about my upcoming events"
- "What's on my plate this week?"

COMMAND: Requesting a specific action to be performed - finding someone, checking availability, drafting something, creating something, searching the web, reading a URL, checking dietary restrictions, or viewing profile info.
Examples:
- "Find my client"
- "Check if March 15th is free"
- "Draft a follow-up for my last client"
- "Create an event for next Saturday"
- "Search for pasta recipes"
- "Search the web for seasonal menu trends"
- "Look up catering pricing online"
- "Read this article: https://..."
- "Google private chef rates in New York"
- "Check dietary restrictions for Sarah"
- "Does Sarah have any allergies?"
- "Show my favorite chefs"
- "Show my culinary profile"
- "Write a thank-you note for the Hendersons"
- "Draft a referral request for Sarah"
- "Ask the Millers for a testimonial"
- "Write a cover letter for the Johnson wedding quote"
- "Decline the booking from Alex"
- "Respond to the Smith cancellation"
- "Send a payment reminder to Dave"
- "Re-engage with the Thompson family"
- "Celebrate the Johnson's 10th event"
- "Write up the food safety incident from last night"
- "Scale my risotto recipe for 30 guests"
- "Portion calculator for the chicken dish for 50 people"
- "Generate a packing list for the Henderson wedding"
- "What do I need to pack for Saturday's event?"
- "Check cross-contamination risks for the Miller dinner"
- "Break-even analysis for the corporate event"
- "What's Sarah's lifetime value?"
- "How much has the Johnson family spent total?"
- "Optimize costs for my lobster bisque recipe"
- "Recap the Thompson anniversary dinner"
- "Explain the tasting menu"
- "Here's a transcript from a client call, put everything where it belongs"
- "Parse this conversation with a potential client"
- "I just got off the phone with someone about a dinner party, here are my notes"
- "Import these clients: Sarah Johnson, Mike Davis, Lisa Chen..."
- "Bulk import my client list"
- "Here's a brain dump of everything I know about my clients"
- "[Attached: transcript.txt]"
- "I talked to Sarah about her wedding, here's what she said..."
- "Process these notes from today's calls"

MIXED: Contains BOTH a question and an actionable request in the same message.
Example: "What's my revenue this month, and draft a follow-up for my last client"

If unsure, classify as QUESTION - it's the safest option (no side effects).

Return JSON: { "intent": "question"|"command"|"mixed", "confidence": 0.0-1.0 }
If mixed, also include "commandPart" and "questionPart" splitting the message.`

export interface ClassificationResult {
  intent: MessageIntent
  confidence: number
  commandPart?: string
  questionPart?: string
}

// ─── Deterministic Pre-Classifier (Formula > AI) ────────────────────────────
// Skips Ollama entirely for obvious patterns. Saves 2-5s on ~70% of messages.

const COMMAND_PATTERNS: RegExp[] = [
  // Action verbs at start
  /^(draft|write|create|make|add|set up|build|generate|prepare)\b/i,
  // Specific actions
  /^(find|search|look up|check|show|pull up|get|grab|fetch)\b/i,
  // Draft types
  /^(send|email|text|message|respond|reply|decline|re-engage|celebrate)\b/i,
  // Operational commands
  /^(scale|portion|pack|import|bulk|parse|process|log|record|schedule)\b/i,
  // Web commands
  /^(google|search the web|look up online|read this|read https?:)/i,
  // Navigation
  /^(go to|navigate|open|take me to)\b/i,
  // Reminders
  /^(remind me|don't let me forget|set a reminder)\b/i,
  // Brain dump / intake patterns
  /^(here'?s a (transcript|brain dump|dump|list|note)|i (just )?got off the phone|i talked to)\b/i,
  // Attached file
  /^\[attached:/i,
  // Update/modify actions
  /^(update|change|modify|edit|rename|move|delete|remove|cancel)\b/i,
  // Financial commands
  /^(invoice|charge|refund|pay|bill|calculate|price|quote)\b/i,
  // Calendar/booking commands
  /^(book|reserve|block off|free up|mark|unblock)\b/i,
  // Communication commands
  /^(call|contact|reach out|follow up|ping|nudge|remind)\b/i,
  // List/report commands
  /^(list|print|export|download|report|pull)\b/i,
  // ─── Noun-led queries that are commands (no verb prefix) ───
  // "[Name] details/info/profile" → client lookup
  /^.+\s+(details?|info|information|profile)\s*$/i,
  // "Upcoming/next/my events" → event listing
  /^(upcoming|next|my|today'?s?)\s+(events?|bookings?|schedule)\b/i,
  // "[Name/keyword] events" → event search
  /^.+\s+events?\s*$/i,
  // "Total revenue", "Monthly expenses" → financial queries
  /^(total|monthly|yearly|quarterly|weekly|annual)?\s*(revenue|income|earnings|expenses?|spending|costs?)\s*$/i,
  // "[keyword] recipes" → recipe search
  /^.+\s+recipes?\s*$/i,
  // "Loyalty status/program" → loyalty lookup
  /^(loyalty|rewards?)\s+(status|program|overview|summary|points?|tiers?)\b/i,
  // "Top tier members/clients" → loyalty/client query
  /^(top|vip|best|highest)\s+(tier\s+)?(members?|clients?|customers?)\b/i,
  // "Follow-up/follow-ups leads/pending" → follow-up actions
  /^follow.?ups?\b/i,
  // "Pending/open inquiries/leads" → inquiry listing
  /^(pending|open|overdue|new)\s+(inquir|leads?|bookings?|events?|invoices?)/i,
  // "Email status/overview" → email commands
  /^email\s+(status|overview|summary|inbox)\b/i,
  // ─── Communication platform commands ───
  // Auto-response management
  /^(auto[- ]?respond|auto[- ]?response|enable auto[- ]?response|disable auto[- ]?response)/i,
  // Business hours configuration
  /^(set business hours|update business hours|change business hours|business hours)/i,
  // Communication/response templates
  /^(communication templates?|response templates?|create template|edit template)/i,
  // Client onboarding
  /^(send onboarding|onboarding link|client onboarding|generate onboarding)/i,
  // Menu approval portal
  /^(send menu|menu approval|send (the )?menu to|menu proposal)/i,
  // Guest count changes
  /^(update guest count|change guest count|guest count)/i,
  // Payment milestones and schedules
  /^(payment milestones?|milestone template|create milestone|payment schedule)/i,
  // Post-event surveys and feedback
  /^(send survey|post[- ]?event survey|feedback survey|create survey)/i,
  // Kitchen assessment checklists
  /^(kitchen assessment|assess kitchen|kitchen checklist)/i,
  // Event contacts and stakeholders
  /^(add (event )?contact|event contacts?|stakeholder)/i,
]

const QUESTION_PATTERNS: RegExp[] = [
  // Direct questions
  /^(how|what|why|when|where|who|which|can you tell me|could you explain)\b/i,
  // Advice seeking
  /^(any tips|any advice|should i|do you think|what do you think)\b/i,
  // Status checks (informational, not action)
  /^(how'?s|how is|how are|what'?s my|tell me about|give me an overview)\b/i,
  // Conversational
  /^(thanks|thank you|got it|ok|okay|sure|sounds good|perfect|great|awesome|nice)\b/i,
  // Opinion / analysis
  /^(analyze|compare|explain|describe|summarize|break down|walk me through)\b/i,
  // Greetings
  /^(hi|hey|hello|good morning|good afternoon|good evening|morning|afternoon|yo|sup)\b/i,
  // Business questions
  /^(am i|is my|are my|is there|are there|do i have|have i)\b/i,
  // Single-word confirmations
  /^(yes|no|yep|nope|nah|yeah|yea)\b$/i,
  // Feeling/mood
  /^(i'?m feeling|i feel|i'?m (stressed|tired|excited|overwhelmed|worried))\b/i,
]

// Commands that look like questions but are actually action requests
const QUESTION_SHAPED_COMMANDS: RegExp[] = [
  /^(does|do)\s+\w+\s+have\s+(any\s+)?allerg/i, // "Does Sarah have any allergies?"
  /^what('?s| is)\s+\w+'?s?\s+(lifetime value|ltv)/i, // "What's Sarah's lifetime value?"
  /^how much has\b/i, // "How much has the Johnson family spent?"
  /^what do i need to pack/i, // "What do I need to pack for Saturday?"
  /^can you (draft|create|make|find|check|search|write)/i, // "Can you draft a..."
  /^(could you|would you|will you|please) (draft|create|make|find|check|search|write|send)/i,
  /^is\s+\w+\s+(available|free|open|blocked)/i, // "Is March 15 available?"
  /^what('?s| are) (the )?(dietary|allerg)/i, // "What are the dietary restrictions for..."
  /^(do i have|are there) any (upcoming|pending|overdue|open)/i, // "Do I have any upcoming events?"
  /^what'?s?\s+\w+'?s?\s+(payment|balance|outstanding|owed)/i, // "What's Sarah's balance?"
  /^who\s+(hasn'?t|has not)\s+(paid|booked|responded|replied)/i, // "Who hasn't paid?"
  /^when\s+(is|was)\s+\w+'?s?\s+(last|next)\s+(event|booking|dinner)/i, // "When is Sarah's next event?"
  /^(where|how)\s+do\s+i\s+(add|create|find|set up|log|import)/i, // "How do I add a client?"
  /^what('?s| is)\s+(my|the)\s+(margin|profit|revenue|conversion|cost)/i, // "What's my profit margin?"
  /^how\s+(many|much)\s+(clients?|events?|inquir)/i, // "How many events do I have?"
  /^good\s+morning/i, // Triggers morning briefing, not a greeting
  /^what'?s\s+(today|my day)\s+look\s+like/i, // "What's today look like?"
  /^(brief|debrief)\s+me/i, // "Brief me"
  /^(revenue|pricing|tax|p\s*&?\s*l)\s+(forecast|analysis|summary|report)/i, // Financial commands
  /^(can\s+i\s+take|am\s+i\s+(overbooked|too busy))/i, // Capacity check
  /^(what'?s|show)\s+in\s+season/i, // Seasonal produce
  /^(dormant|re-?engage|acquisition|conversion)\s+(clients?|funnel|rate|scoring)/i, // Relationship intelligence
  /^(compare|contingency|contract)\s/i, // Multi-event, contingency, contract commands
  /^who.?s?\s+(at\s+risk|going\s+cold|cooling|churning)/i, // Churn risk queries
  /^(what.?s?\s+my\s+)?cash\s*flow/i, // Cash flow forecast
  /^(what.?s?\s+my\s+)?(food\s+cost|mileage|payroll)/i, // Finance queries
  /^(how\s+am\s+i\s+(doing|rated)|how.?s?\s+my\s+business)/i, // Benchmarks/health
  /^what('?s| is)\s+scheduled/i, // "What is scheduled today?"
  /^what('?s| is)\s+(on )?(my )?(calendar|schedule|agenda)/i, // "What's on my calendar?"
  /^(who.?s?\s+available|staff\s+availability)/i, // Staff availability
  /^(what.?s?\s+(in\s+)?inventory|low\s+stock)/i, // Inventory check
  /^(guest\s+list|who.?s?\s+coming)/i, // Guest list
  /^(what\s+are\s+my\s+reviews?|how\s+am\s+i\s+rated)/i, // Reviews
  /^(how\s+fast\s+do\s+i\s+respond|response\s+time)/i, // Response time
  /^(what\s+should\s+i\s+charge|pricing\s+suggest)/i, // Pricing suggestions
  /^(year.?over.?year|yoy|compared?\s+to\s+last\s+year)/i, // YoY comparison
  // ─── Communication platform question-shaped commands ───
  /^what('?s| are) (the )?business hours/i, // "What are my business hours?"
  /^(has|have) .+ (completed|finished|submitted) (the )?(onboarding|survey|feedback)/i, // "Has Sarah completed the onboarding?"
  /^what('?s| is) (the )?(payment|milestone) (status|schedule)/i, // "What's the payment schedule for..."
  /^(did|has) .+ (approve|approved) the menu/i, // "Did Sarah approve the menu?"
  /^what('?s| is) (the )?survey (results?|feedback|score)/i, // "What's the survey feedback from..."
  /^(is|are) auto[- ]?respon(se|der) (on|off|enabled|disabled|active)/i, // "Is auto-response enabled?"
  /^who('?s| has| is) (the )?(primary|event) contact/i, // "Who's the primary contact for..."
]

function tryDeterministicClassify(message: string): ClassificationResult | null {
  const trimmed = message.trim()

  // Question-shaped commands get caught first (they'd false-positive as questions)
  for (const pattern of QUESTION_SHAPED_COMMANDS) {
    if (pattern.test(trimmed)) {
      return { intent: 'command', confidence: 0.92 }
    }
  }

  // Check for command patterns
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: 'command', confidence: 0.95 }
    }
  }

  // Check for question patterns
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: 'question', confidence: 0.95 }
    }
  }

  // Mixed detection - message contains both question and command signals
  const hasQuestion = /\?/.test(trimmed)
  const hasCommandVerb =
    /\b(draft|write|create|send|find|check|search|make|generate|book|schedule|import)\b/i.test(
      trimmed
    )
  if (hasQuestion && hasCommandVerb && trimmed.length > 40) {
    return { intent: 'mixed', confidence: 0.85 }
  }

  // Short messages (< 4 words) without clear patterns - likely conversational (question)
  if (trimmed.split(/\s+/).length <= 3 && !hasCommandVerb) {
    return { intent: 'question', confidence: 0.8 }
  }

  // No confident match → fall through to Ollama
  return null
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function classifyIntent(message: string): Promise<ClassificationResult> {
  // Try deterministic classification first (instant, free, no LLM)
  const deterministic = tryDeterministicClassify(message)
  if (deterministic) {
    return deterministic
  }

  // Fall through to Ollama for ambiguous messages
  try {
    // Use 'complex' tier (30b conversation model) instead of 'fast' (4b)
    // to avoid model swap on 6GB VRAM. Remy streaming now uses the same tier,
    // eliminates the 60-100s model swap penalty that occurs every request.
    const result = await parseWithOllama(
      CLASSIFIER_SYSTEM_PROMPT,
      `Classify this message: "${message}"`,
      ClassificationSchema,
      { modelTier: 'complex', cache: true }
    )

    // Low confidence → default to question (safe)
    if (result.confidence < 0.6) {
      return { intent: 'question', confidence: result.confidence }
    }

    return {
      intent: result.intent,
      confidence: result.confidence,
      commandPart: result.commandPart,
      questionPart: result.questionPart,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[remy-classifier] Classification failed, defaulting to question:', err)
    return { intent: 'question', confidence: 0 }
  }
}
