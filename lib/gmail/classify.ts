// Email Classification with Local Ollama
// PRIVACY: Processes known client email list + email body — must stay local.
// TakeAChef/Private Chef Manager emails are detected by sender domain and
// short-circuited BEFORE Ollama runs (no AI needed — consistent format).

'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { isTakeAChefEmail } from './take-a-chef-parser'
import type { EmailClassification } from './types'

const EmailClassificationSchema = z.object({
  classification: z.object({
    category: z.enum(['inquiry', 'existing_thread', 'personal', 'spam', 'marketing']),
    confidence: z.enum(['high', 'medium', 'low']),
    reasoning: z.string(),
    is_food_related: z.boolean(),
  }),
})

const CLASSIFICATION_SYSTEM_PROMPT = `You are an email classifier for a private chef's business inbox. Your job is to categorize each incoming email so the chef's AI agent knows how to handle it.

CATEGORIES:
- "inquiry": A NEW request about booking a private dinner, catering event, or chef services. Look for: date mentions, guest counts, occasion references (birthday, anniversary, dinner party), menu questions, dietary requirements, pricing questions, availability questions, or any "I'd like to book..." language.
- "existing_thread": A reply or follow-up to an ongoing conversation about a known booking or inquiry. This is a CONTINUATION, not a new inquiry. If the sender is in the known client list, lean toward this unless it's clearly a brand new request.
- "personal": A personal message unrelated to the chef's business. Family, friends, non-food topics.
- "marketing": Automated emails — newsletters, promotions, social media notifications, service updates, receipts from online purchases, subscription emails.
- "spam": Unsolicited junk, phishing attempts, or clearly irrelevant mass emails.

SIGNALS FOR "inquiry" (high confidence):
- Mentions a specific date or "sometime in [month]"
- Mentions number of guests or "dinner for X"
- Mentions an occasion (birthday, anniversary, holiday, corporate event)
- Asks about pricing, availability, or menus
- Mentions dietary restrictions or food allergies in context of a request
- Uses language like "I'd love to book", "are you available", "how much for", "we're planning"

SIGNALS AGAINST "inquiry":
- Sender is in the known client email list AND the email reads like a reply (lean toward "existing_thread")
- No mention of food, events, or booking
- Automated/template language with unsubscribe links (marketing)

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "classification": {
    "category": "inquiry|existing_thread|personal|spam|marketing",
    "confidence": "high|medium|low",
    "reasoning": "Brief explanation of why this classification was chosen",
    "is_food_related": true/false
  }
}`

export async function classifyEmail(
  subject: string,
  body: string,
  fromAddress: string,
  knownClientEmails: string[]
): Promise<EmailClassification> {
  // Short-circuit: TakeAChef / Private Chef Manager emails are handled by
  // the dedicated TakeAChef parser pipeline — not by Ollama classification.
  // We return a special classification that the sync pipeline checks for.
  if (isTakeAChefEmail(fromAddress)) {
    return {
      category: 'inquiry', // The sync pipeline will override routing via isTakeAChefEmail check
      confidence: 'high',
      reasoning:
        'TakeAChef/Private Chef Manager email detected by sender domain — routed to dedicated parser',
      is_food_related: true,
    }
  }

  const clientContext =
    knownClientEmails.length > 0
      ? `\nKNOWN CLIENT EMAILS: ${knownClientEmails.join(', ')}`
      : '\nNo known clients yet.'

  const emailContent = `${clientContext}

FROM: ${fromAddress}
SUBJECT: ${subject}

BODY:
${body.slice(0, 3000)}`

  try {
    const result = await parseWithOllama(
      CLASSIFICATION_SYSTEM_PROMPT,
      emailContent,
      EmailClassificationSchema,
      { modelTier: 'fast', cache: true }
    )
    return result.classification
  } catch (error) {
    if (error instanceof OllamaOfflineError) throw error
    console.error('[Gmail Classify] AI classification failed:', error)
    // Safe fallback: classify as personal with low confidence
    return {
      category: 'personal',
      confidence: 'low',
      reasoning: 'Classification failed — defaulting to personal',
      is_food_related: false,
    }
  }
}
