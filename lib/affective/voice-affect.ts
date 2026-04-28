export type AffectiveRiskLevel = 'none' | 'low' | 'medium' | 'high'
export type AffectiveConfidence = 'low' | 'medium' | 'high'

export type AffectiveSignal =
  | 'friction'
  | 'urgency'
  | 'hesitation'
  | 'confusion'
  | 'price_sensitivity'
  | 'relief'
  | 'positive_interest'
  | 'operational_risk'

export interface AffectiveSignalEvidence {
  signal: AffectiveSignal
  label: string
  evidence: string[]
  reason: string
}

export interface AffectiveAnalysis {
  version: 1
  generated_at: string
  source: 'call' | 'voice_memo'
  risk_level: AffectiveRiskLevel
  confidence: AffectiveConfidence
  summary: string
  signals: AffectiveSignalEvidence[]
  recommended_action: string
  guardrail: string
}

interface AnalyzeVoiceAffectInput {
  transcript: string | null | undefined
  source: 'call' | 'voice_memo'
  role?: string | null
  direction?: string | null
  speechConfidence?: number | null
  now?: Date
}

interface SignalRule {
  signal: AffectiveSignal
  label: string
  reason: string
  weight: number
  patterns: RegExp[]
}

const SIGNAL_RULES: SignalRule[] = [
  {
    signal: 'friction',
    label: 'Friction',
    reason: 'The transcript contains correction, refusal, complaint, or apology language.',
    weight: 3,
    patterns: [
      /\b(no|not|never|can't|cannot|won't|wrong|problem|issue|complain|upset|angry|mad)\b/i,
      /\b(this is not|that's not|that is not|you said|i told|already told)\b/i,
      /\b(cancel|refund|unacceptable|disappointed|frustrated)\b/i,
    ],
  },
  {
    signal: 'urgency',
    label: 'Urgency',
    reason: 'The transcript uses time pressure or immediate response language.',
    weight: 3,
    patterns: [
      /\b(urgent|asap|right now|immediately|today|tonight|deadline|emergency)\b/i,
      /\b(need this|need it|have to|must have|by tomorrow|last minute)\b/i,
    ],
  },
  {
    signal: 'hesitation',
    label: 'Hesitation',
    reason: 'The transcript includes uncertainty or reluctance markers.',
    weight: 1,
    patterns: [
      /\b(maybe|not sure|i guess|kind of|sort of|probably|possibly|i think)\b/i,
      /\b(uh|um|hmm|let me think|i don't know)\b/i,
    ],
  },
  {
    signal: 'confusion',
    label: 'Confusion',
    reason: 'The transcript asks for clarification or says something is unclear.',
    weight: 2,
    patterns: [
      /\b(confused|unclear|don't understand|do not understand|what do you mean)\b/i,
      /\b(can you explain|repeat that|say that again|which one|what exactly)\b/i,
    ],
  },
  {
    signal: 'price_sensitivity',
    label: 'Price sensitivity',
    reason: 'The transcript references cost, price, budget, fees, or payment concern.',
    weight: 2,
    patterns: [
      /\b(price|cost|budget|expensive|cheap|fee|fees|charge|payment|deposit|invoice)\b/i,
      /\b(too much|can't afford|cannot afford|over budget|lower price)\b/i,
    ],
  },
  {
    signal: 'relief',
    label: 'Relief',
    reason: 'The transcript contains relief or reassurance language.',
    weight: -1,
    patterns: [/\b(great|perfect|awesome|wonderful|relieved|thank you|thanks|appreciate)\b/i],
  },
  {
    signal: 'positive_interest',
    label: 'Positive interest',
    reason: 'The transcript shows agreement, enthusiasm, or forward motion.',
    weight: -1,
    patterns: [
      /\b(yes|absolutely|definitely|sounds good|works for me|let's do it|excited)\b/i,
      /\b(love that|interested|book|confirm|go ahead)\b/i,
    ],
  },
  {
    signal: 'operational_risk',
    label: 'Operational risk',
    reason: 'The transcript mentions operational uncertainty, constraints, or availability risk.',
    weight: 3,
    patterns: [
      /\b(out of stock|sold out|unavailable|late|delay|delayed|missing|shortage)\b/i,
      /\b(allergy|allergic|restriction|parking|access|dock|loading|permit)\b/i,
    ],
  },
]

export function analyzeVoiceAffect(input: AnalyzeVoiceAffectInput): AffectiveAnalysis {
  const transcript = normalizeTranscript(input.transcript)
  const now = input.now ?? new Date()

  if (!transcript) {
    return {
      version: 1,
      generated_at: now.toISOString(),
      source: input.source,
      risk_level: 'none',
      confidence: 'low',
      summary: 'No affective signal available because no transcript was captured.',
      signals: [],
      recommended_action: 'Review the recording if one exists before taking action.',
      guardrail: guardrailText(),
    }
  }

  const signals = SIGNAL_RULES.map((rule) => {
    const evidence = collectEvidence(transcript, rule.patterns)
    if (evidence.length === 0) return null
    return {
      signal: rule.signal,
      label: rule.label,
      evidence,
      reason: rule.reason,
    }
  }).filter((signal): signal is AffectiveSignalEvidence => signal !== null)

  const score = signals.reduce((total, signal) => {
    const rule = SIGNAL_RULES.find((candidate) => candidate.signal === signal.signal)
    return total + (rule?.weight ?? 0)
  }, 0)

  const riskLevel = score >= 6 ? 'high' : score >= 3 ? 'medium' : score >= 1 ? 'low' : 'none'
  const confidence = computeConfidence(transcript, signals.length, input.speechConfidence)

  return {
    version: 1,
    generated_at: now.toISOString(),
    source: input.source,
    risk_level: riskLevel,
    confidence,
    summary: summarizeSignals(signals, riskLevel, input.role, input.direction),
    signals,
    recommended_action: recommendAction(signals, riskLevel),
    guardrail: guardrailText(),
  }
}

function normalizeTranscript(transcript: string | null | undefined): string {
  return (transcript ?? '').replace(/\s+/g, ' ').trim()
}

function collectEvidence(transcript: string, patterns: RegExp[]): string[] {
  const sentences = transcript
    .split(/(?<=[.!?])\s+|\s+-\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const evidence: string[] = []
  for (const sentence of sentences.length > 0 ? sentences : [transcript]) {
    if (patterns.some((pattern) => pattern.test(sentence))) {
      evidence.push(truncateEvidence(sentence))
    }
    if (evidence.length >= 2) break
  }
  return evidence
}

function truncateEvidence(value: string): string {
  if (value.length <= 140) return value
  return `${value.slice(0, 137).trim()}...`
}

function computeConfidence(
  transcript: string,
  signalCount: number,
  speechConfidence: number | null | undefined
): AffectiveConfidence {
  if (speechConfidence !== null && speechConfidence !== undefined && speechConfidence < 0.5) {
    return 'low'
  }
  if (transcript.length < 30) return 'low'
  if (signalCount >= 2 && transcript.length >= 80) return 'high'
  return signalCount > 0 ? 'medium' : 'low'
}

function summarizeSignals(
  signals: AffectiveSignalEvidence[],
  riskLevel: AffectiveRiskLevel,
  role?: string | null,
  direction?: string | null
): string {
  if (signals.length === 0) {
    return 'No meaningful affective risk signal detected in the transcript.'
  }

  const names = signals
    .map((signal) => signal.label.toLowerCase())
    .slice(0, 3)
    .join(', ')
  const context = [direction, role].filter(Boolean).join(' ')
  const contextPrefix = context ? `${context}: ` : ''
  return `${contextPrefix}${riskLevel} risk signal suggested by ${names}.`
}

function recommendAction(
  signals: AffectiveSignalEvidence[],
  riskLevel: AffectiveRiskLevel
): string {
  const signalSet = new Set(signals.map((signal) => signal.signal))

  if (riskLevel === 'high') {
    return 'Review the transcript before responding and consider a direct chef follow-up.'
  }
  if (signalSet.has('price_sensitivity')) {
    return 'Clarify scope, price, and payment expectations before moving the work forward.'
  }
  if (signalSet.has('confusion') || signalSet.has('hesitation')) {
    return 'Send a short clarification and confirm the next step.'
  }
  if (signalSet.has('urgency') || signalSet.has('operational_risk')) {
    return 'Check the operational dependency and confirm timing before assuming the task is safe.'
  }
  if (signalSet.has('positive_interest') || signalSet.has('relief')) {
    return 'Keep momentum, but verify the concrete next step before acting.'
  }
  return 'No special action needed beyond normal transcript review.'
}

function guardrailText(): string {
  return 'This is an evidence-based signal, not a claim about private emotion.'
}
