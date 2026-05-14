import {
  publishWebResearchCandidateAction,
  rejectWebResearchCandidateAction,
  reviewWebResearchCandidateAction,
  runMockDirectoryCandidateDiscoveryAction,
} from '@/lib/web-research/admin-actions'
import { getWebResearchAdminDashboard } from '@/lib/web-research/admin-data'

export const metadata = {
  title: 'Web Research | Admin',
}

export default async function AdminWebResearchPage() {
  const dashboard = await getWebResearchAdminDashboard()

  const pendingCandidates = dashboard.candidates.filter(
    (candidate) => candidate.status === 'needs_review' || candidate.status === 'candidate'
  )
  const reviewedCandidates = dashboard.candidates.filter(
    (candidate) => candidate.status === 'reviewed'
  )
  const publishedCandidates = dashboard.candidates.filter(
    (candidate) => candidate.status === 'published'
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Trusted Web Research</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-500">
          Run source-backed public research, review external restaurant and chef candidates, and
          publish only approved records into the existing directory workflow.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Providers" value={dashboard.providers.length} />
        <Stat label="Jobs" value={dashboard.jobs.length} />
        <Stat label="Pending review" value={pendingCandidates.length} tone="amber" />
        <Stat label="Ready to publish" value={reviewedCandidates.length} tone="blue" />
        <Stat label="Published" value={publishedCandidates.length} tone="green" />
      </div>

      <section className="mb-8 rounded-xl border border-stone-700 bg-stone-900 p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-stone-100">Provider diagnostics</h2>
          <p className="text-sm text-stone-500">
            Credentials are reported without exposing secrets. Live Google calls still depend on
            active Cloud billing.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 font-medium">Enabled</th>
                <th className="pb-2 font-medium">Credentials</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.providers.map((provider) => (
                <tr key={provider.provider} className="border-t border-stone-800">
                  <td className="py-3 pr-4 font-medium text-stone-200">{provider.provider}</td>
                  <td className="py-3 pr-4 text-stone-400">{provider.enabled ? 'Yes' : 'No'}</td>
                  <td className="py-3 pr-4 text-stone-400">{provider.credentialStatus}</td>
                  <td className="py-3 text-stone-400">{provider.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">Create review candidate</h2>
        <form
          action={runMockDirectoryCandidateDiscoveryAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Search
            </span>
            <input
              name="query"
              defaultValue="Blue Door Bistro Boston"
              suppressHydrationWarning
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">City</span>
            <input
              name="city"
              defaultValue="Boston"
              suppressHydrationWarning
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              State
            </span>
            <input
              name="state"
              defaultValue="MA"
              suppressHydrationWarning
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </label>
          <div className="md:col-span-4">
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
              Run mock candidate discovery
            </button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-stone-700 bg-stone-900 p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-stone-100">Candidate review queue</h2>
          <p className="text-sm text-stone-500">
            Unreviewed candidates stay out of public browse. Publishing uses the existing external
            directory listing action.
          </p>
        </div>
        {dashboard.candidates.length === 0 ? (
          <p className="text-sm text-stone-500">No web research candidates yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="pb-2 font-medium">Candidate</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Evidence</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-stone-800 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-stone-200">{candidate.name}</p>
                      <p className="text-xs-tight text-stone-500">
                        {[candidate.city, candidate.state].filter(Boolean).join(', ') ||
                          'Location unknown'}
                      </p>
                      {candidate.websiteUrl && (
                        <a
                          href={candidate.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-400 hover:text-brand-300"
                        >
                          source site
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={candidate.status} />
                      {candidate.duplicateOf && (
                        <p className="mt-1 text-xs-tight text-amber-300">Duplicate match</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-stone-400">
                      {candidate.sourceEvidenceIds.length} source
                      {candidate.sourceEvidenceIds.length === 1 ? '' : 's'}
                      <p className="text-xs-tight text-stone-500">
                        Freshness: {candidate.freshness}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-stone-400">
                      {Math.round(candidate.confidence * 100)}%
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {(candidate.status === 'needs_review' ||
                          candidate.status === 'candidate') && (
                          <form action={reviewWebResearchCandidateAction}>
                            <input type="hidden" name="candidateId" value={candidate.id} />
                            <button className="rounded bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-900/80">
                              Review
                            </button>
                          </form>
                        )}
                        {candidate.status === 'reviewed' && (
                          <form action={publishWebResearchCandidateAction}>
                            <input type="hidden" name="candidateId" value={candidate.id} />
                            <button className="rounded bg-brand-900/60 px-2 py-1 text-xs font-medium text-brand-300 hover:bg-brand-900">
                              Publish
                            </button>
                          </form>
                        )}
                        {candidate.status !== 'published' && candidate.status !== 'rejected' && (
                          <form action={rejectWebResearchCandidateAction}>
                            <input type="hidden" name="candidateId" value={candidate.id} />
                            <input type="hidden" name="reason" value="Rejected by admin review." />
                            <button className="rounded bg-red-900/30 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-900/60">
                              Reject
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">Recent audit</h2>
        {dashboard.auditEvents.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No web research audit events yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dashboard.auditEvents.map((event) => (
              <div key={event.id} className="rounded-lg bg-stone-950 px-3 py-2">
                <p className="text-sm text-stone-300">{event.message}</p>
                <p className="text-xs-tight text-stone-600">
                  {event.type} - {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = 'stone',
}: {
  label: string
  value: string | number
  tone?: 'stone' | 'amber' | 'blue' | 'green'
}) {
  const color = {
    stone: 'text-stone-100',
    amber: 'text-amber-300',
    blue: 'text-sky-300',
    green: 'text-emerald-300',
  }[tone]

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    candidate: 'bg-stone-800 text-stone-300',
    needs_review: 'bg-amber-900/60 text-amber-300',
    reviewed: 'bg-sky-900/60 text-sky-300',
    published: 'bg-emerald-900/60 text-emerald-300',
    rejected: 'bg-red-900/50 text-red-300',
    merged: 'bg-purple-900/50 text-purple-300',
    stale: 'bg-stone-800 text-stone-400',
    blocked_by_policy: 'bg-red-900/50 text-red-300',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? colors.candidate}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
