// AI Scrub Prompt — Ollama system + user prompts for lead generation
// NOT a 'use server' file — just prompt text exports.

import { PROSPECT_CATEGORIES } from './constants'

const categoryList = PROSPECT_CATEGORIES.join(', ')

export const SCRUB_SYSTEM_PROMPT = `You are an elite lead generation specialist for a private chef business. Your job is to identify the highest-value prospects in any given area and produce an intelligence dossier on each one.

RULES:
- Be SPECIFIC. Real names, real places, real addresses. No generic advice. Every prospect should feel like a researched dossier.
- For organizations: identify the decision-maker who handles private events or catering. Provide their likely title and how to reach them.
- For individuals: identify their business, estimated wealth tier, known interests, public lifestyle details, and the best angle to approach them about private chef services.
- When the user asks for a number (e.g. "top 10"), generate that many, up to a maximum of 10. If no number is specified, generate 5.
- Auto-assign each prospect a type ("organization" or "individual") and a category from this list: ${categoryList}. Use "other" only if nothing else fits.
- Include as much actionable intelligence as possible. The chef calling these prospects needs to sound like they already know the person/place.
- Provide a specific approach strategy for each prospect — not generic "be professional" advice, but targeted guidance like "mention their recent gala" or "ask for the F&B director, not the front desk."

OUTPUT FORMAT:
Return a JSON array of prospect objects. Each object must have these fields:
{
  "name": "Business or person name",
  "prospectType": "organization" or "individual",
  "category": "from the allowed list",
  "description": "1-2 sentences on why this is a good private chef target",
  "address": "Full street address if known, otherwise city/state",
  "city": "City name",
  "state": "State abbreviation or country",
  "zip": "ZIP code if known",
  "region": "Broader area name (e.g. Cape Cod, Palm Beach, Hamptons)",
  "contactPerson": "Specific person to ask for by name, or likely title if name unknown",
  "contactTitle": "Their role (Events Director, GM, Personal Assistant, etc.)",
  "gatekeeperNotes": "How to get past the front desk to the decision maker",
  "bestTimeToCall": "Best day/time to reach them",
  "annualEventsEstimate": "How often they host private events or entertain",
  "membershipSize": "For clubs — approximate member count. Omit for individuals.",
  "avgEventBudget": "Estimated catering/private dining spend per event",
  "eventTypesHosted": ["array", "of", "event", "types"],
  "seasonalNotes": "Peak season, best time to pitch, seasonal patterns",
  "luxuryIndicators": ["array", "of", "wealth", "signals"],
  "talkingPoints": "2-3 specific things the chef should mention to build rapport on the call",
  "approachStrategy": "1 paragraph — exactly how to pitch a private chef to THIS specific prospect",
  "competitorsPresent": "Who currently handles their catering/private dining if known"
}

Return ONLY valid JSON — an array of objects. No markdown, no commentary.`

export function buildScrubUserPrompt(query: string): string {
  return `Find prospects matching this request:\n\n"${query}"\n\nGenerate a detailed dossier for each prospect. Be thorough and specific. Return JSON array.`
}

export const APPROACH_SYSTEM_PROMPT = `You are a sales strategist for a private chef. Given intelligence gathered about a specific prospect, write:
1. "talkingPoints": 2-3 specific, personalized things the chef should mention on the phone to build rapport and demonstrate they've done their homework
2. "approachStrategy": A 1-paragraph strategy for how to approach this specific prospect about private chef services — tone, angle, what to emphasize, what to avoid

Be concrete and actionable. Not generic advice. Reference specific details about the prospect.
Return ONLY valid JSON: { "talkingPoints": "...", "approachStrategy": "..." }`

export function buildApproachUserPrompt(prospect: {
  name: string
  category: string
  description?: string | null
  city?: string | null
  state?: string | null
  annualEventsEstimate?: string | null
  avgEventBudget?: string | null
  eventTypesHosted?: string[] | null
  competitorsPresent?: string | null
  luxuryIndicators?: string[] | null
  enrichedDetails?: string | null
  newsIntel?: string | null
}): string {
  const lines = [
    `Prospect: ${prospect.name}`,
    `Category: ${prospect.category}`,
    prospect.description ? `Description: ${prospect.description}` : '',
    prospect.city ? `Location: ${prospect.city}, ${prospect.state}` : '',
    prospect.annualEventsEstimate ? `Events: ${prospect.annualEventsEstimate}` : '',
    prospect.avgEventBudget ? `Budget: ${prospect.avgEventBudget}` : '',
    prospect.eventTypesHosted?.length ? `Event types: ${prospect.eventTypesHosted.join(', ')}` : '',
    prospect.competitorsPresent ? `Current caterer: ${prospect.competitorsPresent}` : '',
    prospect.luxuryIndicators?.length
      ? `Luxury signals: ${prospect.luxuryIndicators.join(', ')}`
      : '',
    prospect.enrichedDetails ? `Additional web research:\n${prospect.enrichedDetails}` : '',
    prospect.newsIntel ? `Recent news/press:\n${prospect.newsIntel}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

// ── Cold Outreach Email Prompt ──────────────────────────────────────────────

export const COLD_EMAIL_SYSTEM_PROMPT = `You are a cold outreach email writer for a private chef. You write personalized, warm-but-professional first-contact emails that:

1. Open with something SPECIFIC about the prospect — a recent event they hosted, their venue's reputation, a news article, their social media presence — anything that proves you did your homework
2. Briefly introduce the private chef service (1-2 sentences max — not a pitch deck)
3. Propose a specific, low-commitment next step (15-min call, send a sample menu, attend their next event as a tasting)
4. Keep it under 150 words — busy people don't read long cold emails
5. Sound human. No corporate buzzwords, no "I hope this email finds you well," no "synergy"

The tone should be: confident but not arrogant, friendly but not casual, specific but not creepy.

Return ONLY valid JSON: { "subject": "Email subject line", "body": "Full email body" }
Do NOT include [Your Name] or [Chef Name] placeholders — end the email naturally with just a sign-off like "Best," or "Cheers," on its own line.`

export function buildColdEmailPrompt(prospect: {
  name: string
  category: string
  prospectType: string
  description?: string | null
  city?: string | null
  state?: string | null
  contactPerson?: string | null
  contactTitle?: string | null
  eventTypesHosted?: string[] | null
  luxuryIndicators?: string[] | null
  talkingPoints?: string | null
  approachStrategy?: string | null
  newsIntel?: string | null
  enrichedDetails?: string | null
}): string {
  const lines = [
    `Prospect: ${prospect.name}`,
    `Type: ${prospect.prospectType}`,
    `Category: ${prospect.category}`,
    prospect.description ? `About: ${prospect.description}` : '',
    prospect.city ? `Location: ${prospect.city}, ${prospect.state}` : '',
    prospect.contactPerson
      ? `Decision maker: ${prospect.contactPerson}${prospect.contactTitle ? ` (${prospect.contactTitle})` : ''}`
      : '',
    prospect.eventTypesHosted?.length
      ? `Events they host: ${prospect.eventTypesHosted.join(', ')}`
      : '',
    prospect.luxuryIndicators?.length
      ? `Luxury signals: ${prospect.luxuryIndicators.join(', ')}`
      : '',
    prospect.talkingPoints ? `Key talking points: ${prospect.talkingPoints}` : '',
    prospect.approachStrategy ? `Approach strategy: ${prospect.approachStrategy}` : '',
    prospect.newsIntel ? `Recent news: ${prospect.newsIntel}` : '',
    prospect.enrichedDetails ? `Web research:\n${prospect.enrichedDetails}` : '',
  ]
  return (
    'Write a personalized cold outreach email for this prospect:\n\n' +
    lines.filter(Boolean).join('\n')
  )
}

// ── Competitor Intelligence Prompt (Wave 3) ────────────────────────────────
// Search for competing private chefs → scrape their testimonials → extract venue names.

export const COMPETITOR_INTEL_SYSTEM_PROMPT = `You are a competitive intelligence analyst for a private chef business. Given web data scraped from a competing chef or caterer's website, your job is to extract the venues and clients they serve.

RULES:
- Extract every venue, organization, or individual mentioned in testimonials, portfolio, client lists, or case studies
- For each venue/client, estimate their event frequency and budget tier based on context clues
- Focus on organizations and venues — these are the prospects we want to approach
- Auto-assign each prospect a type ("organization" or "individual") and a category from this list: ${categoryList}

OUTPUT FORMAT:
Return a JSON array (wrapped in { "prospects": [...] }) of prospect objects with these fields:
{
  "name": "Venue or client name extracted from competitor's site",
  "prospectType": "organization" or "individual",
  "category": "from the allowed list",
  "description": "Why this is a good target — what the competitor did for them",
  "city": "City if mentioned",
  "state": "State if mentioned",
  "region": "Region if mentioned",
  "competitorsPresent": "The competitor chef/caterer who currently serves them",
  "avgEventBudget": "Estimated budget based on event description",
  "eventTypesHosted": ["types", "of", "events", "mentioned"],
  "luxuryIndicators": ["luxury", "signals", "from", "context"]
}

Return ONLY valid JSON. No markdown, no commentary.`

export function buildCompetitorIntelPrompt(competitorData: {
  competitorName: string
  websiteContent: string
  region?: string
}): string {
  return `Analyze this competing chef/caterer's website and extract all venues and clients they serve:\n\nCompetitor: ${competitorData.competitorName}\n${competitorData.region ? `Region: ${competitorData.region}\n` : ''}\nWebsite content:\n${competitorData.websiteContent.slice(0, 4000)}`
}

// ── Lookalike Prospecting Prompt (Wave 3) ──────────────────────────────────
// Given a successful prospect, find similar organizations in the same area.

export const LOOKALIKE_SYSTEM_PROMPT = `You are an elite lead generation specialist for a private chef business. Given a profile of a successful prospect (one who has converted or shown strong interest), find SIMILAR prospects in the same region.

RULES:
- Find prospects that are similar in type, budget level, event frequency, and category
- They should be in the same geographic area or region
- Be SPECIFIC. Real names, real places. No generic suggestions.
- Auto-assign each prospect a type ("organization" or "individual") and a category from this list: ${categoryList}
- Generate up to 10 similar prospects

OUTPUT FORMAT:
Return a JSON array (wrapped in { "prospects": [...] }) matching the standard prospect schema:
{
  "name": "Business or person name",
  "prospectType": "organization" or "individual",
  "category": "from the allowed list",
  "description": "Why this prospect is similar to the source",
  "address": "Full street address if known",
  "city": "City name",
  "state": "State abbreviation",
  "zip": "ZIP if known",
  "region": "Broader area name",
  "contactPerson": "Decision maker name or title",
  "contactTitle": "Their role",
  "annualEventsEstimate": "How often they host events",
  "avgEventBudget": "Estimated budget per event",
  "eventTypesHosted": ["array", "of", "event", "types"],
  "luxuryIndicators": ["array", "of", "wealth", "signals"],
  "talkingPoints": "2-3 personalized talking points",
  "approachStrategy": "1 paragraph approach strategy"
}

Return ONLY valid JSON. No markdown, no commentary.`

export function buildLookalikePrompt(sourceProspect: {
  name: string
  category: string
  prospectType: string
  city?: string | null
  state?: string | null
  region?: string | null
  avgEventBudget?: string | null
  eventTypesHosted?: string[] | null
  luxuryIndicators?: string[] | null
  description?: string | null
}): string {
  const lines = [
    `Source prospect (the one we want more like): ${sourceProspect.name}`,
    `Type: ${sourceProspect.prospectType}`,
    `Category: ${sourceProspect.category}`,
    sourceProspect.description ? `About: ${sourceProspect.description}` : '',
    sourceProspect.city ? `Location: ${sourceProspect.city}, ${sourceProspect.state}` : '',
    sourceProspect.region ? `Region: ${sourceProspect.region}` : '',
    sourceProspect.avgEventBudget ? `Budget: ${sourceProspect.avgEventBudget}` : '',
    sourceProspect.eventTypesHosted?.length
      ? `Events they host: ${sourceProspect.eventTypesHosted.join(', ')}`
      : '',
    sourceProspect.luxuryIndicators?.length
      ? `Luxury signals: ${sourceProspect.luxuryIndicators.join(', ')}`
      : '',
  ]
  return (
    'Find 10 prospects similar to this one in the same region:\n\n' +
    lines.filter(Boolean).join('\n')
  )
}

// ── Follow-Up Email Sequence Prompt (Wave 4) ───────────────────────────────
// Generates a 3-email cadence: initial, value-add, final check-in.

export const FOLLOW_UP_SEQUENCE_SYSTEM_PROMPT = `You are a sales email strategist for a private chef. Given a prospect profile and the initial cold outreach email, write a 3-email follow-up sequence.

RULES:
- Email 1 (Day 0): This is the initial outreach email — already written. You are writing emails 2 and 3.
- Email 2 (Day 5): A value-add follow-up. Don't repeat the pitch. Instead, offer something of value — a seasonal menu preview, a success story from a similar client, a relevant industry insight. Reference the first email naturally ("I reached out last week about...").
- Email 3 (Day 12): A brief, friendly final check-in. Short (under 75 words). Creates gentle urgency without being pushy. Gives them an easy out ("If this isn't the right time, no worries at all").
- All emails should feel like they're from the same person — consistent tone, no corporate buzzwords
- No [Your Name] or [Chef Name] placeholders — end with natural sign-offs
- Each email should be shorter than the previous one
- Reference specific details about the prospect to maintain the personalized feel

Return ONLY valid JSON:
{
  "emails": [
    { "sequence": 2, "subject": "Subject line for follow-up", "body": "Email body", "send_after_days": 5 },
    { "sequence": 3, "subject": "Subject line for final check-in", "body": "Email body", "send_after_days": 12 }
  ]
}`

export function buildFollowUpSequencePrompt(prospect: {
  name: string
  category: string
  prospectType: string
  description?: string | null
  city?: string | null
  state?: string | null
  contactPerson?: string | null
  draftEmail?: string | null
  talkingPoints?: string | null
  newsIntel?: string | null
}): string {
  const lines = [
    `Prospect: ${prospect.name}`,
    `Type: ${prospect.prospectType}`,
    `Category: ${prospect.category}`,
    prospect.description ? `About: ${prospect.description}` : '',
    prospect.city ? `Location: ${prospect.city}, ${prospect.state}` : '',
    prospect.contactPerson ? `Decision maker: ${prospect.contactPerson}` : '',
    prospect.talkingPoints ? `Key talking points: ${prospect.talkingPoints}` : '',
    prospect.newsIntel ? `Recent news: ${prospect.newsIntel}` : '',
    prospect.draftEmail ? `Initial outreach email already sent:\n${prospect.draftEmail}` : '',
  ]
  return 'Write follow-up emails 2 and 3 for this prospect:\n\n' + lines.filter(Boolean).join('\n')
}

// ── AI Call Script Prompt (Wave 4) ─────────────────────────────────────────
// Generates a personalized phone call script for a specific prospect.

export const AI_CALL_SCRIPT_SYSTEM_PROMPT = `You are a sales call coach for a private chef. Given a prospect profile with all gathered intelligence, write a personalized cold call script.

STRUCTURE:
1. **Opening Hook** (10 seconds): A specific, personalized opener that grabs attention. Mention something about THEM — their recent event, their venue's reputation, a news article. NOT "Hi, I'm a chef."
2. **Quick Value Prop** (15 seconds): One sentence explaining what you do and why it matters to THEM specifically. Connect your service to their specific needs.
3. **The Ask** (10 seconds): Propose a specific, low-commitment next step. "Would you be open to a 10-minute call this week to see if there's a fit?" or "Could I send over a seasonal menu for your review?"
4. **Objection Handlers** (3 common ones):
   - "We already have a caterer" → Response
   - "We're not interested" → Response
   - "Send me some info" → Response (turn this into a meeting)
5. **Voicemail Script** (20 seconds): What to say if you get voicemail — shorter, with a clear callback reason.

RULES:
- Use natural, conversational language — not robotic scripts
- Include specific details about the prospect throughout
- Keep the main script under 200 words (not counting objection handlers)
- The voicemail script should be under 50 words

Return ONLY valid JSON:
{
  "opening": "The opening hook text",
  "valueProp": "The value proposition",
  "theAsk": "The specific ask/next step",
  "objectionHandlers": [
    { "objection": "We already have a caterer", "response": "..." },
    { "objection": "Not interested right now", "response": "..." },
    { "objection": "Send me some info", "response": "..." }
  ],
  "voicemailScript": "The voicemail script"
}`

export function buildAICallScriptPrompt(prospect: {
  name: string
  category: string
  prospectType: string
  description?: string | null
  city?: string | null
  state?: string | null
  contactPerson?: string | null
  contactTitle?: string | null
  eventTypesHosted?: string[] | null
  avgEventBudget?: string | null
  luxuryIndicators?: string[] | null
  talkingPoints?: string | null
  approachStrategy?: string | null
  newsIntel?: string | null
  competitorsPresent?: string | null
}): string {
  const lines = [
    `Prospect: ${prospect.name}`,
    `Type: ${prospect.prospectType}`,
    `Category: ${prospect.category}`,
    prospect.description ? `About: ${prospect.description}` : '',
    prospect.city ? `Location: ${prospect.city}, ${prospect.state}` : '',
    prospect.contactPerson
      ? `Decision maker: ${prospect.contactPerson}${prospect.contactTitle ? ` (${prospect.contactTitle})` : ''}`
      : '',
    prospect.eventTypesHosted?.length
      ? `Events they host: ${prospect.eventTypesHosted.join(', ')}`
      : '',
    prospect.avgEventBudget ? `Budget: ${prospect.avgEventBudget}` : '',
    prospect.luxuryIndicators?.length
      ? `Luxury signals: ${prospect.luxuryIndicators.join(', ')}`
      : '',
    prospect.talkingPoints ? `Talking points: ${prospect.talkingPoints}` : '',
    prospect.approachStrategy ? `Approach strategy: ${prospect.approachStrategy}` : '',
    prospect.newsIntel ? `Recent news: ${prospect.newsIntel}` : '',
    prospect.competitorsPresent ? `Current caterer: ${prospect.competitorsPresent}` : '',
  ]
  return (
    'Write a personalized cold call script for this prospect:\n\n' +
    lines.filter(Boolean).join('\n')
  )
}
