// Converts a ScenarioClassification into prompt context for the AI draft engine.
// Reads the relevant skeleton from 08-INQUIRY_FIRST_RESPONSE.md logic
// and builds a concise instruction block.

import type { ScenarioClassification, InquiryScenario } from './inquiry-scenario'

// ─── Skeleton Summaries (condensed from 08-INQUIRY_FIRST_RESPONSE.md) ──────────

const SKELETON_INSTRUCTIONS: Record<InquiryScenario, string> = {
  new_direct: `SCENARIO: Brand new client, direct outreach.
STRUCTURE: (1) Confirm availability/interest. (2) Briefly state what you handle (cooking, plating, service, cleanup, equipment, plateware) and what they handle (table, silverware, beverages). (3) Explain custom menu process and per-person pricing structure (no dollar amounts yet). (4) Ask: guest count, dietary/allergies, food direction, occasion. (5) State next step: you'll put together menu ideas.
RULES: Don't list services like a brochure. Don't ask for address yet. Don't quote numbers. Be warm, not corporate.`,

  new_platform: `SCENARIO: New client from a booking platform. They may be comparing multiple chefs.
STRUCTURE: (1) Acknowledge their platform message. (2) Confirm availability. (3) Brief "what's included" (shorter than direct - they're reading multiple responses). (4) Ask ONLY what the platform didn't already capture. (5) One subtle differentiator (custom menus, personal service). (6) Next step.
RULES: Speed and conciseness matter. Don't repeat info from their form. Slightly more polished tone. Shorter than a direct inquiry response.`,

  fresh_referral: `SCENARIO: New client referred by someone (not a known client of yours).
STRUCTURE: (1) Acknowledge the referral warmly. (2) If referrer shared context, note it. (3) Brief what you handle. (4) Ask the 4 universals (count, dietary, food direction, occasion). (5) Next step.
RULES: Always name who referred them. Don't assume preferences. Warmer tone (they're pre-sold). Still need full discovery.`,

  friend_referral: `SCENARIO: New client referred by one of YOUR existing clients.
STRUCTURE: (1) Acknowledge the connection to your client. (2) If referrer shared context, note it. (3) Ask the 4 universals. (4) Next step.
RULES: Can be more casual (social proof established). Never say "I'll make what I made for your friend" unless they ask. Still need all discovery for this new person.`,

  one_time_rebook: `SCENARIO: Client you cooked for once before is rebooking.
STRUCTURE: (1) Confirm date, express that you're glad to cook for them again. (2) Reference last time naturally ("Had a great time last [when]"). (3) Key question: same kind of thing or switch it up? (4) Ask what changed: count, dietary updates, direction. (5) Next step: menu ideas.
RULES: SKIP "what I handle" explanation entirely. DO reference last event. Main question: same or different? Don't ask for address if same location.`,

  occasional_rebook: `SCENARIO: Client with 2-5 past events. You know them well.
STRUCTURE: (1) Confirm date briefly. (2) "Same setup or anything different this time?" (3) If needed: count, new dietary. (4) I'll get a menu together.
RULES: VERY short. No hand-holding. One compound question covers it. Trust they'll flag changes. No process explanation.`,

  regular_rebook: `SCENARIO: Loyal/champion client (6+ events or monthly). You know everything.
STRUCTURE: (1) Confirm date. (2) "How many?" if count varies. (3) "New menu or the hits?" (4) Done.
RULES: Shortest possible. 2-4 sentences max. Can suggest from history. Almost zero process talk.`,

  context_switch: `SCENARIO: Known client but NEW situation (different venue, group, occasion type, or scale).
STRUCTURE: (1) Familiar warm tone. (2) Acknowledge the new context. (3) Ask what's different: new location? new group dietary? different occasion? different scale? (4) Skip: what you bring, pricing, process. (5) Next step.
RULES: Treat NEW context as new discovery. Maintain familiar tone. "I know YOU but not THIS situation." If new venue: need kitchen info.`,

  middleman: `SCENARIO: Event planner, assistant, or corporate booker.
STRUCTURE: (1) Confirm receipt of their request. (2) Confirm availability. (3) Confirm scope understanding in writing. (4) Ask gaps. (5) "Who makes the food decisions?" (6) "Who's the onsite contact day-of?" (7) Next step: proposal/quote.
RULES: More structured, professional. Confirm scope in writing (protects both parties). Identify decision-maker early. Slightly more formal sign-off.`,
}

// ─── Build Scenario Context String ──────────────────────────────────────────────

export function buildScenarioContext(classification: ScenarioClassification): string {
  const skeleton = SKELETON_INSTRUCTIONS[classification.scenario]

  const parts: string[] = [skeleton]

  // What data is already known (don't ask for this)
  if (classification.knownData.length > 0) {
    parts.push(`\nALREADY KNOWN (do NOT ask about these): ${classification.knownData.join(', ')}`)
  }

  // What data is still missing (prioritize asking)
  if (classification.missingData.length > 0) {
    parts.push(`STILL NEED TO ASK: ${classification.missingData.join(', ')}`)
  }

  // What topics to skip
  if (classification.skipTopics.length > 0) {
    parts.push(`SKIP THESE TOPICS (client already knows): ${classification.skipTopics.join(', ')}`)
  }

  return parts.join('\n')
}
