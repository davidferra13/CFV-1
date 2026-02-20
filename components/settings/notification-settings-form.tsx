'use client'
// Notification Settings Form
// Per-category channel toggles (email, push, SMS) + SMS phone setup.
// Mounted on /settings/notifications. Uses optimistic UI — saves on toggle.

import { useState, useTransition } from 'react'
import { usePushSubscription } from '@/components/notifications/use-push-subscription'
import {
  upsertCategoryPreference,
  updateSmsSettings,
  type CategoryPreference,
  type SmsSettings,
} from '@/lib/notifications/settings-actions'
import {
  TIER_CHANNEL_DEFAULTS,
  DEFAULT_TIER_MAP,
} from '@/lib/notifications/tier-config'
import {
  type NotificationCategory,
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
  'system',
]

// Representative action for each category (used to compute tier default)
const CATEGORY_REPRESENTATIVE_ACTION: Partial<Record<NotificationCategory, string>> = {
  inquiry:  'new_inquiry',
  quote:    'quote_accepted',
  event:    'event_paid',
  payment:  'payment_received',
  chat:     'new_message',
  client:   'client_signup',
  loyalty:  'gift_card_purchased',
  system:   'system_alert',
}

function getTierDefault(category: NotificationCategory): { email: boolean; push: boolean; sms: boolean } {
  const action = CATEGORY_REPRESENTATIVE_ACTION[category] as keyof typeof DEFAULT_TIER_MAP
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
          checked ? 'bg-stone-900' : 'bg-stone-200',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform',
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
}

export function NotificationSettingsForm({ initialPreferences, initialSmsSettings }: Props) {
  const [isPending, startTransition] = useTransition()
  const { state: pushState, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription()

  // Build a map from preferences array for quick lookup
  const prefMap = new Map(initialPreferences.map((p) => [p.category, p]))

  // Local state for each category's channel settings
  const [channels, setChannels] = useState<
    Record<NotificationCategory, { email: boolean; push: boolean; sms: boolean }>
  >(() => {
    const result = {} as Record<NotificationCategory, { email: boolean; push: boolean; sms: boolean }>
    for (const cat of CHEF_CATEGORIES) {
      const defaults = getTierDefault(cat)
      const saved = prefMap.get(cat)
      result[cat] = {
        email: saved?.email_enabled ?? defaults.email,
        push:  saved?.push_enabled  ?? defaults.push,
        sms:   saved?.sms_enabled   ?? defaults.sms,
      }
    }
    return result
  })

  // SMS local state
  const [smsPhone, setSmsPhone] = useState(initialSmsSettings.sms_notify_phone ?? '')
  const [smsOptIn, setSmsOptIn] = useState(initialSmsSettings.sms_opt_in)
  const [smsSaved, setSmsSaved] = useState(false)
  const [smsError, setSmsError] = useState<string | null>(null)

  const handleChannelToggle = (
    category: NotificationCategory,
    channel: 'email' | 'push' | 'sms',
    value: boolean,
  ) => {
    setChannels((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: value },
    }))

    startTransition(async () => {
      await upsertCategoryPreference(category, {
        [`${channel}_enabled`]: value,
      })
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

  return (
    <div className="space-y-8">

      {/* ─── Browser Push ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold text-stone-900">Browser Push Notifications</h2>
        <p className="mt-1 text-sm text-stone-500">
          Instant alerts delivered to this browser, even when the tab is closed.
        </p>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            {pushState === 'subscribed' && (
              <p className="text-sm text-green-700 font-medium">Enabled on this device</p>
            )}
            {pushState === 'default' && (
              <p className="text-sm text-stone-600">Not yet enabled on this device</p>
            )}
            {pushState === 'denied' && (
              <p className="text-sm text-red-600">
                Blocked by browser — open browser settings to re-allow.
              </p>
            )}
            {pushState === 'unsupported' && (
              <p className="text-sm text-stone-400">
                Not supported on this browser or device.
              </p>
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
                  ? 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                  : 'bg-stone-900 text-white hover:bg-stone-800',
              ].join(' ')}
            >
              {pushLoading
                ? '…'
                : pushState === 'subscribed'
                ? 'Disable push'
                : 'Enable push'}
            </button>
          )}
        </div>
      </section>

      {/* ─── SMS Setup ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold text-stone-900">SMS Alerts</h2>
        <p className="mt-1 text-sm text-stone-500">
          Text messages for critical-tier notifications: new inquiries, payments, and disputes.
          Requires Twilio setup (see docs).
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700" htmlFor="sms-phone">
              Phone number (E.164 format, e.g. +14155551234)
            </label>
            <input
              id="sms-phone"
              type="tel"
              placeholder="+14155551234"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              className="mt-1 block w-full max-w-xs rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 accent-stone-900"
            />
            <span className="text-sm text-stone-700">
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
              {isPending ? 'Saving…' : 'Save SMS settings'}
            </button>
            {smsSaved && <span className="text-sm text-emerald-600">Saved</span>}
            {smsError && <span className="text-sm text-red-600">{smsError}</span>}
          </div>
        </div>
      </section>

      {/* ─── Per-Category Toggles ────────────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 p-5">
          <h2 className="text-base font-semibold text-stone-900">Channel Overrides by Category</h2>
          <p className="mt-1 text-sm text-stone-500">
            Defaults come from the notification tier system. Toggle here to override per category.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
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
                <tr key={cat} className="hover:bg-stone-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-stone-900">
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

        <div className="border-t border-stone-100 px-5 py-3">
          <p className="text-xs text-stone-400">
            SMS toggles are disabled until you save a phone number and opt in above.
            Push toggles are disabled if push is unsupported or denied by the browser.
          </p>
        </div>
      </section>
    </div>
  )
}
