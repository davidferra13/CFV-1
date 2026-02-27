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
