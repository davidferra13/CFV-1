import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefLegalReadinessCenter } from '@/lib/legal/actions'

export const metadata: Metadata = { title: 'Legal Readiness' }

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

export default async function LegalReadinessSettingsPage() {
  await requireChef()
  const center = await getChefLegalReadinessCenter()

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Legal Readiness</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-400">
          Business, policy, consent, payment, tax, marketplace, data-rights, and takedown readiness
          for this chef workspace. Items stay draft or needs review until a professional review is
          recorded.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase text-stone-500">Ready</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">{center.summary.readyCount}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase text-stone-500">Needs work</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">
            {center.summary.needsWorkCount}
          </p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs uppercase text-stone-500">Review flags</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">{center.reviewFlags.length}</p>
        </div>
      </div>

      <section className="rounded-lg border border-stone-800 bg-stone-900">
        <div className="border-b border-stone-800 px-4 py-3">
          <h2 className="font-semibold text-stone-100">Tenant Checklist</h2>
        </div>
        <div className="divide-y divide-stone-800">
          {center.items.map((item) => (
            <div key={item.itemKey} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium text-stone-100">{item.title}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {item.category}
                  {item.state ? ` / ${item.state}` : ''}
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <h2 className="font-semibold text-stone-100">Marketing And SMS</h2>
          <p className="mt-1 text-sm text-stone-400">
            Transactional messages and marketing consent are tracked separately.
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-100">{center.consents.length}</p>
          <p className="text-xs text-stone-500">tenant-scoped consent records</p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
          <h2 className="font-semibold text-stone-100">Data Rights And Takedowns</h2>
          <p className="mt-1 text-sm text-stone-400">
            Data requests, deletion workflows, and DMCA cases are durable case records.
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {center.dataRightsCases.length + center.dmcaCases.length}
          </p>
          <p className="text-xs text-stone-500">open or historical cases for this tenant</p>
        </div>
      </section>

      {center.reviewFlags.length > 0 ? (
        <section className="rounded-lg border border-orange-500/30 bg-orange-950/20">
          <div className="border-b border-orange-500/20 px-4 py-3">
            <h2 className="font-semibold text-orange-200">Payment, Tax, Marketplace Review</h2>
          </div>
          <div className="divide-y divide-orange-500/20">
            {center.reviewFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-orange-100">
                    {String(flag.area).replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-orange-200/70">
                    {flag.jurisdiction ?? 'No jurisdiction set'}
                  </p>
                </div>
                <StatusBadge status={flag.status} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-4 text-sm text-orange-100">
          Payment, tax, and marketplace review flags have not been configured yet. Do not rely on
          sales-tax, marketplace, refund, KYC, or 1099 settings without professional review.
        </div>
      )}

      {center.queryWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          Migration/runtime warning: {center.queryWarnings.join('; ')}
        </div>
      ) : null}
    </div>
  )
}
