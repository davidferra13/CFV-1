'use client'
// Notification Settings Form
// Per-category channel toggles (email, push, SMS) + SMS phone setup.
// Mounted on /settings/notifications. Uses optimistic UI with explicit channel saves.

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { usePushSubscription } from '@/components/notifications/use-push-subscription'
import {
  upsertCategoryPreferencesBatch,
  updateNotificationExperienceSettings,
  updateSmsSettings,
} from '@/lib/notifications/settings-actions'
import type {
  CategoryPreference,
  NotificationExperienceSettings,
  SmsSettings,
} from '@/lib/notifications/settings-types'
import { TIER_CHANNEL_DEFAULTS, DEFAULT_TIER_MAP } from '@/lib/notifications/tier-config'
import {
  type NotificationCategory,
  type NotificationAction,
  CATEGORY_LABELS,
} from '@/lib/notifications/types'

// Chef-facing categories only (omit client-facing)
const CHEF_CATEGORIES: NotificationCategory[] = [
  'inquiry',
  'quote',
  'event',
  'payment',
  'chat',
  'client',
  'loyalty',
  'goals',
  'lead',
  'protection',
  'wellbeing',
  'review',
  'ops',
  'system',
]

// Representative action for each category (used to compute tier default)
const CATEGORY_REPRESENTATIVE_ACTION: Record<NotificationCategory, NotificationAction> = {
  inquiry: 'new_inquiry',
  quote: 'quote_accepted',
  event: 'event_paid',
  payment: 'payment_received',
  chat: 'new_message',
  client: 'client_signup',
  loyalty: 'reward_redeemed_by_client',
  goals: 'goal_nudge',
  lead: 'new_guest_lead',
  protection: 'insurance_expiring_7d',
  wellbeing: 'burnout_risk_high',
  review: 'review_submitted',
  ops: 'task_assigned',
  system: 'system_alert',
}

function getTierDefault(category: NotificationCategory): {
  email: boolean
  push: boolean
  sms: boolean
} {
  const action = CATEGORY_REPRESENTATIVE_ACTION[category]
  const tier = DEFAULT_TIER_MAP[action]
  return TIER_CHANNEL_DEFAULTS[tier]
}

// ─── Category Channel Row ────────────────────────────────────────────────────

type ChannelToggleProps = {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (val: boolean) => void
}

function ChannelToggle({ label, checked, disabled, onChange }: ChannelToggleProps) {
  return (
    <label className="flex flex-col items-center gap-1 cursor-pointer">
      <span className="sr-only">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2',
          checked ? 'bg-stone-900' : 'bg-stone-700',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block h-4 w-4 rounded-full bg-stone-900 shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </label>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type Props = {
  initialPreferences: CategoryPreference[]
  initialSmsSettings: SmsSettings
  initialExperienceSettings: NotificationExperienceSettings
}

export function NotificationSettingsForm({
  initialPreferences,
  initialSmsSettings,
  initialExperienceSettings,
}: Props) {
  const [isSettingsPending, startSettingsTransition] = useTransition()
  const [, startChannelSaveTransition] = useTransition()
  const [isSavingChannelChanges, setIsSavingChannelChanges] = useState(false)
  const { state: pushState, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription()

  // Build a map from preferences array for quick lookup
  const prefMap = new Map(initialPreferences.map((p) => [p.category, p]))

  // Local state for each category's channel settings
  const [channels, setChannels] = useState<
    Record<NotificationCategory, { email: boolean; push: boolean; sms: boolean }>
  >(() => {
    const result = {} as Record<
      NotificationCategory,
      { email: boolean; push: boolean; sms: boolean }
    >
    for (const cat of CHEF_CATEGORIES) {
      const defaults = getTierDefault(cat)
      const saved = prefMap.get(cat)
      result[cat] = {
        email: saved?.email_enabled ?? defaults.email,
        push: saved?.push_enabled ?? defaults.push,
        sms: saved?.sms_enabled ?? defaults.sms,
      }
    }
    return result
  })
  const [savedChannels, setSavedChannels] = useState(channels)
  const [dirtyCategories, setDirtyCategories] = useState<
    Partial<Record<NotificationCategory, boolean>>
  >({})
  const [channelSaved, setChannelSaved] = useState(false)
  const [channelError, setChannelError] = useState<string | null>(null)

  // SMS local state
  const [smsPhone, setSmsPhone] = useState(initialSmsSettings.sms_notify_phone ?? '')
  const [smsOptIn, setSmsOptIn] = useState(initialSmsSettings.sms_opt_in)
  const [savedSmsPhone, setSavedSmsPhone] = useState(initialSmsSettings.sms_notify_phone ?? '')
  const [savedSmsOptIn, setSavedSmsOptIn] = useState(initialSmsSettings.sms_opt_in)
  const [smsSaved, setSmsSaved] = useState(false)
  const [smsError, setSmsError] = useState<string | null>(null)
  const [experienceSaved, setExperienceSaved] = useState(false)
  const [experienceError, setExperienceError] = useState<string | null>(null)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    initialExperienceSettings.quiet_hours_enabled
  )
  const [quietStart, setQuietStart] = useState(
    initialExperienceSettings.quiet_hours_start ?? '22:00'
  )
  const [quietEnd, setQuietEnd] = useState(initialExperienceSettings.quiet_hours_end ?? '07:00')
  const [digestEnabled, setDigestEnabled] = useState(initialExperienceSettings.digest_enabled)
  const [digestIntervalMinutes, setDigestIntervalMinutes] = useState(
    String(initialExperienceSettings.digest_interval_minutes || 15)
  )
  const [visitorAlertsEnabled, setVisitorAlertsEnabled] = useState(
    initialExperienceSettings.visitor_alerts_enabled !== false
  )
  const [savedVisitorAlertsEnabled, setSavedVisitorAlertsEnabled] = useState(
    initialExperienceSettings.visitor_alerts_enabled !== false
  )
  const dirtyCategoryList = CHEF_CATEGORIES.filter((cat) => dirtyCategories[cat])
  const hasChannelChanges = dirtyCategoryList.length > 0
  const hasSavedSmsSettings = savedSmsOptIn && Boolean(savedSmsPhone.trim())

  useEffect(() => {
    if (!hasChannelChanges || isSavingChannelChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasChannelChanges, isSavingChannelChanges])

  const handleChannelToggle = (
    category: NotificationCategory,
    channel: 'email' | 'push' | 'sms',
    value: boolean
  ) => {
    setChannelSaved(false)
    setChannelError(null)
    setChannels((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: value },
    }))
    setDirtyCategories((prev) => ({ ...prev, [category]: true }))
  }

  const handleChannelSave = () => {
    const categoriesToSave = CHEF_CATEGORIES.filter((cat) => dirtyCategories[cat])
    if (categoriesToSave.length === 0 || isSavingChannelChanges) return

    const rollbackChannels = savedChannels
    const nextSavedChannels = channels

    setChannelSaved(false)
    setChannelError(null)
    setIsSavingChannelChanges(true)

    startChannelSaveTransition(() => {
      void (async () => {
        try {
          const result = await upsertCategoryPreferencesBatch(
            categoriesToSave.map((category) => ({
              category,
              email_enabled: nextSavedChannels[category].email,
              push_enabled: nextSavedChannels[category].push,
              sms_enabled: nextSavedChannels[category].sms,
            }))
          )

          if (result.error) {
            setChannels(rollbackChannels)
            setDirtyCategories({})
            setChannelError(result.error)
            toast.error('Failed to save notification preferences')
            return
          }

          setSavedChannels(nextSavedChannels)
          setDirtyCategories({})
          setChannelSaved(true)
          setTimeout(() => setChannelSaved(false), 3000)
        } catch (err) {
          console.error('[notification-settings] Failed to save channel preferences', err)
          setChannels(rollbackChannels)
          setDirtyCategories({})
          setChannelError('Failed to save notification preferences')
          toast.error('Failed to save notification preferences')
        } finally {
          setIsSavingChannelChanges(false)
        }
      })()
    })
  }

  const handleChannelDiscard = () => {
    setChannels(savedChannels)
    setDirtyCategories({})
    setChannelSaved(false)
    setChannelError(null)
  }

  const handleSmsSave = () => {
    setSmsSaved(false)
    setSmsError(null)

    startSettingsTransition(async () => {
      try {
        const result = await updateSmsSettings({
          sms_opt_in: smsOptIn,
          sms_notify_phone: smsPhone.trim() || null,
        })
        if (result.error) {
          setSmsError(result.error)
        } else {
          setSavedSmsOptIn(smsOptIn)
          setSavedSmsPhone(smsPhone.trim())
          setSmsSaved(true)
          setTimeout(() => setSmsSaved(false), 3000)
        }
      } catch (err) {
        setSmsError('Failed to save SMS settings')
        toast.error('Failed to save SMS settings')
      }
    })
  }

  const handleExperienceSave = () => {
    setExperienceSaved(false)
    setExperienceError(null)
    const rollbackVisitorAlertsEnabled = savedVisitorAlertsEnabled

    startSettingsTransition(async () => {
      try {
        const parsedInterval = Number.parseInt(digestIntervalMinutes, 10)
        const result = await updateNotificationExperienceSettings({
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietStart || null,
          quiet_hours_end: quietEnd || null,
          digest_enabled: digestEnabled,
          digest_interval_minutes: Number.isFinite(parsedInterval) ? parsedInterval : 15,
          visitor_alerts_enabled: visitorAlertsEnabled,
        })

        if (result.error) {
          setVisitorAlertsEnabled(rollbackVisitorAlertsEnabled)
          setExperienceError(result.error)
          return
        }

        setSavedVisitorAlertsEnabled(visitorAlertsEnabled)
        setExperienceSaved(true)
        setTimeout(() => setExperienceSaved(false), 3000)
      } catch (err) {
        console.error('[notification-settings] Failed to save attention controls', err)
        setVisitorAlertsEnabled(rollbackVisitorAlertsEnabled)
        setExperienceError('Failed to save attention controls')
        toast.error('Failed to save attention controls')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* ─── Browser Push ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">Browser Push Notifications</h2>
        <p className="mt-1 text-sm text-stone-500">
          Instant alerts delivered to this browser, even when the tab is closed.
        </p>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            {pushState === 'subscribed' && (
              <p className="text-sm text-green-700 font-medium">Enabled on this device</p>
            )}
            {pushState === 'default' && (
              <p className="text-sm text-stone-400">Not yet enabled on this device</p>
            )}
            {pushState === 'denied' && (
              <p className="text-sm text-red-600">
                Blocked by browser - open browser settings to re-allow.
              </p>
            )}
            {pushState === 'unsupported' && (
              <p className="text-sm text-stone-400">Not supported on this browser or device.</p>
            )}
          </div>

          {(pushState === 'default' || pushState === 'subscribed') && (
            <button
              type="button"
              onClick={pushState === 'subscribed' ? unsubscribe : subscribe}
              disabled={pushLoading}
              className={[
                'shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                pushState === 'subscribed'
                  ? 'border border-stone-600 bg-stone-900 text-stone-300 hover:bg-stone-800'
                  : 'bg-stone-900 text-white hover:bg-stone-800',
              ].join(' ')}
            >
              {pushLoading ? '…' : pushState === 'subscribed' ? 'Disable push' : 'Enable push'}
            </button>
          )}
        </div>
      </section>

      {/* ─── In-App Attention Controls ─────────────────── */}
      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">Notification Timing</h2>
        <p className="mt-1 text-sm text-stone-500">
          Reduce alert noise with quiet windows. Critical notifications (payments, allergies, new
          inquiries) always deliver immediately regardless of quiet hours.
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 accent-stone-900"
            />
            <span className="text-sm text-stone-300">Enable quiet hours</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-stone-300">
              Quiet window start
              <input
                type="time"
                value={quietStart}
                disabled={!quietHoursEnabled}
                onChange={(e) => setQuietStart(e.target.value)}
                className="mt-1 block w-full rounded-md border border-stone-600 px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
            <label className="text-sm text-stone-300">
              Quiet window end
              <input
                type="time"
                value={quietEnd}
                disabled={!quietHoursEnabled}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="mt-1 block w-full rounded-md border border-stone-600 px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-stone-800 bg-stone-950/40 p-3">
            <input
              type="checkbox"
              checked={visitorAlertsEnabled}
              onChange={(e) => setVisitorAlertsEnabled(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 accent-stone-900"
            />
            <span className="text-sm text-stone-300">
              <span className="block font-medium text-stone-100">
                Client portal activity alerts
              </span>
              <span className="mt-1 block text-stone-400">
                Notify me when clients show high-intent portal activity, such as viewing a quote,
                payment page, or event details.
              </span>
            </span>
          </label>

          {/* Digest batching: settings saved to DB, processor not yet built */}
          {/* Hidden until backend cron processor exists to avoid zero-hallucination violation */}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExperienceSave}
              disabled={isSettingsPending}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isSettingsPending ? 'Saving...' : 'Save attention controls'}
            </button>
            {experienceSaved && <span className="text-sm text-emerald-600">Saved</span>}
            {experienceError && <span className="text-sm text-red-600">{experienceError}</span>}
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">SMS Alerts</h2>
        <p className="mt-1 text-sm text-stone-500">
          Text messages for critical-tier notifications: new inquiries, payments, and disputes.
          Requires Twilio setup (see docs).
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-300" htmlFor="sms-phone">
              Phone number (E.164 format, e.g. +14155551234)
            </label>
            <input
              id="sms-phone"
              type="tel"
              placeholder="+14155551234"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              className="mt-1 block w-full max-w-xs rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 accent-stone-900"
            />
            <span className="text-sm text-stone-300">
              I agree to receive SMS notifications from ChefFlow. Message and data rates may apply.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSmsSave}
              disabled={isSettingsPending}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isSettingsPending ? 'Saving…' : 'Save SMS settings'}
            </button>
            {smsSaved && <span className="text-sm text-emerald-600">Saved</span>}
            {smsError && <span className="text-sm text-red-600">{smsError}</span>}
          </div>
        </div>
      </section>

      {/* ─── Per-Category Toggles ────────────────────────────────────── */}
      <section className="rounded-xl border border-stone-700 bg-stone-900">
        <div className="border-b border-stone-700 p-5">
          <h2 className="text-base font-semibold text-stone-100">Channel Overrides by Category</h2>
          <p className="mt-1 text-sm text-stone-500">
            Defaults come from the notification tier system. Toggle here to override per category.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wide w-20">
                  Email
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wide w-20">
                  Push
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wide w-20">
                  SMS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {CHEF_CATEGORIES.map((cat) => (
                <tr key={cat} className="hover:bg-stone-800/50">
                  <td className="px-5 py-3 text-sm font-medium text-stone-100">
                    {CATEGORY_LABELS[cat]}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChannelToggle
                      label={`${CATEGORY_LABELS[cat]} email`}
                      checked={channels[cat].email}
                      disabled={isSavingChannelChanges}
                      onChange={(v) => handleChannelToggle(cat, 'email', v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChannelToggle
                      label={`${CATEGORY_LABELS[cat]} push`}
                      checked={channels[cat].push}
                      disabled={
                        isSavingChannelChanges ||
                        pushState === 'unsupported' ||
                        pushState === 'denied'
                      }
                      onChange={(v) => handleChannelToggle(cat, 'push', v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChannelToggle
                      label={`${CATEGORY_LABELS[cat]} SMS`}
                      checked={channels[cat].sms}
                      disabled={isSavingChannelChanges || !hasSavedSmsSettings}
                      onChange={(v) => handleChannelToggle(cat, 'sms', v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-stone-800 px-5 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-400">
              SMS toggles are disabled until you save a phone number and opt in above. Push toggles
              are disabled if push is unsupported or denied by the browser.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChannelSave}
                disabled={!hasChannelChanges || isSavingChannelChanges}
                className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {isSavingChannelChanges ? 'Saving...' : 'Save channel changes'}
              </button>
              {hasChannelChanges && !isSavingChannelChanges && (
                <span className="text-xs text-stone-400">{dirtyCategoryList.length} unsaved</span>
              )}
              {hasChannelChanges && !isSavingChannelChanges && (
                <button
                  type="button"
                  onClick={handleChannelDiscard}
                  className="rounded-md px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
                >
                  Discard
                </button>
              )}
              {channelSaved && <span className="text-sm text-emerald-600">Saved</span>}
              {channelError && <span className="text-sm text-red-600">{channelError}</span>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
