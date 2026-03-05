export const MANUAL_REASON_MIN_LENGTH = 3
export const MANUAL_REASON_MAX_LENGTH = 240

export function normalizeManualReason(input: { reason: string; actionLabel: 'Void' | 'Refund' }) {
  const normalized = String(input.reason ?? '').trim()
  if (!normalized) {
    throw new Error(`${input.actionLabel} reason is required`)
  }
  if (normalized.length < MANUAL_REASON_MIN_LENGTH) {
    throw new Error(
      `${input.actionLabel} reason must be at least ${MANUAL_REASON_MIN_LENGTH} characters`
    )
  }
  if (normalized.length > MANUAL_REASON_MAX_LENGTH) {
    throw new Error(
      `${input.actionLabel} reason must be <= ${MANUAL_REASON_MAX_LENGTH} characters`
    )
  }
  return normalized
}
