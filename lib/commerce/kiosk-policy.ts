import type { TaxClass } from './constants'

const FALLBACK_MANAGER_ROLES = ['owner', 'admin', 'lead_chef', 'sous_chef']

const TAX_CLASS_MULTIPLIERS: Record<TaxClass, number> = {
  standard: 1,
  reduced: 0.5,
  exempt: 0,
  alcohol: 1,
  cannabis: 1,
  prepared_food: 1,
  zero: 0,
}

export function parseRoleCsv(input: string | null | undefined): string[] {
  return (input ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function readPosManagerRoleSetFromEnv(raw?: string): Set<string> {
  const configured = parseRoleCsv(raw ?? process.env.POS_MANAGER_ROLES)
  if (configured.length === 0) {
    return new Set(FALLBACK_MANAGER_ROLES)
  }
  return new Set(configured)
}

export function isPosManagerRole(input: {
  role: string | null | undefined
  managerRoles: Set<string>
}): boolean {
  const normalizedRole = String(input.role ?? '').trim().toLowerCase()
  if (!normalizedRole) return false
  return input.managerRoles.has(normalizedRole)
}

export function getTaxClassRateMultiplier(
  taxClass: TaxClass | string | null | undefined
): number {
  const resolved = (taxClass ?? 'standard') as TaxClass
  return TAX_CLASS_MULTIPLIERS[resolved] ?? 1
}

export function computeLineTaxCents(input: {
  lineTotalCents: number
  combinedRate: number
  taxClass: TaxClass | string | null | undefined
}): number {
  const multiplier = getTaxClassRateMultiplier(input.taxClass)
  return Math.round(input.lineTotalCents * input.combinedRate * multiplier)
}
