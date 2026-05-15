import { requireAdmin } from '@/lib/auth/admin'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRail } from '@/components/discovery/universal-rail'

export async function AdminUniversalRailSection() {
  await requireAdmin()

  let result
  try {
    result = await assembleRailForPage('admin', 'admin', undefined, undefined)
  } catch (err) {
    console.error('[AdminUniversalRailSection] Assembly failed:', err)
    return null
  }

  if (result.items.length === 0) return null

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4 sm:px-5">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Discovery Rail</p>
        <h2 className="mt-1 text-base font-semibold text-stone-100">Platform Intelligence</h2>
      </div>
      <UniversalRail
        items={result.items}
        role="admin"
        userId={undefined}
        tenantId={undefined}
        pageContext="admin"
      />
    </section>
  )
}

export function AdminUniversalRailSkeleton() {
  return <div className="h-28 rounded-xl loading-bone loading-bone-muted" />
}
