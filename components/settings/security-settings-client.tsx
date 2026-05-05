'use client'

import { useState, useTransition } from 'react'
import { revokeAllSessionsAction } from '@/lib/security/security-settings-actions'

type ActiveSession = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  lastSeenAt: string
  isCurrent: boolean
}

type LoginEvent = {
  id: string
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

function parseUserAgentShort(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return 'Browser'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SecuritySettingsClient({
  activeSessions,
  recentLogins,
}: {
  activeSessions: ActiveSession[]
  recentLogins: LoginEvent[]
}) {
  const [isPending, startTransition] = useTransition()
  const [revokeResult, setRevokeResult] = useState<string | null>(null)

  function handleRevokeAll() {
    setRevokeResult(null)
    startTransition(async () => {
      try {
        const result = await revokeAllSessionsAction()
        if (result.success) {
          setRevokeResult('All other sessions have been signed out.')
        } else {
          setRevokeResult(result.error || 'Failed to revoke sessions.')
        }
      } catch {
        setRevokeResult('Something went wrong.')
      }
    })
  }

  return (
    <>
      {/* Active Sessions */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Active Sessions</h2>
            <p className="mt-1 text-sm text-stone-400">
              Devices that have recently signed in to your account.
            </p>
          </div>
          <button
            onClick={handleRevokeAll}
            disabled={isPending}
            className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-900/50 disabled:opacity-50"
          >
            {isPending ? 'Signing out...' : 'Sign out all'}
          </button>
        </div>

        {revokeResult && <p className="mt-3 text-sm text-amber-400">{revokeResult}</p>}

        <div className="mt-4 divide-y divide-stone-800">
          {activeSessions.length === 0 ? (
            <p className="py-3 text-sm text-stone-500">No recent sessions found.</p>
          ) : (
            activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {parseUserAgentShort(session.userAgent)}
                    </span>
                    {session.isCurrent && (
                      <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-xs font-medium text-green-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    {session.ipAddress ?? 'Unknown IP'} · {formatDate(session.lastSeenAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Login Activity */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Recent Login Activity</h2>
        <p className="mt-1 text-sm text-stone-400">Your last 10 login events.</p>

        <div className="mt-4 divide-y divide-stone-800">
          {recentLogins.length === 0 ? (
            <p className="py-3 text-sm text-stone-500">No recent login activity.</p>
          ) : (
            recentLogins.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        event.eventType === 'login_success'
                          ? 'bg-green-500'
                          : event.eventType === 'login_failed'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-sm text-stone-200">
                      {event.eventType === 'login_success'
                        ? 'Successful login'
                        : event.eventType === 'login_failed'
                          ? 'Failed login attempt'
                          : event.eventType === 'session_revoked'
                            ? 'Sessions revoked'
                            : event.eventType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {event.ipAddress ?? 'Unknown IP'} · {formatDate(event.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
