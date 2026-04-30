export type FrustrationSignal = {
  term: string
  severity: 'medium' | 'high'
  reason: string
}

export type FrustrationScan = {
  conservativeMode: boolean
  signals: FrustrationSignal[]
  planGuidance: string
}

const SIGNALS: FrustrationSignal[] = [
  {
    term: 'again',
    severity: 'medium',
    reason: 'The task may be repeating prior failed work.',
  },
  {
    term: 'still broken',
    severity: 'high',
    reason: 'The user is reporting unresolved failure.',
  },
  {
    term: 'stop guessing',
    severity: 'high',
    reason: 'The user needs evidence-first execution.',
  },
  {
    term: 'why is this not done',
    severity: 'high',
    reason: 'The user is signaling delivery frustration.',
  },
  {
    term: 'same error',
    severity: 'high',
    reason: 'The task may be in a repeated failure loop.',
  },
]

export function detectFrustrationSignals(text: string): FrustrationScan {
  const normalized = text.toLowerCase()
  const signals = SIGNALS.filter((signal) => normalized.includes(signal.term))

  return {
    conservativeMode: signals.length > 0,
    signals,
    planGuidance:
      signals.length > 0
        ? 'Use conservative mode: shorten the plan, avoid risky work, and require concrete evidence before claiming completion.'
        : 'No frustration signal detected.',
  }
}

