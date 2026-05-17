// Inquiry Response Cockpit - Types
// Data layer for PUBLIC #11: Inquiry Response Cockpit UI Deepening

export type InquiryStatus =
  | 'new'
  | 'viewed'
  | 'responded'
  | 'qualified'
  | 'converted'
  | 'declined'
  | 'expired'

export type InquiryPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface InquiryCockpitEntry {
  id: string
  tenantId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  source: string
  eventType: string | null
  eventDate: string | null
  guestCount: number | null
  budget: string | null
  status: InquiryStatus
  priority: InquiryPriority
  notes: string | null
  responseTimeMinutes: number | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

export interface InquiryTemplate {
  id: string
  tenantId: string
  name: string
  subject: string
  body: string
  category: string | null
  useCount: number
  createdAt: string
}

export interface InquiryMetrics {
  totalInquiries: number
  avgResponseTime: number | null
  conversionRate: number
  bySource: Record<string, number>
  byStatus: Record<string, number>
  byMonth: Record<string, number>
}

export interface InquiryFilter {
  status?: InquiryStatus
  priority?: InquiryPriority
  source?: string
  dateRange?: { from: string; to: string }
  search?: string
}
