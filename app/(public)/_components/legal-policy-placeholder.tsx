import Link from 'next/link'

type LegalPolicyPlaceholderProps = {
  title: string
  policyType: string
  audience: string
  summary: string
}

export function LegalPolicyPlaceholder({
  title,
  policyType,
  audience,
  summary,
}: LegalPolicyPlaceholderProps) {
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-16 text-stone-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-orange-300">
            Draft legal policy
          </p>
          <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-stone-400">
            Policy type: {policyType}. Audience: {audience}.
          </p>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-950/30 p-4 text-sm text-orange-100">
          This page is a placeholder for operational readiness. It has not been attorney-reviewed,
          does not mark ChefFlow legally approved, and should not be treated as final policy text.
        </div>

        <section className="space-y-3 text-stone-300">
          <h2 className="text-lg font-semibold text-stone-100">Current Draft Scope</h2>
          <p>{summary}</p>
          <p>
            The durable policy-version ledger tracks this page as draft or needs review until a
            reviewed version is recorded by an authorized administrator.
          </p>
        </section>

        <section className="space-y-3 text-stone-300">
          <h2 className="text-lg font-semibold text-stone-100">Related Requests</h2>
          <p>
            Privacy, deletion, export, opt-out, and takedown requests can be started through the
            public request surfaces while formal workflow records are reviewed by the platform team.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/data-request" className="text-orange-300 hover:underline">
              Data request
            </Link>
            <Link href="/privacy" className="text-orange-300 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="text-orange-300 hover:underline">
              Terms
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
