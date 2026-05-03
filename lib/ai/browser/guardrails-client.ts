'use client'

type GuardrailResult = {
  allowed: boolean
  reason?: 'dangerous' | 'injection' | 'empty'
}

const DANGEROUS_PATTERNS = [
  /\b(hack|exploit|attack|breach|phish|malware)\b/i,
  /\b(how to (make|build|create) (a )?(bomb|weapon|drug))/i,
]

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) (instructions|prompts)/i,
  /you are now/i,
  /\bsystem prompt\b/i,
  /\boverride\b.*\b(rules|instructions|constraints)\b/i,
]

export function validateInputClient(input: string): GuardrailResult {
  const trimmed = input.trim()
  if (!trimmed) return { allowed: false, reason: 'empty' }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) return { allowed: false, reason: 'dangerous' }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) return { allowed: false, reason: 'injection' }
  }

  return { allowed: true }
}
