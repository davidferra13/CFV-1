import { parseWithOllama } from '@/lib/ai/parse-ollama'
import {
  SCRUB_SYSTEM_PROMPT,
  buildScrubUserPrompt,
  COMPETITOR_INTEL_SYSTEM_PROMPT,
  buildCompetitorIntelPrompt,
  LOOKALIKE_SYSTEM_PROMPT,
  buildLookalikePrompt,
} from '../scrub-prompt'
import { PHASE_1_TIMEOUT_MS } from './constants'
import { ProspectArrayFromAI } from './schemas'

export async function generateScrubProspects(query: string) {
  const wrappedPrompt =
    SCRUB_SYSTEM_PROMPT +
    '\n\nIMPORTANT: Wrap your output in a JSON object with key "prospects" containing the array. Example: { "prospects": [...] }'

  return parseWithOllama(wrappedPrompt, buildScrubUserPrompt(query), ProspectArrayFromAI, {
    timeoutMs: PHASE_1_TIMEOUT_MS,
  })
}

export async function extractProspectsFromCompetitorPage(params: {
  competitorName: string
  websiteContent: string
  region: string
}) {
  const wrappedPrompt =
    COMPETITOR_INTEL_SYSTEM_PROMPT +
    '\n\nIMPORTANT: Wrap your output in a JSON object with key "prospects" containing the array.'

  return parseWithOllama(wrappedPrompt, buildCompetitorIntelPrompt(params), ProspectArrayFromAI, {
    timeoutMs: 60_000,
  })
}

export async function generateLookalikeProspects(source: any) {
  const wrappedPrompt =
    LOOKALIKE_SYSTEM_PROMPT +
    '\n\nIMPORTANT: Wrap your output in a JSON object with key "prospects" containing the array.'

  return parseWithOllama(
    wrappedPrompt,
    buildLookalikePrompt({
      name: source.name,
      category: source.category,
      prospectType: source.prospect_type,
      city: source.city,
      state: source.state,
      region: source.region,
      avgEventBudget: source.avg_event_budget,
      eventTypesHosted: source.event_types_hosted,
      luxuryIndicators: source.luxury_indicators,
      description: source.description,
    }),
    ProspectArrayFromAI,
    { timeoutMs: PHASE_1_TIMEOUT_MS }
  )
}
