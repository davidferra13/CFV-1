import type { AgreementItem, CohostAgreement, CompensationDetails } from './agreement-types'

// ─── Content Hashing ────────────────────────────────────────────────────────

export async function hashAgreementContent(
  agreement: CohostAgreement,
  items: AgreementItem[]
): Promise<string> {
  const payload = JSON.stringify({
    compensationModel: agreement.compensationModel,
    compensationDetails: agreement.compensationDetails,
    version: agreement.version,
    items: items
      .filter((i) => !i.addedAfterSigning)
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder)
      .map((i) => ({
        category: i.category,
        title: i.title,
        assignment: i.assignment,
        notes: i.notes,
      })),
  })

  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Amendment Severity ─────────────────────────────────────────────────────

export type AmendmentSeverity = 'critical' | 'non_critical'

export interface FieldChange {
  field: string
  signatureCritical: boolean
}

export function classifyItemChange(
  original: AgreementItem,
  updated: Partial<AgreementItem>
): AmendmentSeverity {
  if (updated.assignment !== undefined && updated.assignment !== original.assignment) {
    return 'critical'
  }
  return 'non_critical'
}

export function classifyCompensationChange(
  original: CohostAgreement,
  updated: { compensationModel?: string; compensationDetails?: CompensationDetails }
): AmendmentSeverity {
  if (updated.compensationModel && updated.compensationModel !== original.compensationModel) {
    return 'critical'
  }
  if (updated.compensationDetails) {
    const orig = original.compensationDetails
    const next = updated.compensationDetails
    if (orig.splitType !== next.splitType) return 'critical'
    if (JSON.stringify(orig.splits) !== JSON.stringify(next.splits)) return 'critical'
    if (JSON.stringify(orig.fixedFees) !== JSON.stringify(next.fixedFees)) return 'critical'
  }
  return 'non_critical'
}

// ─── Compensation Validation ────────────────────────────────────────────────

export function validateSplits(splits: { percentage: number }[]): string | null {
  if (splits.length === 0) return 'At least one host split is required'
  const total = splits.reduce((sum, s) => sum + s.percentage, 0)
  if (Math.abs(total - 100) > 0.01) return `Split percentages must total 100% (currently ${total}%)`
  if (splits.some((s) => s.percentage < 0)) return 'Split percentages cannot be negative'
  return null
}

// ─── Default Compensation Details ───────────────────────────────────────────

export function buildDefaultCompensation(
  hostProfileIds: string[],
  hostLabels: string[],
  defaultSplitPercentage: number
): CompensationDetails {
  const evenSplit = Math.floor(100 / hostProfileIds.length)
  const remainder = 100 - evenSplit * hostProfileIds.length

  return {
    splitType: 'gross',
    splits: hostProfileIds.map((id, i) => ({
      hostProfileId: id,
      label: hostLabels[i] || 'Host',
      percentage: i === 0 ? evenSplit + remainder : evenSplit,
    })),
    fixedFees: [],
    paymentMethod: 'venmo',
    paymentTiming: 'within_48h',
    paymentNotes: '',
    sharedExpenses: [],
  }
}
