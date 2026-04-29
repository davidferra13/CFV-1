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
  CheckCircle2,
  ClipboardCheck,
  Circle,
  ExternalLink,
  ShieldCheck,
  Target,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Launch Readiness - Admin' }

function statusLabel(status: LaunchReadinessStatus): string {
  if (status === 'verified') return 'Verified'
  if (status === 'operator_review') return 'Review'
  return 'Needs action'
}

function statusClass(status: LaunchReadinessStatus): string {
  if (status === 'verified') return 'border-emerald-900 bg-emerald-950/40 text-emerald-200'
  if (status === 'operator_review') return 'border-amber-900 bg-amber-950/40 text-amber-200'
  return 'border-stone-700 bg-stone-900 text-stone-300'
}

function StatusIcon({ status }: { status: LaunchReadinessStatus }) {
  if (status === 'verified') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
  }
  if (status === 'operator_review') {
    return <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
  }
  return <Circle className="h-5 w-5 text-stone-500" aria-hidden="true" />
}

function CheckRow({ check }: { check: LaunchReadinessCheck }) {
  return (
    <div className="grid gap-4 border-b border-stone-800 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-950 ring-1 ring-stone-800">
          <StatusIcon status={check.status} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-100">{check.label}</h2>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(
                check.status
              )}`}
            >
              {statusLabel(check.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-300">{check.evidence}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">{check.nextStep}</p>
          {check.evidenceItems.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {check.evidenceItems.map((item) => (
                <div
                  key={`${check.key}-${item.label}`}
                  className="rounded-lg border border-stone-800 bg-stone-950/70 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase text-stone-500">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-stone-100">{item.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{item.source}</p>
                  {item.href ? (
                    <Link href={item.href} className="mt-2 inline-flex text-xs text-brand-400">
                      Open source
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {check.href ? (
        <Link
          href={check.href}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200 lg:self-start"
        >
          Open
          {check.href.startsWith('/book/') ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </Link>
      ) : null}
    </div>
  )
}

export default async function AdminLaunchReadinessPage() {
  await requireAdmin()
  const report = await getLaunchReadinessReport()
  const percent = Math.round((report.verifiedChecks / report.totalChecks) * 100)
  const reviewCount = report.checks.filter((check) => check.status === 'operator_review').length
  const needsActionCount = report.checks.filter((check) => check.status === 'needs_action').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            V1 proof gate
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Launch Readiness</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            One admin view for the V1 blockers that still require proof: real pilot usage, public
            booking validation, onboarding evidence, survey feedback, money loop evidence, and build
            integrity.
          </p>
          <p className="mt-1 text-xs text-stone-500">Generated {report.generatedAt}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 text-right">
          <p className="text-xs font-semibold uppercase text-stone-500">Verified</p>
          <p className="mt-1 text-3xl font-bold text-stone-100">{percent}%</p>
          <p className="text-xs text-stone-500">
            {report.verifiedChecks}/{report.totalChecks} checks
          </p>
          <Link
            href="/admin/launch-readiness/export"
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg border border-stone-700 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-950 hover:text-brand-200"
          >
            Export packet
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-semibold">System verified</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-100">{report.verifiedChecks}</p>
        </div>
        <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-semibold">Operator review</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-100">{reviewCount}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <div className="flex items-center gap-2 text-stone-300">
            <Target className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-semibold">Needs action</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-stone-100">{needsActionCount}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-stone-800 bg-stone-900/70">
          <div className="border-b border-stone-800 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-100">Launch blocker checklist</h2>
            <p className="mt-1 text-sm text-stone-500">
              Operator review is intentionally not counted as verified.
            </p>
          </div>
          <div className="px-5">
            {report.checks.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <h2 className="text-base font-semibold text-stone-100">Next evidence actions</h2>
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
            <h2 className="text-base font-semibold text-stone-100">Evidence log</h2>
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

          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <h2 className="text-base font-semibold text-stone-100">Pilot candidates</h2>
            <div className="mt-4 space-y-3">
              {report.pilotCandidates.slice(0, 5).map((chef) => (
                <div
                  key={chef.chefId}
                  className="rounded-lg border border-stone-800 bg-stone-950 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-100">{chef.chefName}</p>
                      <p className="text-xs text-stone-500">
                        {chef.completedSystemSteps}/{chef.totalSystemSteps} system checks,{' '}
                        {chef.activeSpanDays} days
                      </p>
                    </div>
                    {chef.publicBookingHref ? (
                      <Link href={chef.publicBookingHref} className="text-xs text-brand-400">
                        Booking
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-400">
                    <span>{chef.evidence.inquiries} inquiries</span>
                    <span>{chef.evidence.events} events</span>
                    <span>{chef.evidence.feedbackSignals} feedback</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-stone-500">
                    <span>{chef.evidence.publicBookingTests} public tests</span>
                    <span>{chef.evidence.invoiceArtifacts} invoices</span>
                    <span>{chef.evidence.onboardingCompleted ? 'Onboarded' : 'Setup open'}</span>
                  </div>
                  {chef.nextStepLabel ? (
                    <p className="mt-2 text-xs text-stone-500">Next: {chef.nextStepLabel}</p>
                  ) : null}
                </div>
              ))}
              {report.pilotCandidates.length === 0 ? (
                <p className="text-sm text-stone-500">No chefs found.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
