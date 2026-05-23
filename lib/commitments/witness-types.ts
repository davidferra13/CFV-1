import type { CommitmentDomain, OverrideCategory } from '@/lib/commitment/types'

export interface CommitmentWitness {
  id: string
  tenantId: string
  witnessName: string
  witnessEmail: string
  designatedAt: Date
  optInConfirmed: boolean
}

export interface WitnessDigestOverride {
  commitmentDomain: string
  reason: string
  category: OverrideCategory | null
  overriddenAt: Date
}

export interface WitnessDigest {
  witness: CommitmentWitness
  overrides: WitnessDigestOverride[]
  period: { from: Date; to: Date }
  totalOverrides: number
  summary: string
}

export interface WitnessNotification {
  to: string
  toName: string
  subject: string
  body: string
  generatedAt: Date
}
