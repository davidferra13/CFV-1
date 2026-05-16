import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { getAdminLegalReadinessOverview } from '@/lib/legal/actions'

export const metadata = {
  title: 'Legal Readiness | Admin',
}

function statusClass(status: string) {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'not_applicable':
      return 'border-stone-600 bg-stone-800 text-stone-300'
    case 'missing':
      return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    default:
      return 'border-orange-500/30 bg-orange-500/10 text-orange-300'
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export default async function AdminLegalReadinessPage() {
  await requireAdmin()
  const overview = await getAdminLegalReadinessOverview()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Legal Readiness</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-400">
          Platform compliance infrastructure, policy versioning, consent coverage, data rights, and
          takedown readiness. Draft and needs-review statuses require professional review before
          launch reliance.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {Object.entries(overview.summary.counts).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-stone-800 bg-stone-900 p-4">
            <p className="text-xs uppercase text-stone-500">{status.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">{count}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-stone-800 bg-stone-900">
        <div className="border-b border-stone-800 px-4 py-3">
          <h2 className="font-semibold text-stone-100">Global Readiness</h2>
        </div>
        <div className="divide-y divide-stone-800">
          {overview.items.map((item) => (
            <div key={item.itemKey} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium text-stone-100">{item.title}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {item.category}
                  {item.jurisdiction ? ` / ${item.jurisdiction}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.relatedLink ? (
                  <Link href={item.relatedLink} className="text-xs text-amber-300 hover:underline">
                    Open
                  </Link>
                ) : null}
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-stone-800 bg-stone-900">
          <div className="border-b border-stone-800 px-4 py-3">
            <h2 className="font-semibold text-stone-100">Policy Versions</h2>
          </div>
          <div className="divide-y divide-stone-800">
            {overview.policyVersions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-500">
                No persisted policy versions found.
              </p>
            ) : (
              overview.policyVersions.slice(0, 12).map((policy) => (
                <div
                  key={`${policy.policy_type}-${policy.version}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {policy.title ?? policy.policy_type}
                    </p>
                    <p className="text-xs text-stone-500">{policy.version}</p>
                  </div>
                  <StatusBadge status={policy.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900">
          <div className="border-b border-stone-800 px-4 py-3">
            <h2 className="font-semibold text-stone-100">Consent And Case Coverage</h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 p-4 text-sm">
            <div>
              <dt className="text-stone-500">Policy acceptances</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-100">
                {overview.acceptances.length}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Marketing opt records</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-100">
                {overview.consentCoverage.marketing}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Data-rights cases</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-100">
                {overview.dataRightsCases.length}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">DMCA cases</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-100">
                {overview.dmcaCases.length}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-red-500/20 bg-red-950/20">
        <div className="border-b border-red-500/20 px-4 py-3">
          <h2 className="font-semibold text-red-200">Needs Professional Review</h2>
        </div>
        <ul className="space-y-2 p-4 text-sm text-red-100">
          {overview.highRiskWarnings.slice(0, 12).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </section>

      {overview.queryWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          Migration/runtime warning: {overview.queryWarnings.join('; ')}
        </div>
      ) : null}
    </div>
  )
}
