// lib/compliance/compliance-types.ts
// Types for the Legal Readiness Center compliance infrastructure.
// Covers checklist tracking, document storage references, and regulatory mapping.

// ---------------------------------------------------------------------------
// Checklist item
// ---------------------------------------------------------------------------

export const COMPLIANCE_CATEGORIES = [
  'business_license',
  'food_safety',
  'insurance',
  'tax',
  'data_privacy',
  'employment',
  'contracts',
  'permits',
  'certifications',
  'accessibility',
  'environmental',
  'financial_reporting',
  'other',
] as const

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number]

export const COMPLIANCE_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'not_applicable',
  'needs_renewal',
  'overdue',
] as const

export type ComplianceItemStatus = (typeof COMPLIANCE_STATUSES)[number]

export const COMPLIANCE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

export type ComplianceSeverity = (typeof COMPLIANCE_SEVERITIES)[number]

export interface ComplianceItem {
  id?: string
  tenantId: string
  category: ComplianceCategory
  subcategory?: string | null
  itemKey: string
  title: string
  description?: string | null
  // Regulatory mapping
  regulatoryBody?: string | null
  jurisdiction?: string | null
  applicableStates?: string[] | null
  // Checklist state
  status: ComplianceItemStatus
  // Document reference
  documentRef?: string | null // path or URL, never binary content
  documentExpiresAt?: string | null // ISO date
  // Renewal
  renewalFrequencyDays?: number | null
  nextRenewalDue?: string | null
  lastCompletedAt?: string | null
  completedBy?: string | null
  // Risk
  severity: ComplianceSeverity
  requiresProfessionalReview: boolean
  notes?: string | null
  // Timestamps
  createdAt?: string
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Regulatory requirement mapping
// ---------------------------------------------------------------------------

export interface RegulatoryRequirement {
  id: string
  regulatoryBody: string
  jurisdiction: string
  requirementTitle: string
  applicableBusinessTypes: string[]
  referenceUrl?: string | null
  notes?: string | null
}

/**
 * Canonical set of regulatory requirements that apply to private chef businesses.
 * Used to seed compliance checklists for new tenants.
 */
export const CHEF_REGULATORY_REQUIREMENTS: RegulatoryRequirement[] = [
  {
    id: 'food_handler_cert',
    regulatoryBody: 'State Health Department',
    jurisdiction: 'US',
    requirementTitle: 'Food Handler / Food Manager Certification',
    applicableBusinessTypes: ['private_chef', 'caterer', 'meal_prep'],
    referenceUrl: null,
    notes: 'Required in most US states. Frequency varies by state (2-5 years).',
  },
  {
    id: 'business_license',
    regulatoryBody: 'City / County Clerk',
    jurisdiction: 'US',
    requirementTitle: 'Local Business License',
    applicableBusinessTypes: ['private_chef', 'caterer'],
    referenceUrl: null,
    notes: 'Annual renewal typical. City or county specific.',
  },
  {
    id: 'general_liability_insurance',
    regulatoryBody: 'State Insurance Commission',
    jurisdiction: 'US',
    requirementTitle: 'General Liability Insurance (min $1M)',
    applicableBusinessTypes: ['private_chef', 'caterer'],
    referenceUrl: null,
    notes: 'Annual renewal. Often required by event venues.',
  },
  {
    id: 'cottage_food_permit',
    regulatoryBody: 'State Health Department',
    jurisdiction: 'US',
    requirementTitle: 'Cottage Food / Home Kitchen Permit',
    applicableBusinessTypes: ['meal_prep', 'private_chef'],
    referenceUrl: null,
    notes: 'Required if cooking from home kitchen in certain states.',
  },
  {
    id: 'irs_ein',
    regulatoryBody: 'IRS',
    jurisdiction: 'US',
    requirementTitle: 'Employer Identification Number (EIN)',
    applicableBusinessTypes: ['private_chef', 'caterer'],
    referenceUrl:
      'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
    notes: 'One-time. Required for business banking and tax filing.',
  },
  {
    id: 'sales_tax_permit',
    regulatoryBody: 'State Tax Authority',
    jurisdiction: 'US',
    requirementTitle: 'Sales Tax Permit',
    applicableBusinessTypes: ['caterer', 'private_chef'],
    referenceUrl: null,
    notes: 'Required in states where prepared food is taxable.',
  },
  {
    id: 'data_privacy_policy',
    regulatoryBody: 'Self-governed / State AG',
    jurisdiction: 'US',
    requirementTitle: 'Client Data Privacy Policy',
    applicableBusinessTypes: ['private_chef', 'caterer'],
    referenceUrl: null,
    notes: 'Required under CCPA (CA), similar state laws, and general best practice.',
  },
]

// ---------------------------------------------------------------------------
// Compliance summary
// ---------------------------------------------------------------------------

export interface ComplianceSummary {
  totalItems: number
  openItems: number
  completedItems: number
  overdueItems: number
  needsRenewalItems: number
  criticalOpenItems: number
  completionRate: number // 0-100
}

export function summarizeComplianceItems(items: ComplianceItem[]): ComplianceSummary {
  const total = items.length
  const open = items.filter((i) => i.status === 'open').length
  const completed = items.filter((i) => i.status === 'completed').length
  const overdue = items.filter((i) => i.status === 'overdue').length
  const needsRenewal = items.filter((i) => i.status === 'needs_renewal').length
  const criticalOpen = items.filter(
    (i) => i.severity === 'critical' && ['open', 'overdue'].includes(i.status)
  ).length

  const actionable = items.filter((i) => i.status !== 'not_applicable').length
  const completionRate = actionable === 0 ? 100 : Math.round((completed / actionable) * 100)

  return {
    totalItems: total,
    openItems: open,
    completedItems: completed,
    overdueItems: overdue,
    needsRenewalItems: needsRenewal,
    criticalOpenItems: criticalOpen,
    completionRate,
  }
}
