import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import {
  getRouteIntegrityReport,
  type RouteIntegrityFinding,
} from '@/lib/interface/route-integrity'
import { AlertTriangle, CheckCircle2, ShieldCheck, TreeStructure } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Route Integrity - Admin' }

function severityClass(severity: RouteIntegrityFinding['severity']): string {
  if (severity === 'error') return 'border-red-900 bg-red-950/35 text-red-200'
  return 'border-amber-900 bg-amber-950/35 text-amber-200'
}

function findingTypeLabel(type: RouteIntegrityFinding['type']): string {
  switch (type) {
    case 'dead_internal_href':
      return 'Missing route'
    case 'non_navigable_href':
      return 'Dead href'
    case 'empty_handler':
      return 'Empty handler'
    case 'undefined_handler':
      return 'Undefined handler'
    case 'placeholder_handler':
      return 'Placeholder handler'
    default:
      return type
  }
}

function FindingRow({ finding }: { finding: RouteIntegrityFinding }) {
  return (
    <article className="rounded-lg border border-stone-800 bg-stone-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass(
                finding.severity
              )}`}
            >
              {finding.severity}
            </span>
            <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-300">
              {findingTypeLabel(finding.type)}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-stone-100">{finding.message}</h2>
          <p className="mt-1 break-all font-mono text-xs text-stone-500">
            {finding.file}:{finding.line}
          </p>
        </div>
        {finding.href ? (
          <span className="rounded-lg bg-stone-900 px-3 py-2 font-mono text-xs text-stone-300">
            {finding.href}
          </span>
        ) : null}
      </div>
    </article>
  )
}

export default async function AdminRouteIntegrityPage() {
  await requireAdmin()
  const report = getRouteIntegrityReport()
  const hasErrors = report.errorCount > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <TreeStructure className="h-4 w-4" aria-hidden="true" />
            Interface integrity
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Route Integrity</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            Static scan for missing internal routes, inert hrefs, and placeholder UI handlers across
            app and component source files.
          </p>
          <p className="mt-1 text-xs text-stone-500">Generated {report.generatedAt}</p>
        </div>
        <Link
          href="/admin/system"
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-stone-700 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200"
        >
          Back to system health
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Mounted routes</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{report.appRouteCount}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Source files</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{report.sourceFileCount}</p>
        </div>
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-4">
          <p className="text-xs font-semibold uppercase text-red-300">Errors</p>
          <p className="mt-2 text-3xl font-bold text-red-100">{report.errorCount}</p>
        </div>
        <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-4">
          <p className="text-xs font-semibold uppercase text-amber-300">Warnings</p>
          <p className="mt-2 text-3xl font-bold text-amber-100">{report.warningCount}</p>
        </div>
      </section>

      <section
        className={`rounded-xl border p-5 ${
          hasErrors ? 'border-red-900 bg-red-950/25' : 'border-emerald-900 bg-emerald-950/25'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-red-300" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-100">
              {hasErrors ? 'Broken workflow links detected' : 'No broken workflow links detected'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              This scanner is intentionally conservative. Dynamic links that cannot be inferred are
              not treated as failures unless their static route pattern is clear.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-100">Findings</h2>
            <p className="mt-1 text-sm text-stone-500">
              Showing the first {report.findings.length} of {report.findingCount} findings.
            </p>
          </div>
          <p className="text-xs text-stone-500">Scan roots: app, components</p>
        </div>
        <div className="mt-4 grid gap-3">
          {report.findings.map((finding) => (
            <FindingRow
              key={`${finding.type}:${finding.file}:${finding.line}:${finding.href ?? ''}`}
              finding={finding}
            />
          ))}
          {report.findings.length === 0 ? (
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-8 text-center">
              <ShieldCheck className="mx-auto h-7 w-7 text-emerald-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-stone-200">No route gaps found</p>
              <p className="mt-1 text-sm text-stone-500">
                Static app and component links currently resolve to mounted routes.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
