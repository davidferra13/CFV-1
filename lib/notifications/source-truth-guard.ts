export type SourceTruthStatus = 'verified' | 'missing' | 'unavailable'

export type SourceTruthCheck = {
  key: string
  label: string
  source: string
  status: SourceTruthStatus
  blocking: boolean
  detail: string
}

export type SourceTruthGuardResult = {
  trusted: boolean
  checks: SourceTruthCheck[]
  blockedClaims: string[]
}

type SourceTruthCheckInput = {
  key: string
  label: string
  source: string
  value: unknown
  blocking?: boolean
  unavailable?: boolean
}

function hasKnownValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasKnownValue)
  return true
}

export function createSourceTruthCheck(input: SourceTruthCheckInput): SourceTruthCheck {
  const blocking = input.blocking ?? true
  const status: SourceTruthStatus = input.unavailable
    ? 'unavailable'
    : hasKnownValue(input.value)
      ? 'verified'
      : 'missing'

  return {
    key: input.key,
    label: input.label,
    source: input.source,
    status,
    blocking,
    detail:
      status === 'verified'
        ? `${input.label} verified from ${input.source}.`
        : `${input.label} cannot be claimed because ${input.source} is ${status}.`,
  }
}

export function evaluateSourceTruth(checks: SourceTruthCheck[]): SourceTruthGuardResult {
  const blockedClaims = checks
    .filter((check) => check.blocking && check.status !== 'verified')
    .map((check) => check.detail)

  return {
    trusted: blockedClaims.length === 0,
    checks,
    blockedClaims,
  }
}

export function describeSourceTruth(result: SourceTruthGuardResult): string {
  if (result.trusted) return 'All required source records are available.'
  return result.blockedClaims.join(' ')
}
