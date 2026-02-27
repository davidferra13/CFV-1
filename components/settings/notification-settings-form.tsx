'use client'
// Notification Settings Form
// Per-category channel toggles (email, push, SMS) + SMS phone setup.
// Mounted on /settings/notifications. Uses optimistic UI â€” saves on toggle.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { usePushSubscription } from '@/components/notifications/use-push-subscription'
import {
  upsertCategoryPreference,
  updateNotificationExperienceSettings,
  updateSmsSettings,
  type CategoryPreference,
  type NotificationExperienceSettings,
  type SmsSettings,
} from '@/lib/notifications/settings-actions'
import { TIER_CHANNEL_DEFAULTS, DEFAULT_TIER_MAP } from '@/lib/notifications/tier-config'
import { type NotificationCategory, CATEGORY_LABELS } from '@/lib/notifications/types'

// Chef-facing categories only (omit client-facing)
const CHEF_CATEGORIES: NotificationCategory[] = [
  'inquiry',
  'quote',
  'event',
  'payment',
  'chat',
  'client',
  'system',
]

// Representative action for each category (used to compute tier default)
const CATEGORY_REPRESENTATIVE_ACTION: Partial<Record<NotificationCategory, string>> = {
  inquiry: 'new_inquiry',
  quote: 'quote_accepted',
  event: 'event_paid',
  payment: 'payment_received',
  chat: 'new_message',
  client: 'client_signup',
  loyalty: 'gift_card_purchased',
  system: 'system_alert',
}

function getTierDefault(category: NotificationCategory): {
  email: boolean
  push: boolean
  sms: boolean
} {
  const action = CATEGORY_REPRESENTATIVE_ACTION[category] as keyof typeof DEFAULT_TIER_MAP
  const tier = DEFAULT_TIER_MAP[action]
  return TIER_CHANNEL_DEFAULTS[tier]
}

// â”€â”€â”€ Category Channel Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Main Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const [isPending, startTransition] = useTransition()
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

  // SMS local state
  const [smsPhone, setSmsPhone] = useState(initialSmsSettings.sms_notify_phone ?? '')
  const [smsOptIn, setSmsOptIn] = useState(initialSmsSettings.sms_opt_in)
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

  const handleChannelToggle = (
    category: NotificationCategory,
    channel: 'email' | 'push' | 'sms',
    value: boolean
  ) => {
    setChannels((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: value },
    }))

    startTransition(async () => {
      try {
        await upsertCategoryPreference(category, {
          [`${channel}_enabled`]: value,
        })
      } catch (err) {
        console.error('[notification-settings] Failed to save preference', err)
        setChannels((prev) => ({
          ...prev,
          [category]: { ...prev[category], [channel]: !value },
        }))
        toast.error('Failed to save notification preference')
      }
    })
  }

  const handleSmsSave = () => {
    setSmsSaved(false)
    setSmsError(null)

    startTransition(async () => {
      const result = await updateSmsSettings({
        sms_opt_in: smsOptIn,
        sms_notify_phone: smsPhone.trim() || null,
      })
      if (result.error) {
        setSmsError(result.error)
      } else {
        setSmsSaved(true)
        setTimeout(() => setSmsSaved(false), 3000)
      }
    })
  }

  const handleExperienceSave = () => {
    setExperienceSaved(false)
    setExperienceError(null)

    startTransition(async () => {
      const parsedInterval = Number.parseInt(digestIntervalMinutes, 10)
      const result = await updateNotificationExperienceSettings({
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietStart || null,
        quiet_hours_end: quietEnd || null,
        digest_enabled: digestEnabled,
        digest_interval_minutes: Number.isFinite(parsedInterval) ? parsedInterval : 15,
      })

      if (result.error) {
        setExperienceError(result.error)
        return
      }

      setExperienceSaved(true)
      setTimeout(() => setExperienceSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-8">
      {/* â”€â”€â”€ Browser Push â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                Blocked by browser â€” open browser settings to re-allow.
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
              {pushLoading ? 'â€¦' : pushState === 'subscribed' ? 'Disable push' : 'Enable push'}
            </button>
          )}
        </div>
      </section>

      {/* â”€â”€â”€ In-App Attention Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-stone-100">In-App Attention Controls</h2>
        <p className="mt-1 text-sm text-stone-500">
          Reduce alert noise with quiet windows and digest batching. Critical notifications always
          interrupt immediately.
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

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 accent-stone-900"
            />
            <span className="text-sm text-stone-300">
              Batch non-critical notifications into a digest
            </span>
          </label>

          <label className="text-sm text-stone-300 block max-w-xs">
            Digest interval (minutes)
            <input
              type="number"
              min={5}
              max={120}
              value={digestIntervalMinutes}
              disabled={!digestEnabled}
              onChange={(e) => setDigestIntervalMinutes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-stone-600 px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExperienceSave}
              disabled={isPending}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save attention controls'}
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
              disabled={isPending}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Savingâ€¦' : 'Save SMS settings'}
            </button>
            {smsSaved && <span className="text-sm text-emerald-600">Saved</span>}
            {smsError && <span className="text-sm text-red-600">{smsError}</span>}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Per-Category Toggles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                      onChange={(v) => handleChannelToggle(cat, 'email', v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChannelToggle
                      label={`${CATEGORY_LABELS[cat]} push`}
                      checked={channels[cat].push}
                      disabled={pushState === 'unsupported' || pushState === 'denied'}
                      onChange={(v) => handleChannelToggle(cat, 'push', v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChannelToggle
                      label={`${CATEGORY_LABELS[cat]} SMS`}
                      checked={channels[cat].sms}
                      disabled={!smsOptIn || !smsPhone}
                      onChange={(v) => handleChannelToggle(cat, 'sms', v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-stone-800 px-5 py-3">
          <p className="text-xs text-stone-400">
            SMS toggles are disabled until you save a phone number and opt in above. Push toggles
            are disabled if push is unsupported or denied by the browser.
          </p>
        </div>
      </section>
    </div>
  )
}
