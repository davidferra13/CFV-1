// Corporate Procurement Layer Types
// Defines types for corporate client profiles, invoices, and spend reports.

export type PaymentTerms = 'net30' | 'net60' | 'net90' | 'due_on_receipt'

export type CorporateProfile = {
  id: string
  clientId: string
  tenantId: string
  companyName: string
  billingAddress: string | null
  billingCity: string | null
  billingState: string | null
  billingZip: string | null
  taxId: string | null
  defaultPoNumber: string | null
  paymentTerms: PaymentTerms
  billingContactName: string | null
  billingContactEmail: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CorporateProfileInput = {
  companyName: string
  billingAddress?: string | null
  billingCity?: string | null
  billingState?: string | null
  billingZip?: string | null
  taxId?: string | null
  defaultPoNumber?: string | null
  paymentTerms?: PaymentTerms
  billingContactName?: string | null
  billingContactEmail?: string | null
  notes?: string | null
}

export type CorporateInvoice = {
  invoiceNumber: string
  invoiceDate: string
  billTo: {
    companyName: string
    billingAddress: string | null
    billingCity: string | null
    billingState: string | null
    billingZip: string | null
    attention: string | null
    poNumber: string | null
  }
  paymentTerms: PaymentTerms
  taxId: string | null
  event: {
    id: string
    eventDate: string
    occasion: string | null
    guestCount: number
  }
  client: {
    fullName: string
    email: string | null
  }
  financial: {
    totalChargeCents: number
    totalPaidCents: number
    outstandingBalanceCents: number
  }
  lineItems: Array<{
    description: string
    amountCents: number
    entryType: string
  }>
}

export type SpendReportEntry = {
  eventId: string
  eventDate: string
  occasion: string | null
  totalChargeCents: number
  totalPaidCents: number
  outstandingCents: number
}

export type SpendReport = {
  clientId: string
  companyName: string
  dateRange: { from: string; to: string }
  totalSpendCents: number
  totalPaidCents: number
  totalOutstandingCents: number
  eventCount: number
  entries: SpendReportEntry[]
}
