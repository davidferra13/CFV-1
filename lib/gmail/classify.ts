// Email Classification — 5-Layer Deterministic Filter + Ollama Fallback
// PRIVACY: Processes known client email list + email body — must stay local.
//
// Classification order (each layer short-circuits if matched):
//   1. Platform detection (TakeAChef, Thumbtack, etc.) → dedicated parser
//   2. Gmail label check (SPAM, CATEGORY_PROMOTIONS, etc.) → marketing/spam
//   3. RFC header check (List-Unsubscribe, Precedence: bulk) → marketing
//   4. Heuristic check (known domains, noreply + body patterns) → marketing
//   5. Sender reputation (learned from chef's triage behavior) → marketing
//   6. Ollama AI classification (fallback when deterministic layers miss)

'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { isTakeAChefEmail } from './take-a-chef-parser'
import { isYhangryEmail } from './yhangry-parser'
import { isThumbtackEmail } from './thumbtack-parser'
import { isTheKnotEmail } from './theknot-parser'
import { isBarkEmail } from './bark-parser'
import { isCozymealEmail } from './cozymeal-parser'
import { isGigSaladEmail } from './gigsalad-parser'
import { isGoogleBusinessEmail } from './google-business-parser'
import { checkSenderReputation } from './sender-reputation'
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

/**
 * Check if an email is from any known platform with a dedicated parser.
 * Returns the platform name if detected, null otherwise.
 * Used to short-circuit Ollama classification — platform emails don't need AI.
 */
function detectPlatformEmail(fromAddress: string): string | null {
  if (isTakeAChefEmail(fromAddress)) return 'TakeAChef/Private Chef Manager'
  if (isYhangryEmail(fromAddress)) return 'Yhangry'
  if (isThumbtackEmail(fromAddress)) return 'Thumbtack'
  if (isTheKnotEmail(fromAddress)) return 'The Knot/WeddingWire'
  if (isBarkEmail(fromAddress)) return 'Bark'
  if (isCozymealEmail(fromAddress)) return 'Cozymeal'
  if (isGigSaladEmail(fromAddress)) return 'GigSalad'
  if (isGoogleBusinessEmail(fromAddress)) return 'Google Business'
  return null
}

/**
 * Layer 2: Check Gmail's own labels. Gmail classifies billions of emails —
 * its labels are the single most reliable spam/marketing signal available.
 */
function checkGmailLabels(labelIds: string[]): EmailClassification | null {
  if (!labelIds || labelIds.length === 0) return null

  if (labelIds.includes('SPAM')) {
    return {
      category: 'spam',
      confidence: 'high',
      reasoning: 'Gmail SPAM label detected',
      is_food_related: false,
    }
  }

  if (labelIds.includes('CATEGORY_PROMOTIONS')) {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: 'Gmail Promotions tab (CATEGORY_PROMOTIONS label)',
      is_food_related: false,
    }
  }

  if (labelIds.includes('CATEGORY_SOCIAL')) {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: 'Gmail Social tab (CATEGORY_SOCIAL label)',
      is_food_related: false,
    }
  }

  if (labelIds.includes('CATEGORY_UPDATES')) {
    return {
      category: 'marketing',
      confidence: 'medium',
      reasoning: 'Gmail Updates tab (CATEGORY_UPDATES label)',
      is_food_related: false,
    }
  }

  if (labelIds.includes('CATEGORY_FORUMS')) {
    return {
      category: 'marketing',
      confidence: 'medium',
      reasoning: 'Gmail Forums tab (CATEGORY_FORUMS label)',
      is_food_related: false,
    }
  }

  return null
}

/**
 * Layer 3: Check RFC email headers that definitively identify mailing lists.
 * List-Unsubscribe (RFC 2369) = the sender explicitly declares this is a mailing list.
 * Precedence: bulk/list = mass email indicator.
 */
function checkEmailHeaders(
  listUnsubscribe: string,
  precedence: string
): EmailClassification | null {
  if (listUnsubscribe) {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: 'List-Unsubscribe header present (RFC 2369 mailing list)',
      is_food_related: false,
    }
  }

  const prec = precedence.toLowerCase()
  if (prec === 'bulk' || prec === 'list' || prec === 'junk') {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: `Precedence: ${precedence} header (mass email indicator)`,
      is_food_related: false,
    }
  }

  return null
}

/**
 * Layer 4: Heuristic — known marketing domains + sender patterns + body signals.
 * Catches remaining marketing emails that Gmail labels and RFC headers missed.
 */
function isObviousMarketingOrNotification(
  fromAddress: string,
  subject: string,
  body: string
): string | null {
  const addr = fromAddress.toLowerCase()
  const subj = subject.toLowerCase()

  // noreply / no-reply / do-not-reply senders with marketing signals
  const isNoreply =
    /^(noreply|no-reply|do-not-reply|notifications?|alerts?|info|hello|team|support|marketing|account-services)@/.test(
      addr
    )

  // Known marketing/notification domains
  const marketingDomains = [
    'turbotax.intuit.com',
    'rocketmoney.com',
    'email.rocketmoney.com',
    'creditkarma.com',
    'airbnb.com',
    'ifttt.com',
    'notify.cloudflare.com',
    'mailchimpapp.com',
    'ssa.gov',
    'ngrok.com',
    'smartarget.online',
    'realnex.com',
    'inform.bill.com',
    'mc.bill.com',
    'messages.wix.com',
    'mail.replit.com',
    'apps-scripts-notifications@google.com',
    'forwarding-noreply@google.com',
    'accounts.google.com',
    'peakeventservices.com',
    'vendors.goodfynd.com',
  ]

  // Check exact domain matches
  for (const domain of marketingDomains) {
    if (addr.includes(domain)) {
      return `Known marketing/notification domain: ${domain}`
    }
  }

  // noreply senders that mention unsubscribe in subject or have marketing patterns
  if (
    isNoreply &&
    (subj.includes('unsubscribe') ||
      subj.includes('update') ||
      subj.includes('reminder') ||
      subj.includes('notification'))
  ) {
    return `Noreply sender with marketing subject pattern`
  }

  // Body-level unsubscribe detection — requires 2+ signals to avoid false positives
  const bodyLower = body.slice(0, 5000).toLowerCase()
  const unsubscribePatterns = [
    'unsubscribe',
    'opt out',
    'opt-out',
    'email preferences',
    'manage subscriptions',
    'manage your preferences',
    'update your email preferences',
    'you are receiving this email because',
    'you received this email because',
    'this is an automated message',
  ]
  const bodySignals = unsubscribePatterns.filter((p) => bodyLower.includes(p)).length

  if (isNoreply && bodySignals >= 1) {
    return 'Noreply sender with unsubscribe language in body'
  }

  if (bodySignals >= 2) {
    return `Multiple unsubscribe signals in body (${bodySignals} patterns matched)`
  }

  return null
}

export interface ClassifyEmailMetadata {
  labelIds?: string[]
  listUnsubscribe?: string
  precedence?: string
  tenantId?: string
}

export async function classifyEmail(
  subject: string,
  body: string,
  fromAddress: string,
  knownClientEmails: string[],
  metadata?: ClassifyEmailMetadata
): Promise<EmailClassification> {
  // ─── Layer 1: Platform detection ──────────────────────────────────────
  // Platform emails are handled by dedicated parsers — not by Ollama.
  const platformCheck = detectPlatformEmail(fromAddress)
  if (platformCheck) {
    return {
      category: 'inquiry',
      confidence: 'high',
      reasoning: `${platformCheck} email detected by sender domain — routed to dedicated parser`,
      is_food_related: true,
    }
  }

  // ─── Layer 2: Gmail label check ───────────────────────────────────────
  // Gmail classifies billions of emails — its labels are the most reliable signal.
  if (metadata?.labelIds) {
    const labelResult = checkGmailLabels(metadata.labelIds)
    if (labelResult) return labelResult
  }

  // ─── Layer 3: RFC header check ────────────────────────────────────────
  // List-Unsubscribe = mailing list by definition. Precedence: bulk = mass email.
  if (metadata?.listUnsubscribe || metadata?.precedence) {
    const headerResult = checkEmailHeaders(
      metadata.listUnsubscribe || '',
      metadata.precedence || ''
    )
    if (headerResult) return headerResult
  }

  // ─── Layer 4: Heuristic check ─────────────────────────────────────────
  // Known marketing domains + noreply patterns + body unsubscribe signals.
  const marketingCheck = isObviousMarketingOrNotification(fromAddress, subject, body)
  if (marketingCheck) {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: marketingCheck,
      is_food_related: false,
    }
  }

  // ─── Layer 5: Sender reputation ───────────────────────────────────────
  // Learned from the chef's triage behavior — domains they keep dismissing.
  if (metadata?.tenantId) {
    try {
      const domain = fromAddress.toLowerCase().split('@')[1]
      if (domain) {
        const reputationResult = await checkSenderReputation(metadata.tenantId, domain)
        if (reputationResult) return reputationResult
      }
    } catch (err) {
      // Non-blocking — reputation check failure should never block classification
      console.error('[Gmail Classify] Sender reputation check failed:', err)
    }
  }

  // ─── Layer 6: Ollama AI classification ────────────────────────────────
  // Fallback when all deterministic layers miss.
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
