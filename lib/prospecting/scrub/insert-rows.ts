import { computeLeadScore } from '../lead-scoring'
import type { ProspectFromAIValue, ValidatedProspect } from './schemas'

export function buildAiScrubInsertRows(
  prospects: ValidatedProspect[],
  chefId: string,
  sessionId: string
) {
  return prospects.map((p) => ({
    chef_id: chefId,
    scrub_session_id: sessionId,
    name: p.name,
    prospect_type: p.prospectType,
    category: p.category,
    description: p.description || null,
    address: p.address || null,
    city: p.city || null,
    state: p.state || null,
    zip: p.zip || null,
    region: p.region || null,
    contact_person: p.contactPerson || null,
    contact_title: p.contactTitle || null,
    gatekeeper_notes: p.gatekeeperNotes || null,
    best_time_to_call: p.bestTimeToCall || null,
    annual_events_estimate: p.annualEventsEstimate || null,
    membership_size: p.membershipSize || null,
    avg_event_budget: p.avgEventBudget || null,
    event_types_hosted: p.eventTypesHosted?.length ? p.eventTypesHosted : null,
    seasonal_notes: p.seasonalNotes || null,
    luxury_indicators: p.luxuryIndicators?.length ? p.luxuryIndicators : null,
    talking_points: p.talkingPoints || null,
    approach_strategy: p.approachStrategy || null,
    competitors_present: p.competitorsPresent || null,
    source: 'ai_scrub' as const,
    verified: p.verified,
    lead_score: computeLeadScore({
      avgEventBudget: p.avgEventBudget,
      annualEventsEstimate: p.annualEventsEstimate,
      luxuryIndicators: p.luxuryIndicators,
      eventTypesHosted: p.eventTypesHosted,
      membershipSize: p.membershipSize,
      category: p.category,
      contactPerson: p.contactPerson,
      verified: p.verified,
    }),
  }))
}

export function buildCompetitorInsertRows(
  prospects: ProspectFromAIValue[],
  chefId: string,
  sessionId: string
) {
  return prospects.map((p) => ({
    chef_id: chefId,
    scrub_session_id: sessionId,
    name: p.name,
    prospect_type: p.prospectType,
    category: p.category,
    description: p.description || null,
    city: p.city || null,
    state: p.state || null,
    region: p.region || null,
    competitors_present: p.competitorsPresent || null,
    avg_event_budget: p.avgEventBudget || null,
    event_types_hosted: p.eventTypesHosted?.length ? p.eventTypesHosted : null,
    luxury_indicators: p.luxuryIndicators?.length ? p.luxuryIndicators : null,
    source: 'competitor_intel' as const,
    scrub_type: 'competitor' as const,
    verified: false,
    lead_score: computeLeadScore({
      avgEventBudget: p.avgEventBudget,
      eventTypesHosted: p.eventTypesHosted,
      luxuryIndicators: p.luxuryIndicators,
      category: p.category,
    }),
  }))
}

export function buildLookalikeInsertRows(
  prospects: ValidatedProspect[],
  chefId: string,
  sessionId: string,
  sourceProspectId: string
) {
  return prospects.map((p) => ({
    chef_id: chefId,
    scrub_session_id: sessionId,
    name: p.name,
    prospect_type: p.prospectType,
    category: p.category,
    description: p.description || null,
    address: p.address || null,
    city: p.city || null,
    state: p.state || null,
    zip: p.zip || null,
    region: p.region || null,
    contact_person: p.contactPerson || null,
    contact_title: p.contactTitle || null,
    annual_events_estimate: p.annualEventsEstimate || null,
    avg_event_budget: p.avgEventBudget || null,
    event_types_hosted: p.eventTypesHosted?.length ? p.eventTypesHosted : null,
    luxury_indicators: p.luxuryIndicators?.length ? p.luxuryIndicators : null,
    talking_points: p.talkingPoints || null,
    approach_strategy: p.approachStrategy || null,
    source: 'lookalike' as const,
    scrub_type: 'lookalike' as const,
    lookalike_source_id: sourceProspectId,
    verified: p.verified,
    lead_score: computeLeadScore({
      avgEventBudget: p.avgEventBudget,
      annualEventsEstimate: p.annualEventsEstimate,
      luxuryIndicators: p.luxuryIndicators,
      eventTypesHosted: p.eventTypesHosted,
      category: p.category,
      contactPerson: p.contactPerson,
      verified: p.verified,
    }),
  }))
}
