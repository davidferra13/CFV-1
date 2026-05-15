import { requireStaff } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

export async function StaffUniversalRailSection() {
  const user = await requireStaff()

  let result
  try {
    result = await assembleRailForPage('staff', 'dashboard', user.id, user.tenantId ?? undefined)
  } catch (err) {
    console.error('[StaffUniversalRailSection] Assembly failed:', err)
    return null
  }

  if (result.items.length === 0) return null

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4 sm:px-5">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Discovery Rail</p>
        <h2 className="mt-1 text-base font-semibold text-stone-100">Your shift intel</h2>
      </div>
      <UniversalRailCompact
        items={result.items}
        role="staff"
        userId={user.id}
        tenantId={user.tenantId ?? undefined}
        pageContext="dashboard"
        maxVisible={5}
      />
    </section>
  )
}

export function StaffUniversalRailSkeleton() {
  return <div className="h-28 rounded-xl loading-bone loading-bone-muted" />
}
