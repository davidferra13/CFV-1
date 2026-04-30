import type { EvaluatedChefSignal } from './noise-simulator'

export type SuppressionAuditRecord = {
  signalId: string
  action: EvaluatedChefSignal['action']
  suppressedAt: string
  reason: string
  relatedEventId: string | null
  relatedInquiryId: string | null
  relatedClientId: string | null
  duplicateKey: string | null
  laterEscalated: boolean
}

export function createSuppressionAuditRecords(
  signals: EvaluatedChefSignal[],
  suppressedAt = new Date().toISOString()
): SuppressionAuditRecord[] {
  return signals
    .filter((signal) => signal.decision === 'suppress' || signal.decision === 'archive')
    .map((signal) => ({
      signalId: signal.id,
      action: signal.action,
      suppressedAt,
      reason: signal.reasons[signal.reasons.length - 1] ?? 'Suppressed by Signal OS policy.',
      relatedEventId: signal.eventId ?? null,
      relatedInquiryId: signal.inquiryId ?? null,
      relatedClientId: signal.clientId ?? null,
      duplicateKey: signal.context?.duplicateKey ?? null,
      laterEscalated: false,
    }))
}

export function markSuppressionEscalated(
  records: SuppressionAuditRecord[],
  signalId: string
): SuppressionAuditRecord[] {
  return records.map((record) =>
    record.signalId === signalId ? { ...record, laterEscalated: true } : record
  )
}
