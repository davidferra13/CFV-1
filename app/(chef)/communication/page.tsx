import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getDraftMessages } from '@/lib/communication/scheduled-message-actions'
import { getScheduledMessages } from '@/lib/communication/scheduled-message-actions'

export const metadata: Metadata = { title: 'Communication Hub' }

export default async function CommunicationPage() {
  await requireChef()

  const [draftsResult, sentResult] = await Promise.all([
    getDraftMessages(),
    getScheduledMessages({ status: 'sent' }),
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
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-stone-100">Communication</h1>
        <p className="mb-8 text-sm text-stone-400">
          Manage drafts, review sent messages, and track communication activity.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pending Drafts */}
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
