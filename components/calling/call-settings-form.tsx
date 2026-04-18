'use client'

/**
 * Call Settings Form
 *
 * Per-chef configuration for the AI voice system.
 * Active hours, voice selection, SMS alerts, feature toggles.
 */

import { useState, useTransition } from 'react'
import { upsertRoutingRules } from '@/lib/calling/twilio-actions'

const VOICES = [
  { value: 'Polly.Matthew-Neural', label: 'Matthew (Neural) - Natural male voice (recommended)' },
  { value: 'Polly.Joanna-Neural', label: 'Joanna (Neural) - Natural female voice' },
  { value: 'Polly.Joey-Neural', label: 'Joey (Neural) - Casual male voice' },
  { value: 'Polly.Matthew', label: 'Matthew (Standard) - Classic voice' },
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
]

interface Props {
  initialRules: Record<string, any> | null
}

export function CallSettingsForm({ initialRules }: Props) {
  const [voice, setVoice] = useState(initialRules?.ai_voice || 'Polly.Matthew-Neural')
  const [activeStart, setActiveStart] = useState(initialRules?.active_hours_start || '08:00')
  const [activeEnd, setActiveEnd] = useState(initialRules?.active_hours_end || '20:00')
  const [timezone, setTimezone] = useState(initialRules?.active_timezone || 'America/New_York')
  const [dailyLimit, setDailyLimit] = useState(String(initialRules?.daily_call_limit ?? 20))
  const [chefSmsNumber, setChefSmsNumber] = useState(initialRules?.chef_sms_number || '')
  const [enableVoicemail, setEnableVoicemail] = useState(
    initialRules?.enable_inbound_voicemail ?? true
  )
  const [enableDelivery, setEnableDelivery] = useState(
    initialRules?.enable_vendor_delivery ?? false
  )
  const [enableVenue, setEnableVenue] = useState(initialRules?.enable_venue_confirmation ?? false)

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setSaved(false)
    setError(null)

    // Q9: client-side guard - start >= end causes upsertRoutingRules to reject,
    // but catching it here avoids an unnecessary server round-trip and gives
    // immediate feedback before the transition begins.
    if (activeStart >= activeEnd) {
      setError('Start time must be before end time. Cross-midnight windows are not supported.')
      return
    }

    startTransition(async () => {
      try {
        const result = await upsertRoutingRules({
          ai_voice: voice,
          active_hours_start: activeStart,
          active_hours_end: activeEnd,
          active_timezone: timezone,
          daily_call_limit: parseInt(dailyLimit, 10) || 20,
          chef_sms_number: chefSmsNumber.trim() || undefined,
          enable_inbound_voicemail: enableVoicemail,
          enable_vendor_delivery: enableDelivery,
          enable_venue_confirmation: enableVenue,
        })
        if (result.success) {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        } else {
          setError(result.error || 'Failed to save settings.')
        }
      } catch (err) {
        setError('Unexpected error saving settings.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Voice */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">AI Voice</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Neural voices sound far more natural. Matthew Neural is recommended.
          </p>
        </div>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {VOICES.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </section>

      {/* Active Hours */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Active Hours</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Outbound calls are blocked outside these hours. Inbound calls go to voicemail.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-stone-500 mb-1 block">Start</label>
            <input
              type="time"
              value={activeStart}
              onChange={(e) => setActiveStart(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <span className="text-stone-500 text-sm mt-5">to</span>
          <div className="flex-1">
            <label className="text-xs text-stone-500 mb-1 block">End</label>
            <input
              type="time"
              value={activeEnd}
              onChange={(e) => setActiveEnd(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </section>

      {/* SMS Alerts */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Chef SMS Alert Number</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Your phone number for real-time alerts when calls complete or voicemails arrive. Format:
            +16175551234
          </p>
        </div>
        <input
          type="tel"
          value={chefSmsNumber}
          onChange={(e) => setChefSmsNumber(e.target.value)}
          placeholder="+16175551234"
          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      {/* Daily Limit */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Daily Call Limit</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Maximum outbound calls per day. Resets at midnight.
          </p>
        </div>
        <input
          type="number"
          min={1}
          max={100}
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
          className="w-32 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      {/* Feature Toggles */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-200">Enabled Roles</h3>
        <div className="space-y-3">
          {[
            {
              key: 'voicemail',
              label: 'Inbound Voicemail',
              description:
                'Answer calls to your AI number and transcribe voicemails automatically.',
              value: enableVoicemail,
              set: setEnableVoicemail,
            },
            {
              key: 'delivery',
              label: 'Vendor Delivery Coordination',
              description: 'Call vendors to confirm delivery windows for confirmed events.',
              value: enableDelivery,
              set: setEnableDelivery,
            },
            {
              key: 'venue',
              label: 'Venue Confirmation',
              description: 'Call venues to confirm kitchen access time, parking, and setup notes.',
              value: enableVenue,
              set: setEnableVenue,
            },
          ].map(({ key, label, description, value, set }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => set(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-stone-600 bg-stone-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-stone-900"
              />
              <div>
                <span className="text-sm font-medium text-stone-200 group-hover:text-stone-100">
                  {label}
                </span>
                <p className="text-xs text-stone-500 mt-0.5">{description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Settings saved.</span>}
        {error && <span className="text-sm text-rose-400">{error}</span>}
      </div>
    </div>
  )
}
