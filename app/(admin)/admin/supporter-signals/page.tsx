import Link from 'next/link'
import type { Metadata } from 'next'
import { getSupporterSignalsReport } from '@/lib/supporter-signals/report'
import type {
  SupporterSignalCandidate,
  SupporterSignalStatus,
} from '@/lib/supporter-signals/report'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Star,
  Users,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Supporter Signals - Admin' }

const statusStyles: Record<SupporterSignalStatus, string> = {
  public_ready: 'border-emerald-900 bg-emerald-950/40 text-emerald-200',
  approved_quote: 'border-brand-900 bg-brand-950/40 text-brand-200',
  permission_candidate: 'border-amber-900 bg-amber-950/40 text-amber-200',
  private_candidate: 'border-stone-700 bg-stone-900 text-stone-300',
}

const statusLabels: Record<SupporterSignalStatus, string> = {
  public_ready: 'Public ready',
  approved_quote: 'Approved quote',
  permission_candidate: 'Needs permission',
  private_candidate: 'Private candidate',
}

const actionStyles = {
  high: 'border-rose-900 bg-rose-950/30 text-rose-200',
  medium: 'border-amber-900 bg-amber-950/30 text-amber-200',
  low: 'border-stone-700 bg-stone-950 text-stone-300',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function CandidateRow({ candidate }: { candidate: SupporterSignalCandidate }) {
  return (
    <tr className="border-b border-stone-800 last:border-b-0">
      <td className="px-4 py-4 align-top">
        <div>
          <p className="text-sm font-medium text-stone-100">{candidate.name}</p>
          <p className="mt-1 text-xs capitalize text-stone-500">
            {candidate.source.replace('_', ' ')} - {candidate.relationship}
          </p>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
            statusStyles[candidate.status]
          }`}
        >
          {statusLabels[candidate.status]}
        </span>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="max-w-xl text-sm leading-5 text-stone-300">{candidate.evidence}</p>
        <p className="mt-2 text-xs text-stone-500">Public use: {candidate.publicUse}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="max-w-sm text-xs leading-5 text-stone-500">{candidate.nextStep}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-stone-500">
        {formatDate(candidate.createdAt)}
      </td>
    </tr>
  )
}

export default async function AdminSupporterSignalsPage() {
  const report = await getSupporterSignalsReport()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            Evidence-backed credibility
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Supporter Signals</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            Read-only proof inventory for ChefFlow credibility. Public claims are limited to
            featured testimonials and showcase-visible partners; every other record stays a
            permission candidate until consent is explicit.
          </p>
          <p className="mt-1 text-xs text-stone-500">Generated {report.generatedAt}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 text-right">
          <p className="text-xs font-semibold uppercase text-stone-500">Public ready</p>
          <p className="mt-1 text-3xl font-bold text-stone-100">{report.publicReadySignals}</p>
          <p className="text-xs text-stone-500">signals approved for review</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {report.metrics.map((metric) => (
          <section
            key={metric.label}
            className="rounded-xl border border-stone-800 bg-stone-900 p-4"
          >
            <p className="text-xs font-semibold uppercase text-stone-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-stone-100">{metric.value}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">{metric.detail}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              {report.publicReadySignals > 0 ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              )}
              <h2 className="text-base font-semibold text-stone-100">Homepage readiness</h2>
            </div>
            <p className="mt-2 text-sm font-medium text-stone-200">
              {report.homepageReadiness.headline}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-500">
              {report.homepageReadiness.detail}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3">
                <p className="text-xs font-semibold uppercase text-emerald-300">
                  Safe public claim
                </p>
                <p className="mt-1 text-sm text-stone-200">
                  {report.homepageReadiness.safePublicClaim}
                </p>
              </div>
              <div className="rounded-lg border border-rose-900 bg-rose-950/20 p-3">
                <p className="text-xs font-semibold uppercase text-rose-300">Blocked claim</p>
                <p className="mt-1 text-sm text-stone-200">
                  {report.homepageReadiness.blockedClaim}
                </p>
              </div>
            </div>
          </div>
          <div className="grid min-w-[280px] gap-2 text-xs text-stone-400 sm:grid-cols-2">
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="font-semibold text-stone-200">Safe now</p>
              <p className="mt-1">Built with input from culinary operators.</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="font-semibold text-stone-200">Blocked until consent</p>
              <p className="mt-1">Logo walls, named supporters, and named quotes.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/70">
          <div className="border-b border-stone-800 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-100">Candidate pipeline</h2>
            <p className="mt-1 text-sm text-stone-500">
              Ranked by public readiness, then newest signal first.
            </p>
          </div>
          {report.candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-stone-800 bg-stone-950/70 text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Supporter</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Evidence</th>
                    <th className="px-4 py-3 font-semibold">Next step</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {report.candidates.map((candidate) => (
                    <CandidateRow
                      key={`${candidate.source}-${candidate.id}`}
                      candidate={candidate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <Star className="mx-auto h-8 w-8 text-stone-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-stone-300">No supporter signals yet.</p>
              <p className="mt-1 text-sm text-stone-500">
                Signals will appear after testimonials, partner records, beta activity, or positive
                feedback are captured.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center gap-2 text-stone-200">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold">Next actions</h2>
            </div>
            <div className="mt-4 space-y-3">
              {report.nextActions.map((action) => (
                <Link
                  key={`${action.priority}-${action.label}`}
                  href={action.href}
                  className={`block rounded-lg border p-3 transition-colors hover:border-brand-700 ${
                    actionStyles[action.priority]
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-stone-100">{action.label}</p>
                    <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold uppercase">
                      {action.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-400">{action.reason}</p>
                </Link>
              ))}
              {report.nextActions.length === 0 ? (
                <p className="text-sm text-stone-500">No supporter follow-up actions right now.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center gap-2 text-stone-200">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold">Public proof rules</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-400">
              <p>Use featured testimonials as quote proof.</p>
              <p>Use showcase-visible active partners as ecosystem proof.</p>
              <p>Use beta signups and positive feedback only as follow-up candidates.</p>
              <p>Never show names, logos, or quotes publicly without recorded approval.</p>
            </div>
          </section>

          <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center gap-2 text-stone-200">
              <Users className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold">Source surfaces</h2>
            </div>
            <div className="mt-4 grid gap-2">
              <Link
                className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-brand-400"
                href="/admin/referral-partners"
              >
                Referral partners
              </Link>
              <Link
                className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-brand-400"
                href="/admin/beta"
              >
                Early signups
              </Link>
              <Link
                className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-brand-400"
                href="/admin/feedback"
              >
                User feedback
              </Link>
              <Link
                className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-brand-400"
                href="/admin/launch-readiness"
              >
                Launch readiness
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
