import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import {
  getLaunchReadinessReport,
  type LaunchReadinessCheck,
  type LaunchReadinessStatus,
} from '@/lib/validation/launch-readiness'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  ExternalLink,
  ShieldCheck,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Launch Readiness Export - Admin' }

function statusLabel(status: LaunchReadinessStatus): string {
  if (status === 'verified') return 'Verified'
  if (status === 'operator_review') return 'Operator review'
  return 'Needs action'
}

function statusClass(status: LaunchReadinessStatus): string {
  if (status === 'verified') return 'border-emerald-900 bg-emerald-950/35 text-emerald-200'
  if (status === 'operator_review') return 'border-amber-900 bg-amber-950/35 text-amber-200'
  return 'border-stone-700 bg-stone-950 text-stone-300'
}

function StatusIcon({ status }: { status: LaunchReadinessStatus }) {
  if (status === 'verified') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
  }
  if (status === 'operator_review') {
    return <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
  }
  return <Circle className="h-4 w-4 text-stone-500" aria-hidden="true" />
}

function CheckStatusCard({ check }: { check: LaunchReadinessCheck }) {
  return (
    <article className="rounded-lg border border-stone-800 bg-stone-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-900 ring-1 ring-stone-800">
            <StatusIcon status={check.status} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-stone-100">{check.label}</h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">{check.evidence}</p>
          </div>
        </div>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(
            check.status
          )}`}
        >
          {statusLabel(check.status)}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-stone-400">{check.nextStep}</p>

      {check.evidenceItems.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {check.evidenceItems.map((item) => (
            <div key={`${check.key}-${item.label}`} className="rounded-lg bg-stone-900 p-3">
              <p className="text-[11px] font-semibold uppercase text-stone-500">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-stone-100">{item.value}</p>
              <p className="mt-1 text-xs text-stone-500">{item.source}</p>
              {item.href ? (
                <Link href={item.href} className="mt-2 inline-flex text-xs text-brand-400">
                  Open evidence
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export default async function AdminLaunchReadinessExportPage() {
  await requireAdmin()
  const report = await getLaunchReadinessReport()
  const percent = Math.round((report.verifiedChecks / report.totalChecks) * 100)
  const reviewCount = report.checks.filter((check) => check.status === 'operator_review').length
  const needsActionCount = report.checks.filter((check) => check.status === 'needs_action').length
  const primaryAction = report.nextActions[0] ?? null
  const launchBlocked = report.status === 'blocked'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/admin/launch-readiness"
            className="mb-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to readiness
          </Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Evidence packet
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Launch Readiness Export</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            Read-only packet for a launch decision review. Every number and blocker below is pulled
            from the same readiness report that powers the admin proof gate.
          </p>
          <p className="mt-1 text-xs text-stone-500">Generated {report.generatedAt}</p>
        </div>

        <section
          className={`rounded-xl border p-4 text-right ${
            launchBlocked
              ? 'border-amber-900 bg-amber-950/30'
              : 'border-emerald-900 bg-emerald-950/30'
          }`}
        >
          <p className="text-xs font-semibold uppercase text-stone-400">Launch status</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              launchBlocked ? 'text-amber-100' : 'text-emerald-100'
            }`}
          >
            {launchBlocked ? 'Blocked' : 'Ready'}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            {report.verifiedChecks}/{report.totalChecks} checks verified
          </p>
        </section>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Verified</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{percent}%</p>
        </div>
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-300">System verified</p>
          <p className="mt-2 text-3xl font-bold text-emerald-100">{report.verifiedChecks}</p>
        </div>
        <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-4">
          <p className="text-xs font-semibold uppercase text-amber-300">Operator review</p>
          <p className="mt-2 text-3xl font-bold text-amber-100">{reviewCount}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Needs action</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{needsActionCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-950 ring-1 ring-stone-800">
            <ShieldCheck className="h-5 w-5 text-brand-300" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-100">Decision summary</h2>
            {launchBlocked ? (
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Launch remains blocked until the open readiness checks move out of needs-action or
                operator-review state. The next practical step is{' '}
                <span className="font-semibold text-stone-100">
                  {primaryAction?.label ?? 'review the open checklist'}
                </span>
                .
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-stone-300">
                All readiness checks are verified. This packet can be used as the current launch
                evidence snapshot.
              </p>
            )}
            {primaryAction ? (
              <Link
                href={primaryAction.href ?? '/admin/launch-readiness'}
                className="mt-3 inline-flex text-sm text-brand-400"
              >
                Open primary action
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-100">Checklist Evidence</h2>
            <p className="mt-1 text-sm text-stone-500">
              Operator-review checks are kept separate from verified proof.
            </p>
          </div>
          <p className="text-xs text-stone-500">{report.totalChecks} total checks</p>
        </div>
        <div className="mt-4 grid gap-3">
          {report.checks.map((check) => (
            <CheckStatusCard key={check.key} check={check} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
          <h2 className="text-base font-semibold text-stone-100">Pilot Candidates</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-stone-500">
                <tr className="border-b border-stone-800">
                  <th className="py-2 pr-4 font-semibold">Chef</th>
                  <th className="py-2 pr-4 font-semibold">System checks</th>
                  <th className="py-2 pr-4 font-semibold">Signals</th>
                  <th className="py-2 pr-4 font-semibold">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {report.pilotCandidates.map((chef) => (
                  <tr key={chef.chefId}>
                    <td className="py-3 pr-4 text-stone-100">
                      <div className="font-medium">{chef.chefName}</div>
                      <div className="text-xs text-stone-500">
                        {chef.activeSpanDays} days active
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-stone-300">
                      {chef.completedSystemSteps}/{chef.totalSystemSteps}
                    </td>
                    <td className="py-3 pr-4 text-xs text-stone-400">
                      {chef.evidence.inquiries} inquiries, {chef.evidence.events} events,{' '}
                      {chef.evidence.feedbackSignals} feedback
                    </td>
                    <td className="py-3 pr-4 text-xs text-stone-400">
                      {chef.nextStepLabel ?? 'No open step'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.pilotCandidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">No pilot candidates found.</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <h2 className="text-base font-semibold text-stone-100">Next Actions</h2>
            <div className="mt-4 space-y-3">
              {report.nextActions.map((action) => (
                <div
                  key={action.label}
                  className="rounded-lg border border-stone-800 bg-stone-950 p-3"
                >
                  <p className="text-sm font-medium text-stone-100">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{action.reason}</p>
                  {action.href ? (
                    <Link href={action.href} className="mt-2 inline-flex text-xs text-brand-400">
                      Open action
                    </Link>
                  ) : null}
                </div>
              ))}
              {report.nextActions.length === 0 ? (
                <p className="text-sm text-stone-500">No open launch evidence actions.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <h2 className="text-base font-semibold text-stone-100">Evidence Log</h2>
            <div className="mt-4 space-y-3">
              {report.evidenceLog.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-stone-800 bg-stone-950 p-3"
                >
                  <p className="text-xs font-semibold uppercase text-stone-500">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-stone-100">{item.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{item.source}</p>
                  {item.href ? (
                    <Link href={item.href} className="mt-2 inline-flex text-xs text-brand-400">
                      Open evidence
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
