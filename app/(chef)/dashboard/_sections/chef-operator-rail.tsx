import Link from 'next/link'
import type { PriorityQueue } from '@/lib/queue/types'
import type { ChefRailCandidate } from '@/lib/discovery/chef-rail-contracts'
import { rankChefRailCandidates } from '@/lib/discovery/chef-rail-priority'

function itemCategory(domain: string): ChefRailCandidate['category'] {
  if (domain === 'event' || domain === 'financial') return 'event_risk'
  if (domain === 'inquiry' || domain === 'quote' || domain === 'client') return 'follow_up'
  if (domain === 'culinary') return 'menu_opportunity'
  if (domain === 'network' || domain === 'prospect') return 'partner_lead'
  return 'opening'
}

function itemAction(category: ChefRailCandidate['category']): ChefRailCandidate['action'] {
  switch (category) {
    case 'event_risk':
      return 'open_workflow'
    case 'follow_up':
      return 'send_follow_up'
    case 'menu_opportunity':
      return 'create_menu_draft'
    case 'partner_lead':
      return 'open_workflow'
    case 'opening':
      return 'promote_opening'
  }
}

function urgencyScore(urgency: string): number {
  if (urgency === 'critical') return 100
  if (urgency === 'high') return 82
  if (urgency === 'normal') return 58
  return 35
}

function buildCandidates(queue: PriorityQueue): ChefRailCandidate[] {
  const now = new Date().toISOString()
  return queue.items.slice(0, 12).map((item) => {
    const category = itemCategory(item.domain)
    const urgency = urgencyScore(item.urgency)
    return {
      id: item.id,
      tenantId: 'chef-dashboard',
      category,
      title: item.title,
      reasonCode: `${category}.${item.urgency}`,
      reason:
        item.context.secondaryLabel ??
        item.context.primaryLabel ??
        (category === 'opening' ? 'Open dashboard action' : 'Needs chef attention'),
      href: item.href,
      action: itemAction(category),
      urgency,
      moneyImpact: item.domain === 'financial' || item.domain === 'quote' ? 90 : 50,
      eventRisk: category === 'event_risk' ? urgency : 25,
      relationshipValue: category === 'follow_up' ? 82 : 45,
      confidence: 78,
      freshness: 86,
      actionability: item.href ? 92 : 0,
      createdAt: item.createdAt || now,
    }
  })
}

export async function ChefOperatorRail({ queuePromise }: { queuePromise: Promise<PriorityQueue> }) {
  const queue = await queuePromise
  const ranked = rankChefRailCandidates({
    candidates: buildCandidates(queue),
    now: new Date(),
    limit: 6,
  })

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Operator Rail
          </p>
          <h2 className="mt-1 text-base font-semibold text-stone-100">Act on today</h2>
        </div>
        <Link href="/queue" className="text-xs font-medium text-stone-400 hover:text-stone-200">
          Queue
        </Link>
      </div>

      {ranked.length === 0 ? (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3">
          <p className="text-sm font-medium text-stone-300">No urgent chef signals</p>
          <p className="mt-1 text-xs text-stone-500">
            Follow-ups, event risks, openings, and menu opportunities are clear.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-lg border border-stone-800 bg-stone-900/70 p-3 transition-colors hover:border-stone-700 hover:bg-stone-900"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-5 text-stone-100">{item.title}</p>
                <span className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[11px] font-medium text-stone-400">
                  {item.score}
                </span>
              </div>
              <p className="mt-2 text-xs leading-4 text-stone-500">{item.reason}</p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                {item.category.replace(/_/g, ' ')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export function ChefOperatorRailSkeleton() {
  return <div className="h-36 rounded-xl loading-bone loading-bone-muted" />
}
