import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getCommunicationControlPlane,
  markSmsConsentSource,
  pauseClientSmsChannel,
  retrySmsVerification,
} from '@/lib/communication/control-plane'
import { getDraftMessages } from '@/lib/communication/scheduled-message-actions'
import { getScheduledMessages } from '@/lib/communication/scheduled-message-actions'

export const metadata: Metadata = { title: 'Communication Hub' }

function statusClass(status: string) {
  switch (status) {
    case 'allowed':
    case 'pending':
      return 'border-amber-700/40 bg-amber-950/30 text-amber-200'
    case 'blocked':
    case 'delayed':
      return 'border-red-700/40 bg-red-950/30 text-red-200'
    case 'failed':
      return 'border-rose-700/40 bg-rose-950/30 text-rose-200'
    case 'actionable':
      return 'border-sky-700/40 bg-sky-950/30 text-sky-200'
    case 'healthy':
      return 'border-emerald-700/40 bg-emerald-950/30 text-emerald-200'
    case 'attention':
      return 'border-orange-700/40 bg-orange-950/30 text-orange-200'
    default:
      return 'border-stone-700 bg-stone-800 text-stone-200'
  }
}

export default async function CommunicationPage() {
  await requireChef()

  const [draftsResult, sentResult, controlPlane] = await Promise.all([
    getDraftMessages(),
    getScheduledMessages({ status: 'sent' }),
    getCommunicationControlPlane(),
  ])

  const pendingDrafts = draftsResult.data ?? []
  const sentMessages = (sentResult.data ?? [])
    .filter((m) => {
      if (!m.sent_at) return false
      const sentDate = new Date(m.sent_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
      return sentDate >= sevenDaysAgo
    })
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-stone-900 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-1 text-2xl font-semibold text-stone-100">Communication</h1>
        <p className="mb-8 text-sm text-stone-400">
          Manage drafts, review sent messages, and track communication activity.
        </p>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-amber-700/40 bg-stone-800/50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-stone-100">
              {controlPlane.counts.pending}
            </p>
          </div>
          <div className="rounded-lg border border-red-700/40 bg-stone-800/50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Policy Holds</p>
            <p className="mt-2 text-2xl font-semibold text-stone-100">
              {controlPlane.counts.blocked}
            </p>
          </div>
          <div className="rounded-lg border border-rose-700/40 bg-stone-800/50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-stone-100">
              {controlPlane.counts.failed}
            </p>
          </div>
          <div className="rounded-lg border border-sky-700/40 bg-stone-800/50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Actionable</p>
            <p className="mt-2 text-2xl font-semibold text-stone-100">
              {controlPlane.counts.actionable}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/communication/drafts"
            className="group rounded-lg border border-stone-700 bg-stone-800/50 p-5 transition hover:border-amber-600/50 hover:bg-stone-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-300 group-hover:text-stone-100">
                Pending Drafts
              </h2>
              {pendingDrafts.length > 0 && (
                <span className="rounded-full bg-amber-600/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  {pendingDrafts.length}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {pendingDrafts.length === 0
                ? 'No drafts awaiting review'
                : `${pendingDrafts.length} message${pendingDrafts.length === 1 ? '' : 's'} to review`}
            </p>
          </Link>

          <Link
            href="/communication/remy-approvals"
            className="group rounded-lg border border-stone-700 bg-stone-800/50 p-5 transition hover:border-sky-600/50 hover:bg-stone-800"
          >
            <h2 className="mb-2 text-sm font-medium text-stone-300 group-hover:text-stone-100">
              Remy Approvals
            </h2>
            <p className="text-xs text-stone-500">
              Edit, approve, deny, or request revisions for Remy communication drafts
            </p>
          </Link>

          <Link
            href="/communication/vendor-actions"
            className="group rounded-lg border border-stone-700 bg-stone-800/50 p-5 transition hover:border-emerald-600/50 hover:bg-stone-800"
          >
            <h2 className="mb-2 text-sm font-medium text-stone-300 group-hover:text-stone-100">
              Vendor Call Actions
            </h2>
            <p className="text-xs text-stone-500">
              Extract, approve, merge, and prove post-call vendor follow-up tasks
            </p>
          </Link>

          {/* Recent Sent */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-5">
            <h2 className="mb-2 text-sm font-medium text-stone-300">Sent (Last 7 Days)</h2>
            <p className="text-xs text-stone-500">
              {sentMessages.length === 0
                ? 'No messages sent recently'
                : `${sentMessages.length} message${sentMessages.length === 1 ? '' : 's'} delivered`}
            </p>
          </div>

          {/* Quick Links */}
          <Link
            href="/clients/communication"
            className="group rounded-lg border border-stone-700 bg-stone-800/50 p-5 transition hover:border-stone-600 hover:bg-stone-800"
          >
            <h2 className="mb-2 text-sm font-medium text-stone-300 group-hover:text-stone-100">
              Client Communication
            </h2>
            <p className="text-xs text-stone-500">Per-client message history and templates</p>
          </Link>

          <Link
            href="/settings/communication"
            className="group rounded-lg border border-stone-700 bg-stone-800/50 p-5 transition hover:border-stone-600 hover:bg-stone-800"
          >
            <h2 className="mb-2 text-sm font-medium text-stone-300 group-hover:text-stone-100">
              Settings
            </h2>
            <p className="text-xs text-stone-500">Channels, templates, and automation rules</p>
          </Link>
        </div>

        <section className="mt-8">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-medium text-stone-300">SMS Compliance Center</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/settings/communication"
                className="rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500 hover:text-stone-100"
              >
                Channel settings
              </Link>
              <Link
                href="/communication/drafts"
                className="rounded border border-amber-700/60 px-2.5 py-1.5 text-xs text-amber-200 hover:border-amber-500 hover:text-amber-100"
              >
                Retry queue
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-emerald-700/40 bg-stone-800/45 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Eligible</p>
              <p className="mt-2 text-xl font-semibold text-stone-100">
                {controlPlane.smsCompliance.eligible}
              </p>
            </div>
            <div className="rounded-lg border border-red-700/40 bg-stone-800/45 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Blocked</p>
              <p className="mt-2 text-xl font-semibold text-stone-100">
                {controlPlane.smsCompliance.blocked}
              </p>
            </div>
            <div className="rounded-lg border border-orange-700/40 bg-stone-800/45 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Paused</p>
              <p className="mt-2 text-xl font-semibold text-stone-100">
                {controlPlane.smsCompliance.paused}
              </p>
            </div>
            <div className="rounded-lg border border-amber-700/40 bg-stone-800/45 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">No Consent</p>
              <p className="mt-2 text-xl font-semibold text-stone-100">
                {controlPlane.smsCompliance.missingConsent}
              </p>
            </div>
            <div className="rounded-lg border border-rose-700/40 bg-stone-800/45 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Bad Phone</p>
              <p className="mt-2 text-xl font-semibold text-stone-100">
                {controlPlane.smsCompliance.invalidPhone}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2">
              {controlPlane.smsCompliance.clients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-5 text-sm text-stone-500">
                  No client SMS eligibility records are visible.
                </div>
              ) : (
                controlPlane.smsCompliance.clients.slice(0, 8).map((client) => (
                  <div
                    key={client.id}
                    className="rounded-lg border border-stone-700/60 bg-stone-800/35 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                              client.status
                            )}`}
                          >
                            {client.status}
                          </span>
                          <p className="truncate text-sm font-medium text-stone-100">
                            {client.name}
                          </p>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">
                          {client.reasons.join('; ')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
                          <span>Consent: {client.proof.hasConsent ? 'pass' : 'blocked'}</span>
                          <span>Source: {client.proof.consentSource ?? 'unknown'}</span>
                          <span>Phone: {client.proof.phoneValid ? 'valid' : 'blocked'}</span>
                          <span>Preferred: {client.proof.preferredChannel ?? 'not set'}</span>
                          <span>
                            Region: {client.proof.regionalEligible ? 'eligible' : 'blocked'}
                          </span>
                          <span>
                            Frequency: {client.proof.frequencyAllowed ? 'clear' : 'capped'}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={client.href}
                          className="rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500 hover:text-stone-100"
                        >
                          Open client
                        </Link>
                        <form action={markSmsConsentSource}>
                          <input type="hidden" name="clientId" value={client.id} />
                          <button
                            type="submit"
                            className="rounded border border-emerald-700/60 px-2.5 py-1.5 text-xs text-emerald-200 hover:border-emerald-500 hover:text-emerald-100"
                          >
                            Mark consent
                          </button>
                        </form>
                        <form action={pauseClientSmsChannel}>
                          <input type="hidden" name="clientId" value={client.id} />
                          <button
                            type="submit"
                            className="rounded border border-orange-700/60 px-2.5 py-1.5 text-xs text-orange-200 hover:border-orange-500 hover:text-orange-100"
                          >
                            Pause
                          </button>
                        </form>
                        <form action={retrySmsVerification}>
                          <input type="hidden" name="clientId" value={client.id} />
                          <button
                            type="submit"
                            className="rounded border border-amber-700/60 px-2.5 py-1.5 text-xs text-amber-200 hover:border-amber-500 hover:text-amber-100"
                          >
                            Retry check
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-stone-700/60 bg-stone-800/35 p-4">
                <h3 className="text-sm font-medium text-stone-300">Channel Health</h3>
                <div className="mt-3 space-y-2">
                  {controlPlane.channelHealth.map((health) => (
                    <div key={health.id} className="rounded border border-stone-700/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-stone-100">{health.label}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                            health.status
                          )}`}
                        >
                          {health.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-stone-400">{health.detail}</p>
                      <Link
                        href={health.href}
                        className="mt-3 inline-flex rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500 hover:text-stone-100"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-stone-700/60 bg-stone-800/35 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-stone-300">Policy Audit Log</h3>
                  <Link
                    href="/communication/drafts"
                    className="text-xs text-amber-300 hover:text-amber-200"
                  >
                    Export
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {controlPlane.smsAuditLog.length === 0 ? (
                    <p className="text-xs text-stone-500">No SMS policy events are visible.</p>
                  ) : (
                    controlPlane.smsAuditLog.map((audit) => (
                      <Link
                        key={audit.id}
                        href={audit.href}
                        className="block rounded border border-stone-700/50 p-3 hover:border-stone-500"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-stone-100">{audit.label}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                              audit.status
                            )}`}
                          >
                            {audit.status}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">
                          {audit.detail}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-stone-300">Approval And Recovery Queue</h2>
            <Link href="/inbox" className="text-xs text-amber-300 hover:text-amber-200">
              Open inbox
            </Link>
          </div>
          {controlPlane.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-800/30 p-6 text-sm text-stone-500">
              No pending communication approvals, failed sends, or vendor call outcomes.
            </div>
          ) : (
            <div className="space-y-2">
              {controlPlane.items.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-stone-700/60 bg-stone-800/35 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass(
                            item.status
                          )}`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                        <p className="truncate text-sm font-medium text-stone-100">{item.title}</p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">
                        {item.detail}
                      </p>
                      {item.policy && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
                          <span>Consent: {item.policy.proof.hasConsent ? 'pass' : 'blocked'}</span>
                          <span>Phone: {item.policy.proof.hasPhone ? 'present' : 'missing'}</span>
                          <span>
                            Quiet hours: {item.policy.proof.quietHoursActive ? 'active' : 'clear'}
                          </span>
                          <span>
                            Frequency: {item.policy.proof.frequencyAllowed ? 'clear' : 'capped'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.proofLinks.slice(0, 2).map((link) => (
                        <Link
                          key={`${item.id}-${link.label}`}
                          href={link.href}
                          className="rounded border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-500 hover:text-stone-100"
                        >
                          {link.label}
                        </Link>
                      ))}
                      <Link
                        href={item.href}
                        className="rounded border border-amber-700/60 px-2.5 py-1.5 text-xs text-amber-200 hover:border-amber-500 hover:text-amber-100"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {sentMessages.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-stone-300">Recent Activity</h2>
            <div className="space-y-2">
              {sentMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-800/30 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-stone-200">
                      {msg.subject ?? `${msg.channel} message`}
                    </p>
                    <p className="text-xs text-stone-500">
                      {msg.channel} &middot;{' '}
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className="ml-3 rounded bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-400">
                    Sent
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
