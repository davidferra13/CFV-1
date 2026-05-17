export type DocumentType =
  | 'contract'
  | 'invoice'
  | 'menu'
  | 'recipe'
  | 'photo'
  | 'checklist'
  | 'report'
  | 'other'

export type DocumentStatus = 'draft' | 'final' | 'approved' | 'archived'

export type ProofPackStatus = 'assembling' | 'review' | 'approved' | 'sent'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ProofPackDocument {
  id: string
  tenantId: string
  eventId: string | null
  documentType: DocumentType
  title: string
  filePath: string | null
  version: number
  status: DocumentStatus
  uploadedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProofPack {
  id: string
  tenantId: string
  eventId: string | null
  title: string
  documentIds: string[]
  status: ProofPackStatus
  sentTo: string | null
  sentAt: Date | null
  createdAt: Date
}

export interface DocumentApproval {
  id: string
  tenantId: string
  documentId: string
  approverId: string | null
  status: ApprovalStatus
  comments: string | null
  decidedAt: Date | null
  createdAt: Date
}

export interface DocumentWorkspaceSummary {
  totalDocuments: number
  totalProofPacks: number
  pendingApprovals: number
  documentsByType: Record<string, number>
}
