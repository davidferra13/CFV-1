import Link from 'next/link'

const organizedSteps = [
  {
    label: 'Client list',
    href: '/import?mode=clients',
    detail: 'Names, emails, phone numbers, notes, referral source.',
  },
  {
    label: 'Past events',
    href: '/import?mode=past-events',
    detail: 'Dates, occasions, guest counts, addresses, client links.',
  },
  {
    label: 'Payments and expenses',
    href: '/import?mode=past-payments',
    detail: 'Ledger payments, deposits, invoices, receipts, vendor spend.',
  },
  {
    label: 'Documents and PDFs',
    href: '/import?mode=file-upload',
    detail: 'Contracts, menus, platform exports, statements, receipts.',
  },
]

export function BusinessHistorySourceChooser() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-400">First-run setup</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-100">Business History Import</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
          Bring years of chef business history into review. Use organized import for clean files and
          platform exports, or recovery import when important business details are buried in Gmail.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Organized Import</h2>
              <p className="mt-1 text-sm text-stone-400">
                Best for spreadsheets, PDFs, platform exports, client lists, invoices, and past
                event files you already trust.
              </p>
            </div>
            <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-emerald-400">
              No Gmail needed
            </span>
          </div>
          <ol className="mt-4 space-y-2">
            {organizedSteps.map((step, index) => (
              <li key={step.href} className="rounded-md border border-stone-800 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs text-stone-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={step.href}
                      className="text-sm font-medium text-stone-100 hover:text-brand-300"
                    >
                      {step.label}
                    </Link>
                    <p className="mt-0.5 text-xs leading-5 text-stone-500">{step.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Recovery Import</h2>
              <p className="mt-1 text-sm text-stone-400">
                Best when leads, menus, preferences, payments, and event details live across old
                email threads.
              </p>
            </div>
            <span className="rounded-full bg-amber-950 px-2.5 py-1 text-xs text-amber-400">
              Consent first
            </span>
          </div>
          <div className="mt-4 rounded-md border border-stone-800 p-3 text-sm leading-6 text-stone-400">
            ChefFlow checks connected Gmail read-only for catering-related messages, discards
            unrelated messages, and stages business details here. Nothing is permanently saved to
            clients, events, or finance until the chef reviews it.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/settings/connections"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Manage Gmail recovery
            </Link>
            <Link
              href="#review"
              className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800"
            >
              Review staged records
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
