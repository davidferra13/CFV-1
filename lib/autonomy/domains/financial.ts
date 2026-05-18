import { detectSituation, routeToApproval } from '@/lib/autonomy/engine'
import { buildDefaultAutonomyPreferences } from '@/lib/autonomy/approval-router'
import type {
  ApprovalGate,
  AutonomyAction,
  AutonomyDraft,
  AutonomyEntityRef,
  AutonomyEvidence,
  AutonomyPreferences,
  AutonomyRiskLevel,
  AutonomySituation,
  DetectSituationInput,
} from '@/lib/autonomy/types'

export type FinancialActionType =
  | 'quote_generation'
  | 'invoice_creation'
  | 'payment_reminder'
  | 'expense_categorization'

export type FinancialTrigger =
  | QuoteGenerationTrigger
  | InvoiceCreationTrigger
  | PaymentReminderTrigger
  | ExpenseCategorizationTrigger

export interface FinancialTenantScope {
  tenantId: string
  chefId?: string
  source?: string
  entityRefs?: AutonomyEntityRef[]
}

export interface FinancialAdapterOptions {
  preferences?: AutonomyPreferences
}

export interface FinancialTriggerResult {
  tenantId: string
  situation: AutonomySituation
  action: AutonomyAction
  gate: ApprovalGate
  requiresApproval: boolean
}

export interface QuoteGenerationTrigger extends FinancialTenantScope {
  actionType: 'quote_generation'
  eventId?: string
  clientId?: string
  clientName?: string
  eventName?: string
  guestCount: number
  menuCostCents?: number
  menuCostPerGuestCents?: number
  laborHours?: number
  laborRateCents?: number
  fixedCostCents?: number
  travelCostCents?: number
  rentalsCostCents?: number
  serviceFeeCents?: number
  markupPercent?: number
  taxRatePercent?: number
  depositPercent?: number
  dueDate?: string
}

export interface QuoteDraft {
  tenantId: string
  guestCount: number
  menuCostCents: number
  menuCostPerGuestCents: number
  laborCostCents: number
  fixedCostCents: number
  travelCostCents: number
  rentalsCostCents: number
  directCostCents: number
  markupPercent: number
  markupCents: number
  serviceFeeCents: number
  subtotalCents: number
  taxRatePercent: number
  taxCents: number
  totalCents: number
  depositPercent: number
  depositDueCents: number
  balanceDueCents: number
  perGuestCents: number
  lineItems: FinancialLineItem[]
}

export interface InvoiceCreationTrigger extends FinancialTenantScope {
  actionType: 'invoice_creation'
  quoteId?: string
  eventId?: string
  clientId?: string
  clientName?: string
  invoiceNumber?: string
  issueDate?: string
  dueDate?: string
  paymentTermsDays?: number
  lineItems?: FinancialLineItemInput[]
  quoteDraft?: QuoteDraft
  subtotalCents?: number
  taxRatePercent?: number
  discountCents?: number
  amountPaidCents?: number
}

export interface InvoiceDraft {
  tenantId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  paymentTermsDays: number
  subtotalCents: number
  discountCents: number
  taxableSubtotalCents: number
  taxRatePercent: number
  taxCents: number
  totalCents: number
  amountPaidCents: number
  balanceDueCents: number
  lineItems: FinancialLineItem[]
}

export interface PaymentReminderTrigger extends FinancialTenantScope {
  actionType: 'payment_reminder'
  invoiceId: string
  invoiceNumber?: string
  clientId?: string
  clientName?: string
  amountDueCents: number
  invoiceTotalCents?: number
  dueDate: string
  today?: string
  allowAutoSuggestion?: boolean
}

export interface PaymentReminderDraft {
  tenantId: string
  invoiceId: string
  invoiceNumber: string
  amountDueCents: number
  invoiceTotalCents: number
  dueDate: string
  today: string
  daysUntilDue: number
  reminderStage: 'early' | 'due_today' | 'overdue'
  subject: string
  body: string
  autoSuggestionAllowed: boolean
}

export interface ExpenseCategorizationTrigger extends FinancialTenantScope {
  actionType: 'expense_categorization'
  expenseId?: string
  vendorName?: string
  memo?: string
  providedCategory?: string
  amountCents: number
  transactionDate?: string
}

export interface ExpenseCategorizationDraft {
  tenantId: string
  amountCents: number
  vendorName: string
  category: ExpenseCategory
  confidenceScore: number
  deductible: boolean
  reason: string
  transactionDate?: string
}

export interface FinancialLineItemInput {
  label: string
  quantity?: number
  unitAmountCents?: number
  amountCents?: number
  taxable?: boolean
}

export interface FinancialLineItem {
  label: string
  quantity: number
  unitAmountCents: number
  amountCents: number
  taxable: boolean
}

export type ExpenseCategory =
  | 'food_ingredients'
  | 'labor'
  | 'marketing'
  | 'rentals_equipment'
  | 'software'
  | 'travel'
  | 'taxes_fees'
  | 'miscellaneous'

const FINANCIAL_DOMAIN = 'financial'
const DEFAULT_MARKUP_PERCENT = 35
const DEFAULT_DEPOSIT_PERCENT = 50
const DEFAULT_PAYMENT_TERMS_DAYS = 14
const DEFAULT_LABOR_RATE_CENTS = 4500
const HIGH_CONFIDENCE = 0.92
const MEDIUM_CONFIDENCE = 0.82

export function processFinancialTrigger(
  trigger: FinancialTrigger,
  options: FinancialAdapterOptions = {}
): FinancialTriggerResult {
  const situation = detectFinancialSituation(trigger)
  const action = draftFinancialAction(trigger, situation)
  const preferences = buildFinancialApprovalPreferences(trigger.tenantId, options.preferences)
  const gate = resolveFinancialGate(action, preferences, trigger)

  return {
    tenantId: trigger.tenantId,
    situation,
    action,
    gate,
    requiresApproval: gate.requiresChefReview || gate.decision === 'queue_for_approval',
  }
}

export function draftFinancialAction(
  trigger: FinancialTrigger,
  situation = detectFinancialSituation(trigger)
): AutonomyAction {
  const draft = buildFinancialDraft(trigger)
  const riskLevel = inferFinancialRiskLevel(trigger)
  const confidenceScore = confidenceForTrigger(trigger)

  return {
    tenantId: trigger.tenantId,
    domain: FINANCIAL_DOMAIN,
    actionType: trigger.actionType,
    title: titleForTrigger(trigger),
    description: descriptionForTrigger(trigger, draft),
    riskLevel,
    confidenceScore,
    draftMethod: 'formula',
    draft,
    source: trigger.source ?? 'financial_autonomy_adapter',
    situation,
    entityRefs: buildEntityRefs(trigger),
    dedupKey: buildFinancialDedupKey(trigger),
    status: 'drafted',
    createdAt: new Date().toISOString(),
  }
}

export function calculateQuoteDraft(input: QuoteGenerationTrigger): QuoteDraft {
  const guestCount = positiveWhole(input.guestCount, 1)
  const menuCostCents =
    input.menuCostPerGuestCents === undefined
      ? nonNegativeCents(input.menuCostCents)
      : nonNegativeCents(input.menuCostPerGuestCents) * guestCount
  const menuCostPerGuestCents = roundCents(menuCostCents / guestCount)
  const laborCostCents =
    safeNumber(input.laborHours) *
    nonNegativeCents(input.laborRateCents ?? DEFAULT_LABOR_RATE_CENTS)
  const fixedCostCents = nonNegativeCents(input.fixedCostCents)
  const travelCostCents = nonNegativeCents(input.travelCostCents)
  const rentalsCostCents = nonNegativeCents(input.rentalsCostCents)
  const serviceFeeCents = nonNegativeCents(input.serviceFeeCents)
  const directCostCents = roundCents(
    menuCostCents + laborCostCents + fixedCostCents + travelCostCents + rentalsCostCents
  )
  const markupPercent = clampPercent(input.markupPercent ?? DEFAULT_MARKUP_PERCENT)
  const markupCents = roundCents(directCostCents * (markupPercent / 100))
  const subtotalCents = roundCents(directCostCents + markupCents + serviceFeeCents)
  const taxRatePercent = clampPercent(input.taxRatePercent ?? 0)
  const taxCents = roundCents(subtotalCents * (taxRatePercent / 100))
  const totalCents = subtotalCents + taxCents
  const depositPercent = clampPercent(input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT)
  const depositDueCents = roundCents(totalCents * (depositPercent / 100))
  const balanceDueCents = totalCents - depositDueCents

  return {
    tenantId: input.tenantId,
    guestCount,
    menuCostCents,
    menuCostPerGuestCents,
    laborCostCents: roundCents(laborCostCents),
    fixedCostCents,
    travelCostCents,
    rentalsCostCents,
    directCostCents,
    markupPercent,
    markupCents,
    serviceFeeCents,
    subtotalCents,
    taxRatePercent,
    taxCents,
    totalCents,
    depositPercent,
    depositDueCents,
    balanceDueCents,
    perGuestCents: roundCents(totalCents / guestCount),
    lineItems: [
      financialLineItem('Menu cost', 1, menuCostCents, false),
      financialLineItem('Labor', 1, laborCostCents, false),
      financialLineItem('Fixed costs', 1, fixedCostCents, false),
      financialLineItem('Travel', 1, travelCostCents, false),
      financialLineItem('Rentals and equipment', 1, rentalsCostCents, false),
      financialLineItem(`Markup ${formatPercent(markupPercent)}`, 1, markupCents, false),
      financialLineItem('Service fee', 1, serviceFeeCents, true),
      financialLineItem(`Estimated tax ${formatPercent(taxRatePercent)}`, 1, taxCents, false),
    ].filter((item) => item.amountCents > 0),
  }
}

export function calculateInvoiceDraft(input: InvoiceCreationTrigger): InvoiceDraft {
  const issueDate = input.issueDate ?? todayIsoDate()
  const paymentTermsDays = positiveWhole(input.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS, 0)
  const dueDate = input.dueDate ?? addDaysIsoDate(issueDate, paymentTermsDays)
  const quoteDraft = input.quoteDraft
  const lineItems = normalizeLineItems(
    input.lineItems ??
      quoteDraft?.lineItems ?? [
        financialLineItem(
          'Event services',
          1,
          input.subtotalCents ?? quoteDraft?.subtotalCents ?? 0
        ),
      ]
  )
  const subtotalCents =
    input.subtotalCents === undefined
      ? sumCents(lineItems.map((item) => item.amountCents))
      : nonNegativeCents(input.subtotalCents)
  const discountCents = Math.min(nonNegativeCents(input.discountCents), subtotalCents)
  const taxableSubtotalCents = Math.max(
    0,
    sumCents(lineItems.filter((item) => item.taxable).map((item) => item.amountCents)) -
      discountCents
  )
  const taxRatePercent = clampPercent(input.taxRatePercent ?? quoteDraft?.taxRatePercent ?? 0)
  const taxCents = roundCents(taxableSubtotalCents * (taxRatePercent / 100))
  const totalCents = subtotalCents - discountCents + taxCents
  const amountPaidCents = Math.min(nonNegativeCents(input.amountPaidCents), totalCents)

  return {
    tenantId: input.tenantId,
    invoiceNumber: input.invoiceNumber ?? buildDeterministicInvoiceNumber(input),
    issueDate,
    dueDate,
    paymentTermsDays,
    subtotalCents,
    discountCents,
    taxableSubtotalCents,
    taxRatePercent,
    taxCents,
    totalCents,
    amountPaidCents,
    balanceDueCents: totalCents - amountPaidCents,
    lineItems,
  }
}

export function calculatePaymentReminderDraft(input: PaymentReminderTrigger): PaymentReminderDraft {
  const today = input.today ?? todayIsoDate()
  const daysUntilDue = daysBetween(today, input.dueDate)
  const reminderStage = daysUntilDue > 0 ? 'early' : daysUntilDue === 0 ? 'due_today' : 'overdue'
  const invoiceNumber = input.invoiceNumber ?? input.invoiceId
  const amountDueCents = nonNegativeCents(input.amountDueCents)
  const clientName = input.clientName ?? 'there'
  const timing =
    reminderStage === 'overdue'
      ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
      : reminderStage === 'due_today'
        ? 'due today'
        : `due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`

  return {
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    invoiceNumber,
    amountDueCents,
    invoiceTotalCents: nonNegativeCents(input.invoiceTotalCents ?? amountDueCents),
    dueDate: input.dueDate,
    today,
    daysUntilDue,
    reminderStage,
    subject: `Invoice ${invoiceNumber} is ${timing}`,
    body: `Hi ${clientName}, invoice ${invoiceNumber} has a remaining balance of ${formatCurrency(
      amountDueCents
    )} and is ${timing}. Please send payment when convenient, or reply with any questions.`,
    autoSuggestionAllowed: input.allowAutoSuggestion === true,
  }
}

export function categorizeExpenseDeterministically(
  input: ExpenseCategorizationTrigger
): ExpenseCategorizationDraft {
  const vendorName = input.vendorName?.trim() || 'Unknown vendor'
  const providedCategory = normalizeExpenseCategory(input.providedCategory)

  if (providedCategory) {
    return {
      tenantId: input.tenantId,
      amountCents: nonNegativeCents(input.amountCents),
      vendorName,
      category: providedCategory,
      confidenceScore: 0.97,
      deductible: providedCategory !== 'miscellaneous',
      reason: `Used provided category ${providedCategory}.`,
      transactionDate: input.transactionDate,
    }
  }

  const normalizedText = `${vendorName} ${input.memo ?? ''}`.toLowerCase()
  const matchedCategory = EXPENSE_CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedText.includes(keyword))
  )
  const category = matchedCategory?.category ?? 'miscellaneous'

  return {
    tenantId: input.tenantId,
    amountCents: nonNegativeCents(input.amountCents),
    vendorName,
    category,
    confidenceScore: matchedCategory ? 0.88 : 0.62,
    deductible: category !== 'miscellaneous',
    reason: matchedCategory
      ? `Matched ${matchedCategory.label} vendor or memo keyword.`
      : 'No deterministic vendor or memo keyword matched.',
    transactionDate: input.transactionDate,
  }
}

function buildFinancialDraft(trigger: FinancialTrigger): AutonomyDraft {
  switch (trigger.actionType) {
    case 'quote_generation': {
      const draft = calculateQuoteDraft(trigger)
      return {
        summary: `Draft quote for ${draft.guestCount} guests at ${formatCurrency(draft.totalCents)}.`,
        preview: `Quote total ${formatCurrency(draft.totalCents)}, deposit ${formatCurrency(
          draft.depositDueCents
        )}, balance ${formatCurrency(draft.balanceDueCents)}.`,
        payload: { quoteDraft: draft },
        reversible: true,
        evidence: quoteEvidence(draft),
        nextStepLabel: 'Review quote draft',
      }
    }
    case 'invoice_creation': {
      const draft = calculateInvoiceDraft(trigger)
      return {
        summary: `Draft invoice ${draft.invoiceNumber} for ${formatCurrency(draft.totalCents)}.`,
        preview: `Invoice ${draft.invoiceNumber} due ${draft.dueDate} with ${formatCurrency(
          draft.balanceDueCents
        )} outstanding.`,
        payload: { invoiceDraft: draft },
        reversible: true,
        evidence: invoiceEvidence(draft),
        nextStepLabel: 'Review invoice draft',
      }
    }
    case 'payment_reminder': {
      const draft = calculatePaymentReminderDraft(trigger)
      return {
        summary: `Draft payment reminder for invoice ${draft.invoiceNumber}.`,
        preview: draft.body,
        payload: { paymentReminderDraft: draft },
        reversible: true,
        evidence: reminderEvidence(draft),
        nextStepLabel: draft.autoSuggestionAllowed
          ? 'Review or auto-suggest reminder'
          : 'Review payment reminder',
      }
    }
    case 'expense_categorization': {
      const draft = categorizeExpenseDeterministically(trigger)
      return {
        summary: `Categorize ${formatCurrency(draft.amountCents)} expense as ${draft.category}.`,
        preview: `${draft.vendorName} matched ${draft.category} with ${Math.round(
          draft.confidenceScore * 100
        )}% confidence.`,
        payload: { expenseCategorizationDraft: draft },
        reversible: true,
        evidence: expenseEvidence(draft),
        nextStepLabel: 'Review expense category',
      }
    }
  }
}

function detectFinancialSituation(trigger: FinancialTrigger): AutonomySituation {
  const input: DetectSituationInput = {
    tenantId: trigger.tenantId,
    domain: FINANCIAL_DOMAIN,
    source: trigger.source ?? 'financial_autonomy_adapter',
    signalType: trigger.actionType,
    title: titleForTrigger(trigger),
    detail: detailForTrigger(trigger),
    urgency: urgencyForTrigger(trigger),
    confidenceScore: confidenceForTrigger(trigger),
    entityRefs: buildEntityRefs(trigger),
    payload: {
      actionType: trigger.actionType,
      tenantId: trigger.tenantId,
    },
  }

  return detectSituation(input)
}

function buildFinancialApprovalPreferences(
  tenantId: string,
  preferences?: AutonomyPreferences
): AutonomyPreferences {
  const base = preferences ?? buildDefaultAutonomyPreferences(tenantId)

  return {
    ...base,
    tenantId,
    defaultMode: base.defaultMode ?? 'approval',
    domainModes: {
      ...base.domainModes,
      financial: base.domainModes.financial ?? 'approval',
    },
    allowHighRiskAuto: false,
  }
}

function resolveFinancialGate(
  action: AutonomyAction,
  preferences: AutonomyPreferences,
  trigger: FinancialTrigger
): ApprovalGate {
  const gate = routeToApproval(action, preferences)

  if (gate.decision !== 'auto_execute') return gate

  if (trigger.actionType === 'payment_reminder' && trigger.allowAutoSuggestion === true) {
    return gate
  }

  return {
    ...gate,
    decision: 'queue_for_approval',
    reason:
      trigger.actionType === 'payment_reminder'
        ? 'Payment reminders require chef approval unless auto suggestion is explicitly enabled.'
        : 'Financial actions require chef approval by default.',
    matchedPolicy: 'financial_domain_default',
    requiresChefReview: true,
  }
}

function inferFinancialRiskLevel(trigger: FinancialTrigger): AutonomyRiskLevel {
  if (trigger.actionType === 'payment_reminder' && trigger.allowAutoSuggestion === true) {
    return 'low'
  }

  if (trigger.actionType === 'expense_categorization') return 'medium'
  if (trigger.actionType === 'payment_reminder') return 'medium'
  return 'high'
}

function confidenceForTrigger(trigger: FinancialTrigger): number {
  if (trigger.actionType === 'expense_categorization') {
    return categorizeExpenseDeterministically(trigger).confidenceScore
  }

  if (trigger.actionType === 'payment_reminder') return HIGH_CONFIDENCE
  if (trigger.actionType === 'quote_generation') return HIGH_CONFIDENCE
  return MEDIUM_CONFIDENCE
}

function titleForTrigger(trigger: FinancialTrigger): string {
  switch (trigger.actionType) {
    case 'quote_generation':
      return `Draft quote${trigger.eventName ? ` for ${trigger.eventName}` : ''}`
    case 'invoice_creation':
      return `Draft invoice${trigger.invoiceNumber ? ` ${trigger.invoiceNumber}` : ''}`
    case 'payment_reminder':
      return `Draft payment reminder for invoice ${trigger.invoiceNumber ?? trigger.invoiceId}`
    case 'expense_categorization':
      return `Categorize expense${trigger.vendorName ? ` from ${trigger.vendorName}` : ''}`
  }
}

function detailForTrigger(trigger: FinancialTrigger): string {
  switch (trigger.actionType) {
    case 'quote_generation':
      return `Build a deterministic quote draft for ${positiveWhole(trigger.guestCount, 1)} guests.`
    case 'invoice_creation':
      return 'Build a deterministic invoice draft from quote or line item inputs.'
    case 'payment_reminder':
      return `Build a deterministic payment reminder for ${formatCurrency(
        trigger.amountDueCents
      )} due ${trigger.dueDate}.`
    case 'expense_categorization':
      return `Categorize ${formatCurrency(trigger.amountCents)} expense using vendor and memo rules.`
  }
}

function descriptionForTrigger(trigger: FinancialTrigger, draft: AutonomyDraft): string {
  return `${detailForTrigger(trigger)} ${draft.summary}`
}

function urgencyForTrigger(trigger: FinancialTrigger): number {
  if (trigger.actionType !== 'payment_reminder') return 2

  const daysUntilDue = daysBetween(trigger.today ?? todayIsoDate(), trigger.dueDate)
  if (daysUntilDue < 0) return 4
  if (daysUntilDue === 0) return 3
  return 2
}

function buildEntityRefs(trigger: FinancialTrigger): AutonomyEntityRef[] {
  const refs = [...(trigger.entityRefs ?? [])]
  pushEntityRef(refs, 'tenant', trigger.tenantId)
  pushEntityRef(refs, 'chef', trigger.chefId)

  if (trigger.actionType === 'quote_generation') {
    pushEntityRef(refs, 'event', trigger.eventId, trigger.eventName)
    pushEntityRef(refs, 'client', trigger.clientId, trigger.clientName)
  }

  if (trigger.actionType === 'invoice_creation') {
    pushEntityRef(refs, 'quote', trigger.quoteId)
    pushEntityRef(refs, 'event', trigger.eventId)
    pushEntityRef(refs, 'client', trigger.clientId, trigger.clientName)
  }

  if (trigger.actionType === 'payment_reminder') {
    pushEntityRef(refs, 'invoice', trigger.invoiceId, trigger.invoiceNumber)
    pushEntityRef(refs, 'client', trigger.clientId, trigger.clientName)
  }

  if (trigger.actionType === 'expense_categorization') {
    pushEntityRef(refs, 'expense', trigger.expenseId)
  }

  return dedupeEntityRefs(refs)
}

function pushEntityRef(
  refs: AutonomyEntityRef[],
  type: string,
  id: string | undefined,
  label?: string
): void {
  if (!id) return
  refs.push({ type, id, label })
}

function dedupeEntityRefs(refs: AutonomyEntityRef[]): AutonomyEntityRef[] {
  const seen = new Set<string>()
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildFinancialDedupKey(trigger: FinancialTrigger): string {
  const refs = buildEntityRefs(trigger)
    .map((ref) => `${ref.type}:${ref.id}`)
    .sort()
    .join('|')

  return [FINANCIAL_DOMAIN, trigger.actionType, refs || trigger.tenantId].join(':')
}

function buildDeterministicInvoiceNumber(input: InvoiceCreationTrigger): string {
  const stableSource = input.quoteId ?? input.eventId ?? input.clientId ?? input.tenantId
  const suffix = stableSource
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .padStart(8, '0')
    .toUpperCase()

  return `INV-${suffix}`
}

function normalizeLineItems(items: FinancialLineItemInput[]): FinancialLineItem[] {
  return items.map((item) =>
    financialLineItem(
      item.label,
      item.quantity ?? 1,
      item.amountCents ?? (item.unitAmountCents ?? 0) * (item.quantity ?? 1),
      item.taxable ?? true
    )
  )
}

function financialLineItem(
  label: string,
  quantity: number,
  amountCents: number,
  taxable = true
): FinancialLineItem {
  const normalizedQuantity = positiveWhole(quantity, 1)
  const normalizedAmount = nonNegativeCents(amountCents)

  return {
    label,
    quantity: normalizedQuantity,
    unitAmountCents: roundCents(normalizedAmount / normalizedQuantity),
    amountCents: normalizedAmount,
    taxable,
  }
}

function quoteEvidence(draft: QuoteDraft): AutonomyEvidence[] {
  return [
    evidence('Guest count', String(draft.guestCount)),
    evidence('Direct cost', formatCurrency(draft.directCostCents)),
    evidence(
      'Markup',
      `${formatPercent(draft.markupPercent)} (${formatCurrency(draft.markupCents)})`
    ),
    evidence('Tax', `${formatPercent(draft.taxRatePercent)} (${formatCurrency(draft.taxCents)})`),
    evidence('Total', formatCurrency(draft.totalCents)),
  ]
}

function invoiceEvidence(draft: InvoiceDraft): AutonomyEvidence[] {
  return [
    evidence('Invoice number', draft.invoiceNumber),
    evidence('Issue date', draft.issueDate),
    evidence('Due date', draft.dueDate),
    evidence('Balance due', formatCurrency(draft.balanceDueCents)),
  ]
}

function reminderEvidence(draft: PaymentReminderDraft): AutonomyEvidence[] {
  return [
    evidence('Invoice', draft.invoiceNumber),
    evidence('Due date', draft.dueDate),
    evidence('Amount due', formatCurrency(draft.amountDueCents)),
    evidence('Reminder stage', draft.reminderStage),
    evidence('Auto suggestion allowed', draft.autoSuggestionAllowed ? 'yes' : 'no'),
  ]
}

function expenseEvidence(draft: ExpenseCategorizationDraft): AutonomyEvidence[] {
  return [
    evidence('Vendor', draft.vendorName),
    evidence('Amount', formatCurrency(draft.amountCents)),
    evidence('Category', draft.category),
    evidence('Confidence', draft.confidenceScore.toFixed(2), draft.confidenceScore),
  ]
}

function evidence(label: string, value: string, confidence?: number): AutonomyEvidence {
  return {
    label,
    value,
    source: 'financial_autonomy_adapter',
    confidence,
  }
}

const EXPENSE_CATEGORY_RULES: Array<{
  category: ExpenseCategory
  label: string
  keywords: string[]
}> = [
  {
    category: 'food_ingredients',
    label: 'food and ingredient',
    keywords: [
      'restaurant depot',
      'whole foods',
      'costco',
      'sysco',
      'us foods',
      'produce',
      'farm',
      'market',
      'butcher',
      'seafood',
      'bakery',
      'spice',
    ],
  },
  {
    category: 'labor',
    label: 'labor',
    keywords: ['payroll', 'contractor', 'staffing', 'wages', 'cook', 'server', 'dishwasher'],
  },
  {
    category: 'marketing',
    label: 'marketing',
    keywords: ['ads', 'advertising', 'meta', 'google ad', 'print', 'flyer', 'mailchimp'],
  },
  {
    category: 'rentals_equipment',
    label: 'rental or equipment',
    keywords: ['rental', 'linen', 'table', 'chair', 'tent', 'equipment', 'smallwares'],
  },
  {
    category: 'software',
    label: 'software',
    keywords: ['software', 'saas', 'subscription', 'stripe', 'quickbooks', 'notion', 'api'],
  },
  {
    category: 'travel',
    label: 'travel',
    keywords: ['uber', 'lyft', 'hotel', 'airline', 'parking', 'fuel', 'gas station', 'mileage'],
  },
  {
    category: 'taxes_fees',
    label: 'tax or fee',
    keywords: ['tax', 'license', 'permit', 'filing', 'fee'],
  },
]

function normalizeExpenseCategory(category: string | undefined): ExpenseCategory | null {
  if (!category) return null
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const allowed: ExpenseCategory[] = [
    'food_ingredients',
    'labor',
    'marketing',
    'rentals_equipment',
    'software',
    'travel',
    'taxes_fees',
    'miscellaneous',
  ]

  return allowed.includes(normalized as ExpenseCategory) ? (normalized as ExpenseCategory) : null
}

function nonNegativeCents(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, roundCents(value ?? 0))
}

function positiveWhole(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.max(1, Math.round(value))
}

function safeNumber(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value ?? 0)
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + nonNegativeCents(value), 0)
}

function formatCurrency(cents: number): string {
  return `$${(nonNegativeCents(cents) / 100).toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${clampPercent(value).toFixed(1).replace(/\.0$/, '')}%`
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIsoDate(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetween(startIsoDate: string, endIsoDate: string): number {
  const start = parseIsoDate(startIsoDate)
  const end = parseIsoDate(endIsoDate)
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay)
}

function parseIsoDate(isoDate: string): Date {
  const parsed = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${todayIsoDate()}T00:00:00.000Z`)
  }

  return parsed
}
