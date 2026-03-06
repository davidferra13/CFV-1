export const LEGACY_TAKE_A_CHEF_COMMISSION_PERCENT = 18
export const CURRENT_TAKE_A_CHEF_COMMISSION_PERCENT = 20
export const TAKE_A_CHEF_COMMISSION_CHANGEOVER_DATE = '2026-03-09'
export const DEFAULT_TAKE_A_CHEF_COMMISSION_PERCENT = LEGACY_TAKE_A_CHEF_COMMISSION_PERCENT

export type TakeAChefIntegrationSettings = {
  defaultCommissionPercent: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseReferenceDate(referenceDate?: string | Date | null): Date | null {
  if (!referenceDate) return null
  if (referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())) return referenceDate
  if (typeof referenceDate === 'string' && referenceDate.trim()) {
    const parsed = new Date(referenceDate)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function toUtcDateKey(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDefaultTakeAChefCommissionPercent(referenceDate?: string | Date | null): number {
  const effectiveDate =
    typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(referenceDate)
      ? referenceDate.slice(0, 10)
      : toUtcDateKey(parseReferenceDate(referenceDate) ?? new Date())

  return effectiveDate >= TAKE_A_CHEF_COMMISSION_CHANGEOVER_DATE
    ? CURRENT_TAKE_A_CHEF_COMMISSION_PERCENT
    : LEGACY_TAKE_A_CHEF_COMMISSION_PERCENT
}

export function normalizeTakeAChefCommissionPercent(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isFinite(parsed)) return getDefaultTakeAChefCommissionPercent()
  return Math.min(50, Math.max(0, Math.round(parsed)))
}

export function extractTakeAChefIntegrationSettings(
  rawSettings: unknown,
  referenceDate?: string | Date | null
): TakeAChefIntegrationSettings {
  const root = asRecord(rawSettings)
  const nested = asRecord(root?.take_a_chef)
  const commissionCandidate =
    nested?.default_commission_percent ??
    nested?.defaultCommissionPercent ??
    root?.default_commission_percent ??
    root?.defaultCommissionPercent

  return {
    defaultCommissionPercent:
      commissionCandidate == null
        ? getDefaultTakeAChefCommissionPercent(referenceDate)
        : normalizeTakeAChefCommissionPercent(commissionCandidate),
  }
}

export function mergeTakeAChefIntegrationSettings(params: {
  existingSettings: unknown
  updates: Partial<TakeAChefIntegrationSettings>
}) {
  const root = asRecord(params.existingSettings) || {}
  const nested = asRecord(root.take_a_chef) || {}
  const current = extractTakeAChefIntegrationSettings(root)

  return {
    ...root,
    take_a_chef: {
      ...nested,
      default_commission_percent: normalizeTakeAChefCommissionPercent(
        params.updates.defaultCommissionPercent ?? current.defaultCommissionPercent
      ),
    },
  }
}
