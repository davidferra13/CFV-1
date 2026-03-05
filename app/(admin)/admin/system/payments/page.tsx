import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { getPaymentHealthStats } from '@/lib/admin/platform-stats'

function formatDateTime(value: string | null): string {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default async function AdminPaymentsHealthPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const health = await getPaymentHealthStats(24)
  const hasBlockers = health.blockers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Admin System</p>
          <h1 className="text-xl font-bold text-slate-900">Payments Health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stripe webhook, key mode, and payout onboarding status (last {health.timeframeHours}h)
          </p>
        </div>
        <Link
          href="/admin/system"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Back to System
        </Link>
      </div>

      <div
        className={`rounded-xl border p-4 ${hasBlockers ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {hasBlockers ? (
            <>
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-red-700">Action required</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-green-700">Payments health is clear</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <p className="text-xs text-slate-500">Stripe webhooks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{health.webhookEventCount}</p>
          <p className="mt-1 text-xs text-slate-500">last {health.timeframeHours}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <p className="text-xs text-slate-500">Webhook failures</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {health.webhookStatusCounts.failed}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            processed: {health.webhookStatusCounts.processed}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <p className="text-xs text-slate-500">Ledger Stripe entries</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{health.stripeLedgerEntries24h}</p>
          <p className="mt-1 text-xs text-slate-500">transaction_reference=evt_*</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <p className="text-xs text-slate-500">Stripe key mode</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            secret: {health.stripeSecretKeyMode}
          </p>
          <p className="text-xs text-slate-500">publishable: {health.stripePublishableKeyMode}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Blockers</h2>
          {health.blockers.length === 0 ? (
            <p className="mt-3 text-sm text-green-700">None</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-red-700">
              {health.blockers.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Warnings</h2>
          {health.warnings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">None</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-amber-700">
              {health.warnings.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Recent webhook timestamps</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between gap-3">
              <dt>Last received</dt>
              <dd>{formatDateTime(health.lastWebhookReceivedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Last processed</dt>
              <dd>{formatDateTime(health.lastWebhookProcessedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Last failed</dt>
              <dd>{formatDateTime(health.lastWebhookFailedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Platform chef Connect</h2>
          {!health.platformChefConnect ? (
            <p className="mt-3 text-sm text-slate-500">Not configured</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-3">
                <dt>Chef</dt>
                <dd>{health.platformChefConnect.businessName ?? health.platformChefConnect.id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Stripe account connected</dt>
                <dd>{health.platformChefConnect.hasStripeAccount ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Onboarding complete</dt>
                <dd>{health.platformChefConnect.onboardingComplete ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      {health.recentWebhookFailures.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-stone-900 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Recent webhook failures</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Provider ID</th>
                  <th className="pb-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {health.recentWebhookFailures.map((row) => (
                  <tr key={`${row.receivedAt}-${row.providerEventId ?? row.eventType}`}>
                    <td className="py-2 pr-4 text-slate-600">{formatDateTime(row.receivedAt)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">{row.eventType}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                      {row.providerEventId ?? 'N/A'}
                    </td>
                    <td className="py-2 text-slate-600">{row.errorText ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
