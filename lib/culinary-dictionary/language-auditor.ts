import { normalizeCulinaryTerm } from './normalization'
import type { CulinaryDictionaryTerm, DictionaryTermType } from './types'

export type CulinaryLanguageAuditSurface = 'menu' | 'staff_prep'

export type CulinaryLanguageAuditFindingType =
  | 'repeated_adjective'
  | 'vague_word'
  | 'unresolved_term'
  | 'missing_signal'
  | 'staff_prep_ambiguity'

export type CulinaryLanguageAuditSeverity = 'info' | 'caution' | 'critical'

export type CulinaryLanguageAuditFinding = {
  id: string
  type: CulinaryLanguageAuditFindingType
  severity: CulinaryLanguageAuditSeverity
  message: string
  evidence: string
  hint: string
  href?: string
  termType?: DictionaryTermType | 'temperature'
}

export type CulinaryLanguageAuditInput = {
  text: string
  dictionaryTerms: CulinaryDictionaryTerm[]
  surface?: CulinaryLanguageAuditSurface
  requiredSignals?: Array<'texture' | 'flavor' | 'temperature'>
}

export type CulinaryLanguageAuditResult = {
  surface: CulinaryLanguageAuditSurface
  normalizedText: string
  matchedTerms: Array<{
    canonicalName: string
    canonicalSlug: string
    termType: DictionaryTermType
  }>
  findings: CulinaryLanguageAuditFinding[]
}

type ControlledTerm = {
  canonicalName: string
  canonicalSlug: string
  termType: DictionaryTermType
  normalizedValues: string[]
}

const DEFAULT_REQUIRED_SIGNALS: Array<'texture' | 'flavor' | 'temperature'> = [
  'texture',
  'flavor',
  'temperature',
]

const VAGUE_WORDS = new Set([
  'amazing',
  'awesome',
  'beautiful',
  'best',
  'delicious',
  'elevated',
  'excellent',
  'fancy',
  'fresh',
  'great',
  'house',
  'local',
  'lovely',
  'nice',
  'perfect',
  'premium',
  'seasonal',
  'signature',
  'special',
  'tasty',
])

const COMMON_ADJECTIVES = new Set([
  ...VAGUE_WORDS,
  'bright',
  'crisp',
  'crispy',
  'creamy',
  'crunchy',
  'deep',
  'golden',
  'green',
  'herbal',
  'hot',
  'juicy',
  'light',
  'rich',
  'roasted',
  'savory',
  'silky',
  'smoky',
  'soft',
  'spicy',
  'sweet',
  'tender',
  'warm',
])

const TEXTURE_WORDS = new Set([
  'al dente',
  'crisp',
  'crispy',
  'crunchy',
  'creamy',
  'silky',
  'smooth',
  'tender',
  'velvety',
])

const FLAVOR_WORDS = new Set([
  'acidic',
  'bitter',
  'bright',
  'herbal',
  'salty',
  'savory',
  'smoky',
  'sour',
  'spicy',
  'sweet',
  'tart',
  'umami',
])

const TEMPERATURE_WORDS = new Set([
  'ambient',
  'chilled',
  'cold',
  'cool',
  'hot',
  'room temperature',
  'warm',
])

const STAFF_AMBIGUITY_PATTERNS: Array<{ pattern: RegExp; evidence: string; hint: string }> = [
  {
    pattern: /\b(as needed|as desired|to taste|some|a little|a few)\b/i,
    evidence: 'open quantity',
    hint: 'Add a measurable quantity, range, or chef-approved station standard.',
  },
  {
    pattern: /\b(until done|until ready|cook through|finish cooking|properly cooked)\b/i,
    evidence: 'unclear doneness',
    hint: 'Add the controlled doneness, temperature, or visual cue staff should verify.',
  },
  {
    pattern: /\b(prep|prepare|handle|set up|finish|make)\b/i,
    evidence: 'generic prep verb',
    hint: 'Use a specific controlled vocabulary term for the technique, station action, or service state.',
  },
  {
    pattern: /\b(cut|slice|chop|dice)\b/i,
    evidence: 'unspecified knife cut',
    hint: 'Link the exact cut term in the dictionary, such as brunoise or julienne when that is what the chef intends.',
  },
  {
    pattern: /\b(garnish|plate|portion)\b/i,
    evidence: 'service action without standard',
    hint: 'Add the count, placement, vessel, or service standard staff should follow.',
  },
]

const CULINARY_CANDIDATE_WORDS = new Set([
  'aioli',
  'brunoise',
  'chiffonade',
  'confit',
  'coulis',
  'demi',
  'emulsion',
  'fond',
  'ganache',
  'gremolata',
  'julienne',
  'kimchi',
  'mirepoix',
  'nappe',
  'pickled',
  'puree',
  'reduction',
  'remoulade',
  'roux',
  'salsa',
  'sofrito',
  'vinaigrette',
])

const WORD_PATTERN = /[a-z][a-z']*/gi

export function auditCulinaryLanguage(
  input: CulinaryLanguageAuditInput,
): CulinaryLanguageAuditResult {
  const surface = input.surface ?? 'menu'
  const normalizedText = normalizeCulinaryTerm(input.text)
  const controlledTerms = buildControlledTerms(input.dictionaryTerms)
  const matchedTerms = findMatchedTerms(normalizedText, controlledTerms)
  const coveredValues = new Set(controlledTerms.flatMap((term) => term.normalizedValues))
  const findings: CulinaryLanguageAuditFinding[] = []

  findings.push(...findRepeatedAdjectives(input.text))
  findings.push(...findVagueWords(input.text))
  findings.push(...findUnresolvedTerms(input.text, coveredValues))
  findings.push(
    ...findMissingSignals(
      normalizedText,
      matchedTerms,
      input.requiredSignals ?? DEFAULT_REQUIRED_SIGNALS,
    ),
  )

  if (surface === 'staff_prep') {
    findings.push(...findStaffPrepAmbiguity(input.text))
  }

  return {
    surface,
    normalizedText,
    matchedTerms: matchedTerms.map((term) => ({
      canonicalName: term.canonicalName,
      canonicalSlug: term.canonicalSlug,
      termType: term.termType,
    })),
    findings: findings.map((finding, index) => ({
      ...finding,
      id: `${finding.type}-${index + 1}`,
    })),
  }
}

export function getDictionarySearchHref(query: string): string {
  return `/culinary/dictionary?q=${encodeURIComponent(query.trim())}`
}

function buildControlledTerms(terms: CulinaryDictionaryTerm[]): ControlledTerm[] {
  return terms.map((term) => {
    const normalizedValues = new Set([
      normalizeCulinaryTerm(term.canonicalName),
      term.canonicalSlug.replace(/-/g, ' '),
      ...term.aliases.map((alias) => alias.normalizedAlias || normalizeCulinaryTerm(alias.alias)),
      ...term.aliases.map((alias) => normalizeCulinaryTerm(alias.alias)),
    ])

    normalizedValues.delete('')

    return {
      canonicalName: term.canonicalName,
      canonicalSlug: term.canonicalSlug,
      termType: term.termType,
      normalizedValues: [...normalizedValues],
    }
  })
}

function findMatchedTerms(
  normalizedText: string,
  terms: ControlledTerm[],
): ControlledTerm[] {
  return terms.filter((term) =>
    term.normalizedValues.some((value) => containsNormalizedPhrase(normalizedText, value)),
  )
}

function findRepeatedAdjectives(text: string): CulinaryLanguageAuditFinding[] {
  const counts = new Map<string, number>()

  for (const word of extractWords(text)) {
    if (!COMMON_ADJECTIVES.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([word, count]) => ({
      id: '',
      type: 'repeated_adjective' as const,
      severity: 'caution' as const,
      message: `Repeated adjective "${word}" appears ${count} times.`,
      evidence: word,
      hint: 'Replace repetition with a controlled dictionary term for the actual texture, flavor, temperature, or technique.',
      href: getDictionarySearchHref(word),
    }))
}

function findVagueWords(text: string): CulinaryLanguageAuditFinding[] {
  const seen = new Set<string>()
  const findings: CulinaryLanguageAuditFinding[] = []

  for (const word of extractWords(text)) {
    if (!VAGUE_WORDS.has(word) || seen.has(word)) continue
    seen.add(word)
    findings.push({
      id: '',
      type: 'vague_word',
      severity: 'info',
      message: `Vague word "${word}" needs a verifiable culinary signal.`,
      evidence: word,
      hint: 'Search the dictionary for a precise controlled term instead of adding new copy.',
      href: getDictionarySearchHref(word),
    })
  }

  return findings
}

function findUnresolvedTerms(
  text: string,
  coveredValues: Set<string>,
): CulinaryLanguageAuditFinding[] {
  const unresolved = new Set<string>()

  for (const phrase of extractQuotedPhrases(text)) {
    const normalizedPhrase = normalizeCulinaryTerm(phrase)
    if (normalizedPhrase && !coveredValues.has(normalizedPhrase)) {
      unresolved.add(phrase.trim())
    }
  }

  for (const word of extractWords(text)) {
    if (!CULINARY_CANDIDATE_WORDS.has(word)) continue
    if (isCoveredByControlledValue(word, coveredValues)) continue
    unresolved.add(word)
  }

  return [...unresolved].map((term) => ({
    id: '',
    type: 'unresolved_term' as const,
    severity: 'caution' as const,
    message: `Unresolved culinary term "${term}" is not in the supplied controlled vocabulary.`,
    evidence: term,
    hint: 'Search the dictionary, then approve an existing term or send this term to review.',
    href: getDictionarySearchHref(term),
  }))
}

function findMissingSignals(
  normalizedText: string,
  matchedTerms: ControlledTerm[],
  requiredSignals: Array<'texture' | 'flavor' | 'temperature'>,
): CulinaryLanguageAuditFinding[] {
  const findings: CulinaryLanguageAuditFinding[] = []

  if (requiredSignals.includes('texture') && !hasSignal(normalizedText, matchedTerms, 'texture')) {
    findings.push({
      id: '',
      type: 'missing_signal',
      severity: 'info',
      message: 'Missing texture signal.',
      evidence: 'texture',
      termType: 'texture',
      hint: 'Search the dictionary for an existing texture term that is already approved.',
      href: getDictionarySearchHref('texture'),
    })
  }

  if (requiredSignals.includes('flavor') && !hasSignal(normalizedText, matchedTerms, 'flavor')) {
    findings.push({
      id: '',
      type: 'missing_signal',
      severity: 'info',
      message: 'Missing flavor signal.',
      evidence: 'flavor',
      termType: 'flavor',
      hint: 'Search the dictionary for an existing flavor term that is already approved.',
      href: getDictionarySearchHref('flavor'),
    })
  }

  if (
    requiredSignals.includes('temperature') &&
    !hasLexicalSignal(normalizedText, TEMPERATURE_WORDS)
  ) {
    findings.push({
      id: '',
      type: 'missing_signal',
      severity: 'info',
      message: 'Missing temperature signal.',
      evidence: 'temperature',
      termType: 'temperature',
      hint: 'Search the dictionary for a service-temperature term or add a reviewed staff standard.',
      href: getDictionarySearchHref('temperature'),
    })
  }

  return findings
}

function findStaffPrepAmbiguity(text: string): CulinaryLanguageAuditFinding[] {
  return STAFF_AMBIGUITY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ evidence, hint }) => ({
      id: '',
      type: 'staff_prep_ambiguity' as const,
      severity: 'critical' as const,
      message: `Staff prep copy has ${evidence}.`,
      evidence,
      hint,
      href: getDictionarySearchHref(evidence),
    }),
  )
}

function hasSignal(
  normalizedText: string,
  matchedTerms: ControlledTerm[],
  termType: Extract<DictionaryTermType, 'texture' | 'flavor'>,
): boolean {
  return (
    matchedTerms.some((term) => term.termType === termType) ||
    hasLexicalSignal(normalizedText, termType === 'texture' ? TEXTURE_WORDS : FLAVOR_WORDS)
  )
}

function hasLexicalSignal(normalizedText: string, signals: Set<string>): boolean {
  for (const signal of signals) {
    if (containsNormalizedPhrase(normalizedText, signal)) return true
  }

  return false
}

function containsNormalizedPhrase(normalizedText: string, normalizedPhrase: string): boolean {
  if (!normalizedText || !normalizedPhrase) return false
  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normalizedText)
}

function isCoveredByControlledValue(word: string, coveredValues: Set<string>): boolean {
  for (const value of coveredValues) {
    if (containsNormalizedPhrase(value, word) || normalizeCulinaryTerm(word) === value) return true
  }

  return false
}

function extractWords(text: string): string[] {
  return [...text.matchAll(WORD_PATTERN)].map((match) => normalizeCulinaryTerm(match[0]))
}

function extractQuotedPhrases(text: string): string[] {
  return [...text.matchAll(/["']([^"']{2,80})["']/g)].map((match) => match[1] ?? '')
}
