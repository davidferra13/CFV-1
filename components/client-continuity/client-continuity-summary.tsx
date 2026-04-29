import type { AnchorHTMLAttributes } from 'react'
import type {
  ClientWorkItemCategory,
  ClientWorkItemKind,
  ClientWorkItemUrgency,
} from '@/lib/client-work-graph/types'
import type {
  ClientContinuityChangeItem as DeterministicChangeItem,
  ClientContinuityItem as DeterministicContinuityItem,
  ClientContinuityNextStep,
  ClientContinuitySummary as DeterministicContinuitySummary,
} from '@/lib/client-continuity'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ClientContinuityAction = {
  href: string
  label: string
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target']
  rel?: string
}

export type ClientContinuityItem = Pick<
  ClientContinuityNextStep,
  'id' | 'category' | 'urgency' | 'detail' | 'href' | 'ctaLabel'
> & {
  kind: ClientWorkItemKind | 'notification_change'
  title: string
  statusLabel?: string
  action?: ClientContinuityAction | null
}

export type ClientContinuityCaughtUpState = {
  title?: string
  detail?: string
  action?: ClientContinuityAction | null
}

export type ClientContinuityUnavailableState = {
  title?: string
  detail?: string
}

export type ClientReturnContinuitySummary = {
  primary: ClientContinuityItem | null
  contextItems: ClientContinuityItem[]
  openItems: ClientContinuityItem[]
  caughtUp?: ClientContinuityCaughtUpState | null
  unavailable?: ClientContinuityUnavailableState | null
  headline?: string
  detail?: string
}

export type ClientContinuitySummaryProps = {
  summary: DeterministicContinuitySummary | ClientReturnContinuitySummary | null | undefined
  className?: string
  maxContextItems?: number
  maxOpenItems?: number
}

const CATEGORY_LABELS: Record<ClientWorkItemCategory, string> = {
  event: 'Event',
  quote: 'Quote',
  inquiry: 'Inquiry',
  profile: 'Profile',
  rsvp: 'RSVP',
  hub: 'Hub',
  notification: 'Notification',
  planning: 'Planning',
}

const URGENCY_BADGES: Record<ClientWorkItemUrgency, 'default' | 'info' | 'warning'> = {
  high: 'warning',
  medium: 'info',
  low: 'default',
}

function normalizeCategory(
  kind: ClientWorkItemKind | 'notification_change'
): ClientWorkItemCategory {
  if (kind === 'notification_change') return 'notification'
  if (kind.startsWith('event_')) return 'event'
  if (kind === 'quote_review') return 'quote'
  if (kind === 'inquiry_reply') return 'inquiry'
  if (kind === 'rsvp_pending' || kind === 'share_setup') return 'rsvp'
  if (kind === 'friend_request' || kind === 'hub_unread') return 'hub'
  if (kind === 'notification_follow_up') return 'notification'
  if (kind === 'stub_planning' || kind === 'stub_seeking_chef') return 'planning'
  return 'profile'
}

function mapDeterministicChangeItem(item: DeterministicChangeItem): ClientContinuityItem {
  return {
    id: item.id,
    kind: item.kind,
    category: 'notification',
    urgency: item.readAt ? 'low' : 'medium',
    title: item.label,
    detail: item.detail,
    href: item.href,
    ctaLabel: 'Open Update',
    statusLabel: item.readAt ? 'Read' : 'Unread',
  }
}

function mapDeterministicNextStep(item: ClientContinuityNextStep): ClientContinuityItem {
  return {
    id: item.id,
    kind: item.kind,
    category: item.category,
    urgency: item.urgency,
    title: item.label,
    detail: item.detail,
    href: item.href,
    ctaLabel: item.ctaLabel,
  }
}

function mapDeterministicItem(item: DeterministicContinuityItem): ClientContinuityItem | null {
  if (
    item.kind === 'upcoming_events' ||
    item.kind === 'past_events' ||
    item.kind === 'open_inquiries'
  ) {
    return null
  }

  return {
    id: item.id,
    kind: item.kind,
    category: normalizeCategory(item.kind),
    urgency: item.urgency ?? 'low',
    title: item.label,
    detail: item.detail,
    href: item.href,
    ctaLabel: 'Open',
  }
}

function isDeterministicSummary(
  summary: DeterministicContinuitySummary | ClientReturnContinuitySummary
): summary is DeterministicContinuitySummary {
  return 'primaryNextStep' in summary && 'importantItems' in summary
}

function normalizeSummary(
  summary: DeterministicContinuitySummary | ClientReturnContinuitySummary | null | undefined
): ClientReturnContinuitySummary | null | undefined {
  if (!summary || !isDeterministicSummary(summary)) return summary

  const primary = summary.primaryNextStep ? mapDeterministicNextStep(summary.primaryNextStep) : null
  const changedItems = summary.changeDigest.items.map(mapDeterministicChangeItem)
  const mappedItems = summary.importantItems
    .map(mapDeterministicItem)
    .filter((item): item is ClientContinuityItem => Boolean(item))

  return {
    primary,
    contextItems: changedItems,
    openItems: mappedItems.filter(
      (item) => item.id !== primary?.id && item.kind !== 'notification_change'
    ),
    headline: summary.headline,
    detail: summary.detail,
    caughtUp: summary.caughtUp
      ? {
          title: summary.headline,
          detail: summary.detail,
          action: { href: '/my-events', label: 'View Events' },
        }
      : null,
  }
}

function resolveAction(item: ClientContinuityItem): ClientContinuityAction | null {
  if (item.action) {
    return item.action
  }

  if (item.href && item.ctaLabel) {
    return {
      href: item.href,
      label: item.ctaLabel,
    }
  }

  return null
}

function ContinuityActionButton({
  action,
  variant = 'primary',
}: {
  action: ClientContinuityAction | null | undefined
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  if (!action?.href) {
    return null
  }

  const rel = action.rel ?? (action.target === '_blank' ? 'noreferrer' : undefined)

  return (
    <Button
      href={action.href}
      variant={variant}
      size="sm"
      target={action.target}
      rel={rel}
      className="w-full sm:w-auto"
    >
      {action.label}
    </Button>
  )
}

function ItemBadges({ item }: { item: ClientContinuityItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default" className="px-2 py-0.5 text-xxs uppercase tracking-wide">
        {CATEGORY_LABELS[item.category]}
      </Badge>
      <Badge
        variant={URGENCY_BADGES[item.urgency]}
        className="px-2 py-0.5 text-xxs uppercase tracking-wide"
      >
        {item.urgency}
      </Badge>
      {item.statusLabel ? (
        <Badge variant="info" className="px-2 py-0.5 text-xxs uppercase tracking-wide">
          {item.statusLabel}
        </Badge>
      ) : null}
    </div>
  )
}

function ContinuityItemRow({ item }: { item: ClientContinuityItem }) {
  const action = resolveAction(item)

  return (
    <li className="border-t border-stone-800 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <ItemBadges item={item} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-100">{item.title}</p>
            <p className="text-xs leading-5 text-stone-400">{item.detail}</p>
          </div>
        </div>
        <ContinuityActionButton action={action} variant="secondary" />
      </div>
    </li>
  )
}

function ContinuityItemList({ title, items }: { title: string; items: ClientContinuityItem[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="space-y-3 border-t border-stone-800 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
        <Badge variant="default">{items.length}</Badge>
      </div>
      <ul>
        {items.map((item) => (
          <ContinuityItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

function ContinuityUnavailable({
  unavailable,
}: {
  unavailable?: ClientContinuityUnavailableState | null
}) {
  return (
    <div className="space-y-3" role="alert">
      <Badge variant="error">Unavailable</Badge>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-stone-100">
          {unavailable?.title ?? 'Continuity summary could not load'}
        </p>
        <p className="text-sm leading-6 text-stone-400">
          {unavailable?.detail ??
            'We could not confirm your current action items. Please refresh before making decisions.'}
        </p>
      </div>
    </div>
  )
}

function ContinuityCaughtUp({ caughtUp }: { caughtUp?: ClientContinuityCaughtUpState | null }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge variant="success">Caught up</Badge>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-100">
            {caughtUp?.title ?? 'You are all caught up'}
          </p>
          <p className="text-sm leading-6 text-stone-400">
            {caughtUp?.detail ?? 'There are no changed or open items waiting on you right now.'}
          </p>
        </div>
      </div>
      <ContinuityActionButton action={caughtUp?.action} variant="secondary" />
    </div>
  )
}

export function ClientContinuitySummary({
  summary,
  className,
  maxContextItems = 5,
  maxOpenItems = 5,
}: ClientContinuitySummaryProps) {
  const normalized = normalizeSummary(summary)
  const unavailable = normalized?.unavailable

  const contextItems = normalized?.contextItems.slice(0, Math.max(0, maxContextItems)) ?? []
  const openItems = normalized?.openItems.slice(0, Math.max(0, maxOpenItems)) ?? []
  const hasItems = Boolean(normalized?.primary || contextItems.length > 0 || openItems.length > 0)
  const primaryAction = normalized?.primary ? resolveAction(normalized.primary) : null

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Continue where you left off</CardTitle>
            <p className="text-sm text-stone-400">
              Your latest client work, updates, and open items in one place.
            </p>
          </div>
          {unavailable ? (
            <Badge variant="error">Needs refresh</Badge>
          ) : hasItems ? (
            <Badge variant="info">Action ready</Badge>
          ) : (
            <Badge variant="success">Current</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!normalized || unavailable ? (
          <ContinuityUnavailable unavailable={unavailable} />
        ) : hasItems ? (
          <>
            {normalized.primary ? (
              <section className="space-y-4">
                <div className="space-y-2">
                  <ItemBadges item={normalized.primary} />
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-stone-100">
                      {normalized.headline ?? normalized.primary.title}
                    </p>
                    <p className="text-sm leading-6 text-stone-400">
                      {normalized.detail ?? normalized.primary.detail}
                    </p>
                  </div>
                </div>
                <ContinuityActionButton action={primaryAction} />
              </section>
            ) : null}

            <ContinuityItemList title="Changed since your last visit" items={contextItems} />
            <ContinuityItemList title="Still open" items={openItems} />
          </>
        ) : (
          <ContinuityCaughtUp caughtUp={normalized.caughtUp} />
        )}
      </CardContent>
    </Card>
  )
}
