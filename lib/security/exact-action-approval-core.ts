import { createHash, randomUUID } from 'node:crypto'

export const CONSEQUENTIAL_CATEGORIES = [
  'communication',
  'submission',
  'finance',
  'banking',
  'purchase',
  'contract',
  'legal',
  'identity',
  'credential',
  'permission',
  'production',
  'destructive',
  'public_publish',
  'ambiguous_material',
] as const

export type ConsequentialCategory = (typeof CONSEQUENTIAL_CATEGORIES)[number]
export type ActionEnvironment = 'local' | 'sandbox' | 'staging' | 'production' | 'external'

export type FinancialDisclosure = {
  currency: string
  grossMinor: number
  fees: Array<{ label: string; amountMinor: number }>
  netMinor: number
  source: { institution: string; accountType: string; last4: string }
  destination: { institution: string; accountType: string; last4: string }
  timing: string
  rail: string
  reversible: boolean
  reversalPath: string
  noActionResult: string
}

export type ExactAction = {
  actionId: string
  tenantId: string
  actorId: string
  toolName: string
  category: ConsequentialCategory
  operation: string
  environment: ActionEnvironment
  target: Record<string, unknown>
  payload: Record<string, unknown>
  financialDisclosure?: FinancialDisclosure
  contextVersion: string
}

export type ExactActionPreview = {
  previewId: string
  actionHash: string
  action: ExactAction
  createdAt: string
  expiresAt: string
}

const SECRET_KEY =
  /(account.?number|routing.?number|password|passcode|secret|api.?key|access.?token|refresh.?token|private.?key|cvv|cvc|pin)$/i

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    )
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('action_not_canonicalizable')
  }
  return value
}

export function stableActionJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}
export function fingerprintExactAction(action: ExactAction): string {
  return createHash('sha256').update(stableActionJson(action)).digest('hex')
}

function findSecretPath(value: unknown, path = 'action'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSecretPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== 'object') return null
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`
    if (SECRET_KEY.test(key)) return nextPath
    const found = findSecretPath(entry, nextPath)
    if (found) return found
  }
  return null
}

function validateAccountMask(account: FinancialDisclosure['source']): boolean {
  return Boolean(account.institution && account.accountType && /^\d{4}$/.test(account.last4))
}
export function validateFinancialDisclosure(disclosure?: FinancialDisclosure): string | null {
  if (!disclosure) return 'financial_disclosure_missing'
  if (!/^[A-Z]{3}$/.test(disclosure.currency)) return 'financial_currency_invalid'
  if (!Number.isSafeInteger(disclosure.grossMinor) || disclosure.grossMinor < 0) {
    return 'financial_gross_invalid'
  }
  if (!Number.isSafeInteger(disclosure.netMinor) || disclosure.netMinor < 0) {
    return 'financial_net_invalid'
  }
  if (disclosure.fees.length === 0) return 'financial_fee_breakdown_missing'
  if (
    disclosure.fees.some(
      (fee) => !fee.label || !Number.isSafeInteger(fee.amountMinor) || fee.amountMinor < 0
    )
  ) {
    return 'financial_fee_breakdown_invalid'
  }
  const totalFees = disclosure.fees.reduce((sum, fee) => sum + fee.amountMinor, 0)
  if (disclosure.grossMinor - totalFees !== disclosure.netMinor) {
    return 'financial_math_mismatch'
  }
  if (!validateAccountMask(disclosure.source) || !validateAccountMask(disclosure.destination)) {
    return 'financial_account_mask_invalid'
  }
  if (
    !disclosure.timing ||
    !disclosure.rail ||
    !disclosure.reversalPath ||
    !disclosure.noActionResult
  ) {
    return 'financial_consequence_detail_missing'
  }
  return null
}

export function validateExactAction(action: ExactAction): string | null {
  if (!CONSEQUENTIAL_CATEGORIES.includes(action.category)) return 'unknown_risk_category'
  if (!action.actionId || !action.tenantId || !action.actorId) return 'action_identity_missing'
  if (!action.toolName || !action.operation || !action.contextVersion) {
    return 'action_context_missing'
  }
  const secretPath = findSecretPath({ target: action.target, payload: action.payload })
  if (secretPath) return `raw_secret_forbidden:${secretPath}`
  if (
    action.category === 'finance' ||
    action.category === 'banking' ||
    action.category === 'purchase'
  ) {
    return validateFinancialDisclosure(action.financialDisclosure)
  }
  return null
}
export function createExactActionPreview(
  action: ExactAction,
  options: { ttlMs?: number; now?: Date } = {}
): ExactActionPreview {
  const validationError = validateExactAction(action)
  if (validationError) throw new Error(validationError)
  const now = options.now ?? new Date()
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000
  if (ttlMs <= 0 || ttlMs > 10 * 60 * 1000) {
    throw new Error('approval_ttl_out_of_range')
  }
  return {
    previewId: randomUUID(),
    actionHash: fingerprintExactAction(action),
    action: structuredClone(action),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  }
}

export function assertPreviewIntegrity(preview: ExactActionPreview, now = new Date()): void {
  const validationError = validateExactAction(preview.action)
  if (validationError) throw new Error(validationError)
  if (fingerprintExactAction(preview.action) !== preview.actionHash) {
    throw new Error('preview_action_hash_mismatch')
  }
  if (Date.parse(preview.expiresAt) <= now.getTime()) throw new Error('approval_preview_expired')
}
