import { requireChef } from '@/lib/auth/get-user'
import { aggregateRailItems } from '@/lib/rail/aggregator'
import { RailLifecycleItems } from '@/components/dashboard/rail-lifecycle-items'

export async function RailLifecycleSection() {
  const user = await requireChef()

  let result
  try {
    result = await aggregateRailItems(user.tenantId!, user.id)
  } catch (err) {
    console.error('[RailLifecycleSection] Aggregation failed:', err)
    return null
  }

  if (result.totalItems === 0) return null

  const subtitle =
    result.critical.length > 0
      ? `${result.critical.length} critical item${result.critical.length > 1 ? 's' : ''} need attention`
      : `${result.totalItems} item${result.totalItems > 1 ? 's' : ''} across your workflow`

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4 sm:px-5">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Action Rail</p>
        <h2 className="mt-1 text-base font-semibold text-stone-100">{subtitle}</h2>
      </div>
      <RailLifecycleItems
        critical={result.critical}
        action={result.action}
        awareness={result.awareness}
        opportunity={result.opportunity}
      />
    </section>
  )
}

export function RailLifecycleSectionSkeleton() {
  return <div className="h-28 rounded-xl loading-bone loading-bone-muted" />
}
