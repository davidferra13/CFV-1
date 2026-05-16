import type { ActionSource } from '@/lib/action-center/types'
import type { SourceKind, WaitingOnKind } from '@/lib/operating-loop/types'

export type WaitingRadarSourceKind = SourceKind | ActionSource | 'reminder' | 'import'

export type WaitingRadarOwner =
  | 'client'
  | 'chef'
  | 'vendor'
  | 'staff'
  | 'system'
  | 'time'
  | 'decision'
  | 'payment'
  | 'unknown'

export type WaitingRadarRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface WaitingRadarItem {
  id: string
  sourceId: string
  sourceKind: WaitingRadarSourceKind
  title: string
  description: string | null
  waitingOn: WaitingRadarOwner
  waitingReason: string
  followUpAt: string | null
  proofHref: string
  riskLevel: WaitingRadarRiskLevel
  createdAt: string | null
  waitingSince: string | null
  metadata: Record<string, unknown>
}

export interface WaitingRadarSummary {
  total: number
  overdue: number
  dueSoon: number
  noFollowUp: number
  waitingOnClient: number
  waitingOnVendor: number
  waitingOnPayment: number
  waitingOnSystem: number
  emptyReason: 'no_source_data' | 'no_waiting_items' | null
}

export interface WaitingRadarResult {
  items: WaitingRadarItem[]
  summary: WaitingRadarSummary
}

export interface WaitingRadarOptions {
  now?: Date
  dueSoonHours?: number
}

export interface PaymentWaitingSource {
  id: string
  title?: string | null
  status?: string | null
  clientName?: string | null
  eventId?: string | null
  invoiceId?: string | null
  dueAt?: string | null
  followUpAt?: string | null
  waitingSince?: string | null
  createdAt?: string | null
  outstandingCents?: number | null
  proofHref?: string | null
  href?: string | null
  route?: string | null
  metadata?: Record<string, unknown> | null
}

export interface VendorWaitingSource {
  id: string
  title?: string | null
  vendorName?: string | null
  status?: string | null
  neededBy?: string | null
  followUpAt?: string | null
  waitingSince?: string | null
  createdAt?: string | null
  proofHref?: string | null
  href?: string | null
  route?: string | null
  metadata?: Record<string, unknown> | null
}

export interface SystemWaitingSource {
  id: string
  title?: string | null
  jobName?: string | null
  status?: string | null
  startedAt?: string | null
  followUpAt?: string | null
  waitingSince?: string | null
  createdAt?: string | null
  proofHref?: string | null
  href?: string | null
  route?: string | null
  metadata?: Record<string, unknown> | null
}

export interface WaitingRadarSources {
  actionCenterItems?: import('@/lib/action-center/types').UnifiedActionItem[]
  operatingLoopItems?: import('@/lib/operating-loop/types').OperatingLoopItem[]
  payments?: PaymentWaitingSource[]
  vendors?: VendorWaitingSource[]
  systems?: SystemWaitingSource[]
}

export function mapOperatingWaitingKind(kind: WaitingOnKind | null | undefined): WaitingRadarOwner {
  switch (kind) {
    case 'person':
    case 'reply':
      return 'client'
    case 'vendor':
      return 'vendor'
    case 'system':
    case 'import':
      return 'system'
    case 'time':
      return 'time'
    case 'decision':
      return 'decision'
    case 'payment':
      return 'payment'
    default:
      return 'unknown'
  }
}
