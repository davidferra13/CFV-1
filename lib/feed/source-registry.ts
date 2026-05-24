import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { CircleActivityItem } from '@/lib/dinner-circles/activity-feed-types'

export interface ComposedFeedEntry {
  id: string
  source: string // 'rail' | 'cil' | 'circle' | 'notification' | 'network_activity'
  score: number // normalized 0-100
  timestamp: number // epoch ms
  label: string
  sublabel?: string
  href?: string
  icon?: string
  category: string
  presentation: 'card' | 'pill' | 'alert' | 'timeline'
  expandable: boolean
  originalData: unknown
}

export interface FeedSourceAdapter {
  name: string
  weight: number // 0-1
  adapt(items: unknown[]): ComposedFeedEntry[]
}

// â”€â”€ Rail adapter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const railAdapter: FeedSourceAdapter = {
  name: 'rail',
  weight: 1.0,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as UniversalRailItem[]).map((item) => ({
      id: item.definitionId,
      source: 'rail',
      score: item.score,
      timestamp: item.lastSeenAt ? new Date(item.lastSeenAt).getTime() : Date.now(),
      label: item.label,
      sublabel: item.sublabel,
      href: item.href,
      icon: item.icon,
      category: item.category,
      presentation: 'card' as const,
      expandable: item.expandable ?? false,
      originalData: item,
    }))
  },
}

// â”€â”€ CIL adapter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const URGENCY_SCORE: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 }

const cilAdapter: FeedSourceAdapter = {
  name: 'cil',
  weight: 0.8,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as ProactiveSignal[]).map((sig) => ({
      id: sig.id,
      source: 'cil',
      score: URGENCY_SCORE[sig.urgency] ?? 60,
      timestamp: sig.createdAt,
      label: sig.title,
      sublabel: sig.detail,
      href: (sig.actionPayload?.href as string) ?? undefined,
      category: sig.domain,
      presentation: 'alert' as const,
      expandable: false,
      originalData: sig,
    }))
  },
}

// â”€â”€ Circle adapter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const circleAdapter: FeedSourceAdapter = {
  name: 'circle',
  weight: 0.6,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as CircleActivityItem[]).map((item) => ({
      id: item.id,
      source: 'circle',
      score: 50,
      timestamp: new Date(item.timestamp).getTime(),
      label: `${item.actorName} ${item.actionVerb.replace(/_/g, ' ')}`,
      sublabel: item.objectLabel,
      category: 'circle',
      presentation: 'timeline' as const,
      expandable: false,
      originalData: item,
    }))
  },
}

// â”€â”€ Notification adapter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NotificationItem {
  id: string
  category: string
  title: string
  message: string
  link?: string
  createdAt: string
}

const notificationAdapter: FeedSourceAdapter = {
  name: 'notification',
  weight: 0.5,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as NotificationItem[]).map((item) => ({
      id: item.id,
      source: 'notification',
      score: 40,
      timestamp: new Date(item.createdAt).getTime(),
      label: item.title,
      sublabel: item.message,
      href: item.link,
      category: item.category,
      presentation: 'pill' as const,
      expandable: false,
      originalData: item,
    }))
  },
}

// ── Network activity adapter ──────────────────────────────────────────────

interface NetworkActivityItem {
  chefId: string
  displayName: string | null
  businessName: string
  upcomingEventCount: number
  currentWeekCount: number
  busiestDay: string | null
  streakWeeks: number
  updatedAt: string
}

const networkActivityAdapter: FeedSourceAdapter = {
  name: 'network_activity',
  weight: 0.4,
  adapt(items: unknown[]): ComposedFeedEntry[] {
    return (items as NetworkActivityItem[]).map((chef) => ({
      id: `network-activity-${chef.chefId}`,
      source: 'network_activity',
      score: Math.min(chef.upcomingEventCount * 10, 60),
      timestamp: new Date(chef.updatedAt).getTime(),
      label: `${chef.displayName ?? chef.businessName} has ${chef.upcomingEventCount} dinner${chef.upcomingEventCount === 1 ? '' : 's'} coming up`,
      sublabel:
        chef.streakWeeks > 2
          ? `${chef.streakWeeks}-week streak`
          : chef.busiestDay
            ? `Busiest on ${chef.busiestDay}s`
            : undefined,
      href: '/network',
      icon: 'users',
      category: 'social_network',
      presentation: 'card' as const,
      expandable: false,
      originalData: chef,
    }))
  },
}

// â”€â”€ Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const SOURCE_REGISTRY: FeedSourceAdapter[] = [
  railAdapter,
  cilAdapter,
  circleAdapter,
  notificationAdapter,
  networkActivityAdapter,
]
