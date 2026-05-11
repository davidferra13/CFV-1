'use client'

import { useState, useTransition } from 'react'
import {
  updateClientCommunicationPreferences,
  type CommunicationPreferences,
} from '@/lib/preferences/communication-preferences-actions'

type Props = {
  initialPrefs: CommunicationPreferences
}

const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text Message' },
  { value: 'phone', label: 'Phone' },
  { value: 'circle', label: 'Circle Chat' },
] as const

const FREQUENCIES = [
  { value: 'immediate', label: 'Immediate', desc: 'Get notified right away' },
  { value: 'daily_digest', label: 'Daily Digest', desc: 'One summary per day' },
  { value: 'weekly_digest', label: 'Weekly Digest', desc: 'One summary per week' },
] as const

export function CommunicationPreferencesForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      try {
        await updateClientCommunicationPreferences(prefs)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch {
        // Error handled by server action
      }
    })
  }

  const hasChanges =
    prefs.preferred_contact_method !== initialPrefs.preferred_contact_method ||
    prefs.notification_frequency !== initialPrefs.notification_frequency ||
    prefs.marketing_opt_in !== initialPrefs.marketing_opt_in

  return (
    <div className="space-y-5">
      {/* Contact Method */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-300">Preferred Contact Method</legend>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_METHODS.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                prefs.preferred_contact_method === m.value
                  ? 'border-brand-500 bg-brand-950 text-brand-300'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600'
              }`}
            >
              <input
                type="radio"
                name="contact_method"
                value={m.value}
                checked={prefs.preferred_contact_method === m.value}
                onChange={() => setPrefs({ ...prefs, preferred_contact_method: m.value })}
                className="sr-only"
              />
              <span className="text-sm">{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Notification Frequency */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-300">Notification Frequency</legend>
        <div className="space-y-2">
          {FREQUENCIES.map((f) => (
            <label
              key={f.value}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                prefs.notification_frequency === f.value
                  ? 'border-brand-500 bg-brand-950'
                  : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="frequency"
                  value={f.value}
                  checked={prefs.notification_frequency === f.value}
                  onChange={() => setPrefs({ ...prefs, notification_frequency: f.value })}
                  className="sr-only"
                />
                <span
                  className={`text-sm ${prefs.notification_frequency === f.value ? 'text-brand-300' : 'text-stone-400'}`}
                >
                  {f.label}
                </span>
              </div>
              <span className="text-xs text-stone-500">{f.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Marketing Opt-in */}
      <label className="flex items-center justify-between px-3 py-3 rounded-lg border border-stone-700 bg-stone-800/50 cursor-pointer">
        <div>
          <p className="text-sm text-stone-300">Marketing updates</p>
          <p className="text-xs text-stone-500">Occasional updates about new features and offers</p>
        </div>
        <input
          type="checkbox"
          checked={prefs.marketing_opt_in}
          onChange={(e) => setPrefs({ ...prefs, marketing_opt_in: e.target.checked })}
          className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
        />
      </label>

      {/* Save Button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      )}
      {saved && <p className="text-xs text-emerald-400">Preferences saved</p>}
    </div>
  )
}
