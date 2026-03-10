'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Smartphone, Check, AlertCircle } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { updateSMSSettings, testSMSConnection } from '@/lib/sms/sms-actions'

type SMSSettingsData = {
  sms_enabled: boolean
  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_phone_number: string | null
}

export function SMSSettings({ initial }: { initial: SMSSettingsData }) {
  const [settings, setSettings] = useState<SMSSettingsData>(initial)
  const [saving, startSave] = useTransition()
  const [testing, startTest] = useTransition()

  const isConfigured = !!(
    settings.twilio_account_sid &&
    settings.twilio_auth_token &&
    settings.twilio_phone_number
  )

  function handleSave() {
    const prev = { ...settings }
    startSave(async () => {
      try {
        const result = await updateSMSSettings(settings)
        if (!result.success) {
          setSettings(prev)
          toast.error(result.error || 'Failed to save SMS settings')
          return
        }
        toast.success('SMS settings saved')
      } catch {
        setSettings(prev)
        toast.error('Failed to save SMS settings')
      }
    })
  }

  function handleTest() {
    startTest(async () => {
      try {
        const result = await testSMSConnection()
        if (result.success) {
          toast.success('Test SMS sent successfully! Check your phone.')
        } else {
          toast.error(result.error || 'Test failed')
        }
      } catch {
        toast.error('Failed to test SMS connection')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-stone-400" />
          <div>
            <h3 className="text-sm font-medium text-stone-200">SMS Notifications</h3>
            <p className="text-xs text-stone-500">Send text messages to customers via Twilio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured ? (
            <Badge variant="success">Configured</Badge>
          ) : (
            <Badge variant="warning">Not configured</Badge>
          )}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.sms_enabled}
              onChange={(e) => setSettings((s) => ({ ...s, sms_enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>
      </div>

      {/* Twilio Credentials */}
      <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900/50 p-4">
        <h4 className="text-sm font-medium text-stone-300">Twilio Configuration</h4>
        <p className="text-xs text-stone-500">
          Sign up at twilio.com to get your credentials. Your auth token is encrypted at rest by
          Supabase.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Account SID</label>
            <input
              type="text"
              value={settings.twilio_account_sid || ''}
              onChange={(e) =>
                setSettings((s) => ({ ...s, twilio_account_sid: e.target.value || null }))
              }
              placeholder="AC..."
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Auth Token</label>
            <input
              type="password"
              value={settings.twilio_auth_token || ''}
              onChange={(e) =>
                setSettings((s) => ({ ...s, twilio_auth_token: e.target.value || null }))
              }
              placeholder="Your Twilio auth token"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Phone Number</label>
            <input
              type="text"
              value={settings.twilio_phone_number || ''}
              onChange={(e) =>
                setSettings((s) => ({ ...s, twilio_phone_number: e.target.value || null }))
              }
              placeholder="+1234567890"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          onClick={handleTest}
          disabled={testing || !isConfigured}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-200 text-sm font-medium rounded-md transition-colors"
        >
          <AlertCircle className="h-4 w-4" />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  )
}
