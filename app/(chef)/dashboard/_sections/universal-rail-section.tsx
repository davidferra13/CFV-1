import { requireChef } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

export async function UniversalRailSection() {
  const user = await requireChef()

  let result
  try {
    result = await assembleRailForPage('chef', 'dashboard', user.id, user.tenantId ?? undefined)
  } catch (err) {
    console.error('[UniversalRailSection] Assembly failed:', err)
    return null
  }

  if (result.items.length === 0) return null

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4 sm:px-5">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Discovery Rail</p>
        <h2 className="mt-1 text-base font-semibold text-stone-100">Suggestions for you</h2>
      </div>
      <UniversalRailCompact
        items={result.items}
        role="chef"
        userId={user.id}
        tenantId={user.tenantId ?? undefined}
        pageContext="dashboard"
        maxVisible={8}
      />
    </section>
  )
}

export function UniversalRailSectionSkeleton() {
  return <div className="h-28 rounded-xl loading-bone loading-bone-muted" />
}
