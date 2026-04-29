import type { ClientWorkGraph, ClientWorkItem } from '@/lib/client-work-graph/types'
import type {
  BuildClientContinuitySummaryOptions,
  ClientContinuityChangeDigest,
  ClientContinuityCount,
  ClientContinuityItem,
  ClientContinuityNextStep,
  ClientContinuitySnapshot,
  ClientContinuitySummary,
} from './types'

type CountRule = {
  key: keyof ClientWorkGraph['summary']
  label: string
  href: string
  priority: number
}

type SnapshotCount = {
  id: string
  label: string
  count: number
  href: string
  priority: number
}

const DEFAULT_IMPORTANT_ITEM_LIMIT = 5
const DEFAULT_COUNT_LIMIT = 8
const EMPTY_CHANGE_DIGEST: ClientContinuityChangeDigest = {
  since: null,
  basis: 'none',
  label: 'No previous client dashboard visit is recorded yet.',
  items: [],
  unreadCount: 0,
}

const COUNT_RULES: CountRule[] = [
  { key: 'proposalCount', label: 'Proposal reviews', href: '/my-events', priority: 100 },
  { key: 'paymentDueCount', label: 'Payments due', href: '/my-events', priority: 95 },
  {
    key: 'outstandingBalanceCount',
    label: 'Outstanding balances',
    href: '/my-events',
    priority: 90,
  },
  { key: 'quotePendingCount', label: 'Quotes waiting', href: '/my-quotes', priority: 85 },
  { key: 'inquiryAwaitingCount', label: 'Inquiry replies', href: '/my-inquiries', priority: 80 },
  { key: 'menuApprovalCount', label: 'Menus to review', href: '/my-events', priority: 75 },
  { key: 'checklistCount', label: 'Checklists to confirm', href: '/my-events', priority: 70 },
  { key: 'rsvpPendingCount', label: 'RSVP follow-ups', href: '/my-events', priority: 65 },
  { key: 'friendRequestCount', label: 'Friend requests', href: '/my-hub', priority: 60 },
  {
    key: 'hubUnreadCount',
    label: 'Unread circle updates',
    href: '/my-hub/notifications',
    priority: 55,
  },
  { key: 'profileCount', label: 'Profile updates', href: '/my-profile', priority: 50 },
  { key: 'notificationCount', label: 'Unread notifications', href: '/my-events', priority: 45 },
  { key: 'planningCount', label: 'Planning items', href: '/my-hub', priority: 40 },
]

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function mapNextStep(item: ClientWorkItem | null): ClientContinuityNextStep | null {
  if (!item) return null

  return {
    id: item.id,
    kind: item.kind,
    category: item.category,
    sourceId: item.sourceId,
    sourceType: item.sourceType,
    urgency: item.urgency,
    label: item.title,
    detail: item.detail,
    href: item.href,
    ctaLabel: item.ctaLabel,
  }
}

function mapWorkItem(item: ClientWorkItem, index: number): ClientContinuityItem {
  return {
    id: `work:${item.id}`,
    source: index === 0 ? 'work_graph_primary' : 'work_graph_item',
    kind: item.kind,
    label: item.title,
    detail: item.detail,
    href: item.href,
    urgency: item.urgency,
  }
}

function mapChangeItem(item: ClientContinuityChangeDigest['items'][number]): ClientContinuityItem {
  return {
    id: item.id,
    source: item.source,
    kind: item.kind,
    label: item.label,
    detail: item.detail,
    href: item.href,
    urgency: item.readAt ? 'low' : 'medium',
    occurredAt: item.occurredAt,
  }
}

function buildWorkGraphCounts(workGraph: ClientWorkGraph): ClientContinuityCount[] {
  return COUNT_RULES.map((rule) => ({
    rule,
    count: Number(workGraph.summary[rule.key] ?? 0),
  }))
    .filter(({ count }) => count > 0)
    .sort((left, right) => right.rule.priority - left.rule.priority)
    .map(({ rule, count }) => ({
      id: `count:${String(rule.key)}`,
      label: rule.label,
      count,
      href: rule.href,
      source: 'work_graph_count',
    }))
}

function getOpenInquiryCount(snapshot: ClientContinuitySnapshot): number {
  return snapshot.inquiries.filter((inquiry) =>
    ['new', 'awaiting_client', 'awaiting_chef'].includes(inquiry.status)
  ).length
}

function buildSnapshotCounts(snapshot: ClientContinuitySnapshot | null): ClientContinuityCount[] {
  if (!snapshot) return []

  const counts: SnapshotCount[] = [
    {
      id: 'snapshot:upcoming_events',
      label: 'Upcoming events',
      count: snapshot.eventsResult.upcoming.length,
      href: '/my-events',
      priority: 30,
    },
    {
      id: 'snapshot:past_events',
      label: 'Past events',
      count: snapshot.eventsResult.pastTotalCount,
      href: '/my-events',
      priority: 20,
    },
    {
      id: 'snapshot:open_inquiries',
      label: 'Open inquiries',
      count: getOpenInquiryCount(snapshot),
      href: '/my-inquiries',
      priority: 25,
    },
  ]

  if (snapshot.profileSummary.completionPercent < 100) {
    counts.push({
      id: 'snapshot:profile_completion',
      label: 'Profile completion',
      count: snapshot.profileSummary.completionPercent,
      href: '/my-profile',
      priority: 15,
    })
  }

  return counts
    .filter((count) => count.count > 0)
    .sort((left, right) => right.priority - left.priority)
    .map((count) => ({
      id: count.id,
      label: count.label,
      count: count.count,
      href: count.href,
      source: 'shared_snapshot',
    }))
}

function buildSnapshotItems(snapshot: ClientContinuitySnapshot | null): ClientContinuityItem[] {
  if (!snapshot) return []

  const items: ClientContinuityItem[] = []
  const upcomingCount = snapshot.eventsResult.upcoming.length
  const openInquiryCount = getOpenInquiryCount(snapshot)

  if (upcomingCount > 0) {
    items.push({
      id: 'snapshot:upcoming_events',
      source: 'shared_snapshot',
      kind: 'upcoming_events',
      label: 'Upcoming events',
      detail: pluralize(upcomingCount, 'upcoming event is', 'upcoming events are') + ' on file.',
      href: '/my-events',
      count: upcomingCount,
    })
  }

  if (openInquiryCount > 0) {
    items.push({
      id: 'snapshot:open_inquiries',
      source: 'shared_snapshot',
      kind: 'open_inquiries',
      label: 'Open inquiries',
      detail: pluralize(openInquiryCount, 'open inquiry is', 'open inquiries are') + ' on file.',
      href: '/my-inquiries',
      count: openInquiryCount,
    })
  }

  if (snapshot.eventsResult.pastTotalCount > 0) {
    items.push({
      id: 'snapshot:past_events',
      source: 'shared_snapshot',
      kind: 'past_events',
      label: 'Past event history',
      detail:
        pluralize(snapshot.eventsResult.pastTotalCount, 'past event is', 'past events are') +
        ' on file.',
      href: '/my-events',
      count: snapshot.eventsResult.pastTotalCount,
    })
  }

  return items
}

function uniqueByHrefAndLabel(items: ClientContinuityItem[]): ClientContinuityItem[] {
  const seen = new Set<string>()
  const result: ClientContinuityItem[] = []

  for (const item of items) {
    const key = `${item.href}:${item.label}`
    if (seen.has(key)) continue

    seen.add(key)
    result.push(item)
  }

  return result
}

function buildHeadlineAndDetail(input: {
  workGraph: ClientWorkGraph
  primaryNextStep: ClientContinuityNextStep | null
  snapshot: ClientContinuitySnapshot | null
}): Pick<ClientContinuitySummary, 'headline' | 'detail'> {
  const totalItems = input.workGraph.summary.totalItems

  if (input.primaryNextStep) {
    return {
      headline: input.primaryNextStep.label,
      detail:
        totalItems > 1
          ? `${pluralize(totalItems, 'client item needs', 'client items need')} attention. Start with: ${input.primaryNextStep.detail}`
          : input.primaryNextStep.detail,
    }
  }

  const upcomingCount = input.snapshot?.eventsResult.upcoming.length ?? 0

  if (upcomingCount > 0) {
    return {
      headline: 'Client is caught up',
      detail: `${pluralize(upcomingCount, 'upcoming event is', 'upcoming events are')} on file and no client actions are waiting in the current work graph.`,
    }
  }

  return {
    headline: 'Client is caught up',
    detail: 'No client actions are waiting in the current work graph.',
  }
}

export function buildClientContinuitySummary(
  workGraph: ClientWorkGraph,
  options: BuildClientContinuitySummaryOptions = {}
): ClientContinuitySummary {
  const snapshot = options.snapshot ?? null
  const changeDigest = options.changeDigest ?? EMPTY_CHANGE_DIGEST
  const importantItemLimit = options.importantItemLimit ?? DEFAULT_IMPORTANT_ITEM_LIMIT
  const countLimit = options.countLimit ?? DEFAULT_COUNT_LIMIT
  const primaryNextStep = mapNextStep(workGraph.primary)
  const workItems = workGraph.items.map(mapWorkItem)
  const changeItems = changeDigest.items.map(mapChangeItem)
  const snapshotItems = buildSnapshotItems(snapshot)
  const importantItems = uniqueByHrefAndLabel([
    ...changeItems,
    ...workItems,
    ...snapshotItems,
  ]).slice(0, importantItemLimit)
  const counts = [...buildWorkGraphCounts(workGraph), ...buildSnapshotCounts(snapshot)].slice(
    0,
    countLimit
  )
  const caughtUp = !primaryNextStep && workGraph.summary.totalItems === 0
  const copy = buildHeadlineAndDetail({ workGraph, primaryNextStep, snapshot })

  return {
    generatedAt: workGraph.generatedAt,
    caughtUp,
    headline: copy.headline,
    detail: copy.detail,
    primaryNextStep,
    changeDigest,
    importantItems,
    counts,
    workGraphSummary: workGraph.summary,
  }
}
