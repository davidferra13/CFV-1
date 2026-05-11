export type CompliancePacketStage = 'snapshot' | 'reconcile' | 'evidence' | 'finalized'

export interface CompliancePacketEvidenceItem {
  id: string
  label: string
  contentType: string
  sizeBytes: number
  capturedAt?: string | null
}

export interface CompliancePacketState {
  packetId: string
  stage: CompliancePacketStage
  snapshotCreated: boolean
  reconciliationRecorded: boolean
  evidenceItems: CompliancePacketEvidenceItem[]
  finalizedAt?: string | null
}

export interface CompliancePacketCompleteness {
  readyToFinalize: boolean
  missing: Array<'snapshot' | 'reconciliation' | 'evidence'>
  evidenceCount: number
}

export function summarizeCompliancePacketCompleteness(
  packet: CompliancePacketState
): CompliancePacketCompleteness {
  const missing: CompliancePacketCompleteness['missing'] = []
  if (!packet.snapshotCreated) missing.push('snapshot')
  if (!packet.reconciliationRecorded) missing.push('reconciliation')
  if (packet.evidenceItems.length === 0) missing.push('evidence')

  return {
    readyToFinalize: missing.length === 0 && packet.stage !== 'finalized',
    missing,
    evidenceCount: packet.evidenceItems.length,
  }
}

export function assertPacketCanMutate(packet: CompliancePacketState): void {
  if (packet.stage === 'finalized' || packet.finalizedAt) {
    throw new Error('Finalized compliance packets cannot be modified')
  }
}
