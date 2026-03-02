// Email Classification — 7-Layer Deterministic Filter + Ollama Fallback
// PRIVACY: Processes known client email list + email body — must stay local.
//
// Classification order (each layer short-circuits if matched):
//   1.   Platform detection (TakeAChef, Thumbtack, Wix Forms, etc.) → dedicated parser
//   1.5. Partner/referrer detection (Ember Brand Fire, etc.) → inquiry
//   2.   Gmail label check (SPAM, CATEGORY_PROMOTIONS, etc.) → marketing/spam
//   3.   RFC header check (List-Unsubscribe, Precedence: bulk) → marketing
//   4.   Heuristic check (known domains, noreply + body patterns) → marketing
//   4.5. Inquiry heuristic (Formula > AI — Airbnb referrals, dates, guests, etc.) → inquiry
//   5.   Sender reputation (learned from chef's triage behavior) → marketing
//   6.   Ollama AI classification (fallback when deterministic layers miss)

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
import { isWixFormsEmail } from './wix-forms-parser'
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

const CLASSIFICATION_SYSTEM_PROMPT = `You are an email classifier for a private chef's business inbox in Maine/New Hampshire. Your job is to categorize each incoming email so the chef's AI agent knows how to handle it.

CATEGORIES:
- "inquiry": A NEW request about booking a private dinner, catering event, or chef services. Look for: date mentions, guest counts, occasion references (birthday, anniversary, dinner party), menu questions, dietary requirements, pricing questions, availability questions, or any "I'd like to book..." language.
- "existing_thread": A reply or follow-up to an ongoing conversation about a known booking or inquiry. This is a CONTINUATION, not a new inquiry. If the sender is in the known client list, lean toward this unless it's clearly a brand new request.
- "personal": A personal message unrelated to the chef's business. Family, friends, non-food topics.
- "marketing": Automated emails — newsletters, promotions, social media notifications, service updates, receipts from online purchases, subscription emails.
- "spam": Unsolicited junk, phishing attempts, or clearly irrelevant mass emails.

SIGNALS FOR "inquiry" (high confidence):
- Mentions a specific date or "sometime in [month]"
- Mentions number of guests or "dinner for X"
- Mentions an occasion (birthday, anniversary, holiday, corporate event, team bonding)
- Asks about pricing, availability, or menus
- Mentions dietary restrictions or food allergies in context of a request
- Uses language like "I'd love to book", "are you available", "how much for", "we're planning"
- Mentions Airbnb, vacation rental, VRBO, or "the host recommended you" — this is the DOMINANT inquiry pattern for this chef
- Mentions Maine/NH locations (Portland, Kennebunk, Ogunquit, Naples, Harrison, North Conway, etc.)
- Mentions cannabis, THC, infused dining, or edibles — this chef offers cannabis-infused dining
- References the chef's website or says "I submitted a form/request"

SIGNALS FOR "existing_thread":
- Sender is in the known client email list AND the email reads like a reply
- Short replies: "sounds good", "works for us", "let's do that", "Wednesday works"
- Menu selections: "We'll go with the ribeye", "Let's do the salad and the steak"
- Logistics: parking directions, arrival time, address, "what time should you arrive"
- Payment discussion: "venmo or zelle", "do you need a deposit", price confirmations
- Post-event thank-you and feedback — "the meal was amazing", "thank you so much"

SIGNALS AGAINST "inquiry":
- Sender is in the known client email list AND the email reads like a reply (lean toward "existing_thread")
- Post-event gratitude — this is existing_thread, NOT a new inquiry
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
export function detectPlatformEmail(fromAddress: string): string | null {
  if (isTakeAChefEmail(fromAddress)) return 'TakeAChef/Private Chef Manager'
  if (isYhangryEmail(fromAddress)) return 'Yhangry'
  if (isThumbtackEmail(fromAddress)) return 'Thumbtack'
  if (isTheKnotEmail(fromAddress)) return 'The Knot/WeddingWire'
  if (isBarkEmail(fromAddress)) return 'Bark'
  if (isCozymealEmail(fromAddress)) return 'Cozymeal'
  if (isGigSaladEmail(fromAddress)) return 'GigSalad'
  if (isGoogleBusinessEmail(fromAddress)) return 'Google Business'
  if (isWixFormsEmail(fromAddress)) return 'Wix Forms'
  return null
}

/**
 * Layer 1.5: Partner/referrer domain detection.
 * Known business partners who refer clients (e.g., Ember Brand Fire).
 * These emails are always leads — route as inquiry with high confidence.
 *
 * Learned from GOLDMINE: 19 emails from emberbrandfire.com (Colleen Hartigan,
 * Chris Gasbarro) — event coordination, referrals, booking logistics.
 */
const PARTNER_DOMAINS: Record<string, string> = {
  'emberbrandfire.com': 'Ember Brand Fire',
}

export function detectPartnerEmail(fromAddress: string): string | null {
  const domain = fromAddress.toLowerCase().split('@')[1]
  return domain ? PARTNER_DOMAINS[domain] || null : null
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

/**
 * Layer 4.5: Deterministic inquiry heuristic.
 * Catches obvious inquiry signals BEFORE Ollama. Formula > AI rule.
 * Returns EmailClassification if enough signals converge, null otherwise.
 *
 * Based on real email data: 299 emails across 43 conversation threads.
 * Dominant patterns: Airbnb referral, date + guest count, occasion,
 * price/availability ask, dietary restrictions upfront, cannabis mention.
 */
export function detectObviousInquiry(
  fromAddress: string,
  subject: string,
  body: string,
  knownClientEmails: string[]
): EmailClassification | null {
  const addr = fromAddress.toLowerCase()
  const subj = subject.toLowerCase()
  const bodyLower = body.slice(0, 5000).toLowerCase()
  const text = `${subj} ${bodyLower}`

  // If sender is already a known client, skip — let Ollama decide between
  // existing_thread and new inquiry from a returning client
  if (knownClientEmails.some((e) => e.toLowerCase() === addr)) {
    return null
  }

  // ─── Signal scoring ───
  let score = 0
  const signals: string[] = []

  // Signal: Date mention (+1)
  const hasDate =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}/i.test(
      text
    ) ||
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(text) ||
    /\b(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend|month)\b/i.test(
      text
    )
  if (hasDate) {
    score += 1
    signals.push('date_mention')
  }

  // Signal: Guest count (+1)
  const hasGuestCount =
    /\b(?:dinner|party|event|celebration|gathering)\s+(?:for|of)\s+\d+/i.test(text) ||
    /\b\d+\s*(?:guests?|people|persons?|adults?|couples?)\b/i.test(text) ||
    /\b(?:just\s+)?(?:the\s+)?two\s+of\s+us\b/i.test(text) ||
    /\bfor\s+(?:my\s+)?(?:wife|husband|partner|family)\b/i.test(text) ||
    /\bdinner\s+for\s+(?:two|2)\b/i.test(text)
  if (hasGuestCount) {
    score += 1
    signals.push('guest_count')
  }

  // Signal: Occasion (+1)
  const hasOccasion =
    /\b(?:birthday|anniversary|wedding|rehearsal|retirement|graduation|engagement|baby\s*shower|bridal\s*shower|holiday|thanksgiving|christmas|new\s*year|valentine|memorial\s*day|labor\s*day|4th\s+of\s+july|fourth\s+of\s+july|team\s*bonding|corporate|bachelorette|bachelor)\b/i.test(
      text
    )
  if (hasOccasion) {
    score += 1
    signals.push('occasion')
  }

  // Signal: Price/availability/booking ask (+1)
  const hasPriceAsk =
    /\b(?:price|pricing|cost|rate|quote|estimate|how\s+much|what\s+(?:do\s+you|would\s+you)\s+charge|available|availability|book(?:ing)?|hire|looking\s+for\s+a\s+(?:private\s+)?chef)\b/i.test(
      text
    )
  if (hasPriceAsk) {
    score += 1
    signals.push('price_or_booking_ask')
  }

  // Signal: Airbnb/vacation rental referral (+2 — dominant inquiry pattern)
  const hasAirbnbRef =
    /\b(?:airbnb|air\s*b\s*n\s*b|vrbo|vacation\s+rental)\b/i.test(text) &&
    /\b(?:host|staying|renting|rental|property|cabin|cottage|lodge|house)\b/i.test(text)
  if (hasAirbnbRef) {
    score += 2
    signals.push('airbnb_referral')
  }

  // Signal: Referral language (+1)
  const hasReferral =
    /\b(?:recommended\s+(?:by|you)|referred|got\s+your\s+(?:name|number|contact|info)|heard\s+about\s+you|found\s+you|host\s+(?:provided|gave|suggested))\b/i.test(
      text
    )
  if (hasReferral) {
    score += 1
    signals.push('referral')
  }

  // Signal: Dietary/allergy mention (+1)
  const hasDietary =
    /\b(?:allerg(?:y|ies|ic)|gluten[- ]?free|celiac|vegan|vegetarian|dairy[- ]?free|nut[- ]?free|shellfish\s+allergy|kosher|halal|dietary|food\s+restrict|food\s+allerg|tree\s+nut)\b/i.test(
      text
    )
  if (hasDietary) {
    score += 1
    signals.push('dietary')
  }

  // Signal: Cannabis/THC/infused mention (+1)
  const hasCannabis = /\b(?:cannabis|thc|infused|edible|marijuana|420)\b/i.test(text)
  if (hasCannabis) {
    score += 1
    signals.push('cannabis')
  }

  // Signal: Local geography — Maine/NH (+1)
  const hasLocalGeo =
    /\b(?:maine|new\s+hampshire|portland|kennebunk(?:port)?|ogunquit|york|scarborough|cape\s+elizabeth|freeport|camden|rockport|bar\s+harbor|acadia|kittery|naples|harrison|norway|bridgton|portsmouth|hampton|north\s+conway|conway|lincoln|loon\s+mountain|bretton\s+woods|white\s+mountains|lake\s+winnipesaukee|meredith|wolfeboro|sunapee|tuftonboro|sullivan|dracut|ipswich|pepperell)\b/i.test(
      text
    )
  if (hasLocalGeo) {
    score += 1
    signals.push('local_geography')
  }

  // Signal: Website follow-up (+1)
  const hasWebsiteRef =
    /\b(?:(?:your|the)\s+website|through\s+(?:your|the)\s+(?:website|site)|(?:requested|submitted)\s+(?:a\s+)?(?:booking|inquiry|form)|(?:form|request)\s+(?:went\s+)?through)\b/i.test(
      text
    )
  if (hasWebsiteRef) {
    score += 1
    signals.push('website_followup')
  }

  // ─── Negative signals (prevent false-positive inquiry classification) ───
  // Learned from GOLDMINE: post-event feedback and logistics replies scored
  // positively on geography/date but are NOT new inquiries.
  let negativeScore = 0

  // Subject starts with Re: — reply, not a new inquiry
  if (/^Re:/i.test(subject)) {
    negativeScore += 1
  }

  // Post-event praise language (strong negative — this is a thank-you, not a booking)
  if (
    /\b(?:remarkable|outstanding|incredible|extraordinary|amazing|wonderful)\s+(?:meal|dinner|evening|feast|experience|time)\b/i.test(
      text
    ) ||
    /\b(?:every\s+single\s+bite|thought\s+about\s+(?:that|the)\s+(?:meal|dinner))\b/i.test(text)
  ) {
    negativeScore += 2
    signals.push('neg:post_event_praise')
  }

  // Thank-you / follow-up gratitude
  if (
    /\b(?:just\s+(?:had\s+to|wanted\s+to)\s+(?:circle\s+back|say|tell\s+you)|thank\s+you\s+(?:so\s+much|again)\s+for\s+(?:the|such))\b/i.test(
      text
    )
  ) {
    negativeScore += 2
    signals.push('neg:gratitude')
  }

  // Logistics confirmation (not a new inquiry — existing thread)
  if (
    /^Re:/i.test(subject) &&
    /\b(?:sounds\s+good|works\s+for\s+(?:us|me)|(?:let'?s|we'?ll)\s+(?:do\s+(?:that|it)|go\s+with)|perfect|confirmed|see\s+you\s+(?:then|there|on|at))\b/i.test(
      text
    )
  ) {
    negativeScore += 1
    signals.push('neg:logistics_reply')
  }

  // Apply negative signals: if they cancel out the positive score, defer to Ollama
  const netScore = score - negativeScore

  // ─── Threshold check ───
  if (netScore >= 3) {
    return {
      category: 'inquiry',
      confidence: 'high',
      reasoning: `Deterministic inquiry detection (score ${score}, net ${netScore}): ${signals.join(', ')}`,
      is_food_related: true,
    }
  }

  if (netScore >= 2) {
    return {
      category: 'inquiry',
      confidence: 'medium',
      reasoning: `Deterministic inquiry detection (score ${score}, net ${netScore}): ${signals.join(', ')}`,
      is_food_related: true,
    }
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

  // ─── Layer 1.5: Partner/referrer detection ───────────────────────────
  // Known business partners who refer clients. Always ingested as leads.
  const partnerCheck = detectPartnerEmail(fromAddress)
  if (partnerCheck) {
    return {
      category: 'inquiry',
      confidence: 'high',
      reasoning: `Partner referral detected: ${partnerCheck} — always ingested as lead`,
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

  // ─── Layer 4.5: Deterministic inquiry heuristic ─────────────────────
  // Formula > AI: catch obvious inquiries before Ollama.
  // Based on 299 real emails from Google Takeout analysis.
  const inquiryCheck = detectObviousInquiry(fromAddress, subject, body, knownClientEmails)
  if (inquiryCheck) return inquiryCheck

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
    // Safe fallback: classify as personal (not ingested into triage inbox).
    // The whitelist gate in sync.ts only ingests inquiry + existing_thread.
    return {
      category: 'personal',
      confidence: 'low',
      reasoning: 'Classification failed (Ollama error) — not ingested into triage',
      is_food_related: false,
    }
  }
}
