// Cohosting Agreement Engine - Type Definitions
// Pure types, no 'use server' directive.

// ─── Compensation ───────────────────────────────────────────────────────────

export type CompensationModel = 'venue_sells_all' | 'both_sell' | 'chef_sells_all' | 'fixed_fee'
export type SplitType = 'gross' | 'net'
export type PaymentMethod = 'venmo' | 'check' | 'bank_transfer' | 'other'
export type PaymentTiming = 'day_of' | 'within_48h' | 'within_week' | 'custom'

export interface HostSplit {
  hostProfileId: string
  label: string
  percentage: number
}

export interface FixedFee {
  hostProfileId: string
  label: string
  amountCents: number
}

export interface SharedExpense {
  description: string
  amountCents: number
  paidBy: string
}

export interface CompensationDetails {
  splitType: SplitType
  splits: HostSplit[]
  fixedFees: FixedFee[]
  paymentMethod: PaymentMethod
  paymentTiming: PaymentTiming
  paymentNotes: string
  sharedExpenses: SharedExpense[]
}

// ─── Agreement ──────────────────────────────────────────────────────────────

export type AgreementStatus = 'draft' | 'pending_signatures' | 'active' | 'amended' | 'voided'

export type TemplateType =
  | 'chef_farm'
  | 'chef_private_host'
  | 'chef_chef'
  | 'chef_restaurant'
  | 'chef_planner'
  | 'custom'

export interface CohostAgreement {
  id: string
  groupId: string
  eventId: string | null
  templateType: TemplateType
  compensationModel: CompensationModel
  compensationDetails: CompensationDetails
  status: AgreementStatus
  version: number
  createdBy: string
  inheritedFromAgreementId: string | null
  createdAt: string
  updatedAt: string
}

// ─── Checklist Items ────────────────────────────────────────────────────────

export type ItemCategory =
  | 'tickets_revenue'
  | 'ingredients'
  | 'equipment'
  | 'venue_setup'
  | 'culinary'
  | 'beverages'
  | 'hospitality'
  | 'marketing'
  | 'guest_management'
  | 'wrap_up'
  | 'cancellation'

export type ItemAssignment = 'chef' | 'venue' | 'shared' | 'na' | 'unassigned'
export type ItemStatus = 'not_started' | 'in_progress' | 'done'

export interface AgreementItem {
  id: string
  agreementId: string
  category: ItemCategory
  title: string
  assignment: ItemAssignment
  notes: string | null
  status: ItemStatus
  sortOrder: number
  isDefault: boolean
  signatureCritical: boolean
  addedAfterSigning: boolean
  acknowledgedBy: string[]
  completedAt: string | null
  completedBy: string | null
  createdAt: string
  updatedAt: string
}

// ─── Signatures ─────────────────────────────────────────────────────────────

export interface AgreementSignature {
  id: string
  agreementId: string
  signerProfileId: string
  signerName: string
  signerRole: string
  contentHash: string
  ipAddress: string | null
  userAgent: string | null
  version: number
  signedAt: string
}

// ─── Composed Views ─────────────────────────────────────────────────────────

export interface AgreementWithItems extends CohostAgreement {
  items: AgreementItem[]
  signatures: AgreementSignature[]
  hosts: AgreementHost[]
}

export interface AgreementHost {
  profileId: string
  displayName: string
  label: string
  organization: string | null
  hasSigned: boolean
  signedAt: string | null
}

// ─── Template Definition ────────────────────────────────────────────────────

export interface TemplateItem {
  category: ItemCategory
  title: string
  signatureCritical: boolean
}

export interface AgreementTemplate {
  type: TemplateType
  label: string
  description: string
  defaultCompensationModel: CompensationModel
  defaultSplitPercentage: number
  items: TemplateItem[]
}

// ─── Category Metadata ──────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  tickets_revenue: 'Tickets & Revenue',
  ingredients: 'Ingredients & Sourcing',
  equipment: 'Equipment & Serviceware',
  venue_setup: 'Venue & Setup',
  culinary: 'Culinary Execution',
  beverages: 'Beverages',
  hospitality: 'Hospitality & Guest Experience',
  marketing: 'Marketing & Promotion',
  guest_management: 'Guest Management',
  wrap_up: 'Wrap-Up & Post-Event',
  cancellation: 'Cancellation & Contingency',
}

export const COMPENSATION_MODEL_LABELS: Record<CompensationModel, string> = {
  venue_sells_all: 'Venue sells 100%',
  both_sell: 'Both sell tickets',
  chef_sells_all: 'Chef sells 100%',
  fixed_fee: 'Fixed compensation',
}

export const ASSIGNMENT_LABELS: Record<ItemAssignment, string> = {
  chef: 'Chef',
  venue: 'Venue',
  shared: 'Shared',
  na: 'N/A',
  unassigned: 'Unassigned',
}
