import type {
  CulinaryRadarRelevanceInput,
  CulinaryRadarRelevanceResult,
  CulinaryRadarSeverity,
  CulinaryRadarSeverityInput,
} from './types'

const PUBLISH_THRESHOLD = 60

const RELEVANCE_SIGNALS = [
  { key: 'allergen', pattern: /\ballergen|allergy|undeclared\b/i, points: 25 },
  { key: 'catering', pattern: /\bcatering|caterer|banquet\b/i, points: 20 },
  { key: 'food service', pattern: /\bfood service|restaurant|commercial kitchen\b/i, points: 25 },
  { key: 'recall', pattern: /\brecall|withdrawal|safety alert\b/i, points: 10 },
  { key: 'supplier', pattern: /\bsupplier|distribution\b/i, points: 15 },
  { key: 'training', pattern: /\btraining|webinar|certification|education\b/i, points: 10 },
]

export function assessRadarSeverity(input: CulinaryRadarSeverityInput): CulinaryRadarSeverity {
  const text = searchableText(input.title, input.summary, input.tags)

  if (
    input.sourceAuthority === 'regulatory' &&
    /\bclass\s*i\b|\brecall\b|\boutbreak\b|\bundeclared\b|\ballergen\b/.test(text)
  ) {
    return 'critical'
  }

  if (/\boutbreak\b|\bcontamination\b|\bcontaminated\b|\bimmediate health risk\b/.test(text)) {
    return 'high'
  }

  if (
    input.sourceAuthority === 'relief' &&
    /\bemergency\b|\bdisaster\b|\bresponse\b|\bfeeding operations\b/.test(text)
  ) {
    return 'medium'
  }

  if (/\btraining\b|\bwebinar\b|\bcertification\b|\bguidance\b/.test(text)) {
    return 'medium'
  }

  return 'low'
}

export function assessRadarRelevance(
  input: CulinaryRadarRelevanceInput
): CulinaryRadarRelevanceResult {
  const text = searchableText(input.title, input.summary, input.tags)
  const matchedSignals: string[] = []
  let score = 15

  for (const signal of RELEVANCE_SIGNALS) {
    if (signal.pattern.test(text)) {
      matchedSignals.push(signal.key)
      score += signal.points
    }
  }

  score = Math.min(score, 100)

  return {
    score,
    publishable: score >= PUBLISH_THRESHOLD,
    matchedSignals,
  }
}

export function shouldPublishRadarItem(result: CulinaryRadarRelevanceResult): boolean {
  return result.publishable && result.score >= PUBLISH_THRESHOLD
}

function searchableText(title: string, summary: string, tags: string[] = []): string {
  return `${title} ${summary} ${tags.join(' ')}`.toLowerCase()
}
