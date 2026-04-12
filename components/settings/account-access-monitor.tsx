'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  markAccessEventAsSafe,
  secureAccountFromAccessEvent,
  signOutAllSessions,
} from '@/lib/auth/access-actions'
import type { AccountAccessOverview } from '@/lib/auth/account-access'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  History,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  ShieldAlert,
  Smartphone,
} from '@/components/ui/icons'

const SIGNAL_LABELS: Record<string, string> = {
  new_device: 'New device',
  new_location: 'New location',
  impossible_travel: 'Impossible travel',
  session_burst: 'Abnormal session burst',
}

const SECURITY_ACTION_LABELS: Record<string, string> = {
  sign_out_all_sessions: 'Signed out all sessions',
  access_event_secured: 'Secured account after flagged sign-in',
  password_changed: 'Password changed',
  email_change_requested: 'Email change requested',
  email_changed: 'Email changed',
}

type Props = {
  overview: AccountAccessOverview
}

export function AccountAccessMonitor({ overview }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null)

  function handleSignOutAllSessions() {
    setActiveActionKey('sign_out_all_sessions')
    startTransition(async () => {
      try {
        const result = await signOutAllSessions()
        toast.success('All active sessions were revoked.')
        window.location.assign(result.redirectTo)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign out all sessions.'
        toast.error(message)
      } finally {
        setActiveActionKey(null)
      }
    })
  }

  function handleMarkSafe(accessEventId: string) {
    setActiveActionKey(`mark_safe:${accessEventId}`)
    startTransition(async () => {
      try {
        await markAccessEventAsSafe(accessEventId)
        toast.success('Marked as expected. Future alerts stay focused on unresolved access.')
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update this sign-in.'
        toast.error(message)
      } finally {
        setActiveActionKey(null)
      }
    })
  }

  function handleSecureAccount(accessEventId: string) {
    setActiveActionKey(`secure:${accessEventId}`)
    startTransition(async () => {
      try {
        const result = await secureAccountFromAccessEvent(accessEventId)
        toast.success('Account secured. All sessions are being signed out.')
        window.location.assign(result.redirectTo)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to secure the account.'
        toast.error(message)
      } finally {
        setActiveActionKey(null)
      }
    })
  }

  const hasResolvedRecentAlerts =
    overview.flaggedLast30Days > 0 && overview.pendingReviewCount === 0

  const statusVariant =
    overview.overallRisk === 'critical'
      ? 'error'
      : overview.overallRisk === 'review'
        ? 'warning'
        : 'info'

  const statusBadgeVariant =
    overview.overallRisk === 'critical'
      ? 'error'
      : overview.overallRisk === 'review'
        ? 'warning'
        : 'success'

  return (
    <Card id="access-visibility">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand-400" />
              Access Visibility
            </CardTitle>
            <CardDescription>
              We only alert you when a sign-in breaks your normal pattern, so the signal stays
              useful.
            </CardDescription>
          </div>
          <Badge variant={statusBadgeVariant}>
            {overview.overallRisk === 'critical'
              ? 'Needs immediate review'
              : overview.overallRisk === 'review'
                ? `${overview.pendingReviewCount} sign-in${overview.pendingReviewCount === 1 ? '' : 's'} need${overview.pendingReviewCount === 1 ? 's' : ''} review`
                : hasResolvedRecentAlerts
                  ? 'Recent alerts resolved'
                  : 'Access looks normal'}
          </Badge>
        </div>

        <Alert
          variant={statusVariant}
          title={
            overview.overallRisk === 'critical'
              ? 'A recent sign-in looks suspicious.'
              : overview.overallRisk === 'review'
                ? 'A recent sign-in was flagged for review.'
                : hasResolvedRecentAlerts
                  ? 'Recent flagged sign-ins have already been reviewed.'
                  : 'Recent access matches your usual pattern.'
          }
        >
          <div className="space-y-2">
            <p>
              Current context: <strong>{overview.currentDeviceLabel}</strong> from{' '}
              <strong>{overview.currentLocationLabel}</strong>.
            </p>
            <p className="text-xs opacity-90">
              {overview.pendingReviewCount > 0
                ? 'Review flagged sign-ins below. Mark expected access as safe, or secure the account to revoke every session immediately.'
                : 'If anything below still looks unfamiliar, sign out all sessions. That ends access on every device, including this one.'}
            </p>
          </div>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Known devices"
            value={String(overview.knownDevices)}
            detail="Distinct browser and OS patterns we recognize for this account."
          />
          <StatCard
            label="Known locations"
            value={String(overview.knownLocations)}
            detail="Cities or regions seen across recent sign-ins."
          />
          <StatCard
            label="Flagged in 30 days"
            value={String(overview.flaggedLast30Days)}
            detail="Only sign-ins that deviated from baseline and triggered review logic."
          />
        </div>

        <div className="rounded-xl border border-stone-700/60 bg-stone-900/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-stone-100">Current session baseline</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
                <span className="inline-flex items-center gap-2">
                  <Monitor size={14} className="text-brand-400" />
                  {overview.currentDeviceLabel}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin size={14} className="text-brand-400" />
                  {overview.currentLocationLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <History size={14} />
              {overview.lastSecuredAt
                ? `Last secured ${formatTimestamp(overview.lastSecuredAt)}`
                : 'No manual session reset yet'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-stone-100">Recent access</h3>
            <p className="text-xs text-stone-400">
              We keep the view focused on sign-ins and only attach risk signals when behavior
              changes.
            </p>
          </div>

          {overview.events.length > 0 ? (
            <div className="space-y-3">
              {overview.events.map((event) => (
                <div
                  key={event.id}
                  id={`access-event-${event.id}`}
                  className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="rounded-full border border-stone-700/80 bg-stone-800/90 p-2 text-stone-300">
                        {event.device.deviceType === 'mobile' ||
                        event.device.deviceType === 'tablet' ? (
                          <Smartphone size={16} />
                        ) : (
                          <Monitor size={16} />
                        )}
                      </span>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-100">{event.device.label}</p>
                          {event.current && <Badge variant="info">Current device</Badge>}
                          <Badge
                            variant={
                              event.riskLevel === 'critical'
                                ? 'error'
                                : event.riskLevel === 'review'
                                  ? 'warning'
                                  : 'success'
                            }
                          >
                            {event.riskLevel === 'critical'
                              ? 'Suspicious'
                              : event.riskLevel === 'review'
                                ? 'Review'
                                : 'Expected'}
                          </Badge>
                        </div>

                        <p className="text-xs text-stone-400">
                          {formatProvider(event.authProvider)} / {event.locationLabel} /{' '}
                          {event.ipMasked}
                        </p>

                        <div className="space-y-2">
                          {event.riskSignals.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {event.riskSignals.map((signal) => (
                                <Badge key={signal} variant="warning" className="text-[11px]">
                                  {SIGNAL_LABELS[signal] ?? signal}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-xs text-stone-500">{event.signalSummary}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-400">{formatTimestamp(event.occurredAt)}</p>
                  </div>

                  {event.review ? (
                    <div className="mt-4 border-t border-stone-700/60 pt-3">
                      {event.review.status === 'pending' ? (
                        <div className="space-y-3">
                          <p className="text-xs text-stone-400">
                            Review this sign-in now. If it was yours, mark it safe. If not, secure
                            the account to revoke every active session immediately.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              variant="secondary"
                              onClick={() => handleMarkSafe(event.id)}
                              disabled={isPending}
                              loading={isPending && activeActionKey === `mark_safe:${event.id}`}
                            >
                              This was me
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleSecureAccount(event.id)}
                              disabled={isPending}
                              loading={isPending && activeActionKey === `secure:${event.id}`}
                            >
                              Secure account
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                          <Badge variant="success">
                            {event.review.status === 'confirmed_safe'
                              ? 'Marked safe'
                              : 'Account secured'}
                          </Badge>
                          <span>
                            {event.review.status === 'confirmed_safe'
                              ? 'Confirmed as expected'
                              : 'Sessions revoked from this review'}{' '}
                            {event.review.resolvedAt
                              ? formatTimestamp(event.review.resolvedAt)
                              : 'just now'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-700/70 bg-stone-900/40 px-4 py-5 text-sm text-stone-400">
              No recent sign-ins have been recorded for this account yet.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-stone-100">Recent security actions</h3>
            <p className="text-xs text-stone-400">
              Password changes, email updates, and account containment actions appear here.
            </p>
          </div>

          {overview.securityActions.length > 0 ? (
            <div className="space-y-3">
              {overview.securityActions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-xl border border-stone-700/60 bg-stone-900/50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="rounded-full border border-stone-700/80 bg-stone-800/90 p-2 text-stone-300">
                        {action.type.includes('email') ? (
                          <Mail size={16} />
                        ) : action.type.includes('password') ? (
                          <Lock size={16} />
                        ) : (
                          <ShieldAlert size={16} />
                        )}
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-100">
                            {SECURITY_ACTION_LABELS[action.type] ?? action.type}
                          </p>
                          <Badge variant="info">Security action</Badge>
                        </div>
                        <p className="text-xs text-stone-400">{action.reason}</p>
                      </div>
                    </div>

                    <p className="text-xs text-stone-400">{formatTimestamp(action.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-700/70 bg-stone-900/40 px-4 py-5 text-sm text-stone-400">
              No recent security actions have been recorded yet.
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-stone-400">
          Use this only when something looks wrong. It signs out every active session immediately.
        </p>
        <Button
          variant="danger"
          onClick={handleSignOutAllSessions}
          disabled={isPending}
          loading={isPending && activeActionKey === 'sign_out_all_sessions'}
        >
          <LogOut size={16} />
          Sign out all sessions
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-50">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{detail}</p>
    </div>
  )
}

function formatProvider(provider: string | null): string {
  if (!provider) return 'Session'
  if (provider === 'credentials') return 'Email and password'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}
