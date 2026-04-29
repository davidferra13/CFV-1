import type {
  ClientWorkGraph,
  ClientWorkItemCategory,
  ClientWorkItemKind,
  ClientWorkItemUrgency,
} from '@/lib/client-work-graph/types'
import type { SharedClientWorkGraphSnapshot } from '@/lib/client-work-graph/shared-snapshot'

export type ClientContinuitySnapshot = Pick<
  SharedClientWorkGraphSnapshot,
  'eventsResult' | 'quotes' | 'inquiries' | 'profileSummary' | 'rsvpSummary'
>

export type ClientContinuitySource =
  | 'work_graph_primary'
  | 'work_graph_item'
  | 'work_graph_count'
  | 'shared_snapshot'

export type ClientContinuityNextStep = {
  id: string
  kind: ClientWorkItemKind
  category: ClientWorkItemCategory
  sourceId: string
  sourceType: string
  urgency: ClientWorkItemUrgency
  label: string
  detail: string
  href: string
  ctaLabel: string
}

export type ClientContinuityItem = {
  id: string
  source: ClientContinuitySource
  kind: ClientWorkItemKind | 'upcoming_events' | 'past_events' | 'open_inquiries'
  label: string
  detail: string
  href: string
  count?: number
  urgency?: ClientWorkItemUrgency
}

export type ClientContinuityCount = {
  id: string
  label: string
  count: number
  href: string
  source: Extract<ClientContinuitySource, 'work_graph_count' | 'shared_snapshot'>
}

export type ClientContinuitySummary = {
  generatedAt: string
  caughtUp: boolean
  headline: string
  detail: string
  primaryNextStep: ClientContinuityNextStep | null
  importantItems: ClientContinuityItem[]
  counts: ClientContinuityCount[]
  workGraphSummary: ClientWorkGraph['summary']
}

export type BuildClientContinuitySummaryOptions = {
  snapshot?: ClientContinuitySnapshot | null
  importantItemLimit?: number
  countLimit?: number
}
