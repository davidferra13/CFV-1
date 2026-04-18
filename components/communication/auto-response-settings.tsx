'use client'

import { useState, useTransition } from 'react'
import {
  updateAutoResponseConfig,
  type AutoResponseConfig,
} from '@/lib/communication/auto-response'

type Props = {
  config: AutoResponseConfig | null
}

export function AutoResponseSettings({ config }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false)
  const [responseTime, setResponseTime] = useState(
    config?.default_response_time ?? 'within 24 hours'
  )
  const [replyToEmail, setReplyToEmail] = useState(config?.reply_to_email ?? '')
  const [personalizeWithAi, setPersonalizeWithAi] = useState(config?.personalize_with_ai ?? true)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateAutoResponseConfig({
          enabled,
          default_response_time: responseTime,
          reply_to_email: replyToEmail || null,
          personalize_with_ai: personalizeWithAi,
        })
        if (result.success) {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        } else {
          setError(result.error ?? 'Failed to save.')
        }
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-100">Auto-Response</h2>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
        </label>
      </div>

      <p className="text-stone-400 text-sm mb-4">
        When enabled, new inquiries automatically receive a personalized acknowledgment email within
        seconds. This helps you capture bookings you would otherwise lose to slow response times.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">Expected Response Time</label>
          <select
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm"
          >
            <option value="within a few hours">Within a few hours</option>
            <option value="within 24 hours">Within 24 hours</option>
            <option value="within 1-2 business days">Within 1-2 business days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">Reply-To Email (optional)</label>
          <input
            type="email"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm placeholder-stone-500"
          />
          <p className="text-stone-500 text-xs mt-1">
            Client replies go to this address. Leave blank to use your account email.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={personalizeWithAi}
            onChange={(e) => setPersonalizeWithAi(e.target.checked)}
            className="rounded bg-stone-800 border-stone-700 text-amber-600"
          />
          <span className="text-sm text-stone-300">
            Let Remy personalize auto-responses (private AI)
          </span>
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved!</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  )
}
