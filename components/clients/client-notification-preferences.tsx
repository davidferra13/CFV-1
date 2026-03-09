'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert } from '@/components/ui/alert'
import {
  updateMyNotificationPreferences,
  type ClientNotificationPreferences,
} from '@/lib/clients/self-service-actions'

type PreferenceRow = {
  key: keyof ClientNotificationPreferences
  title: string
  description: string
}

const EMAIL_PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: 'marketingEmails',
    title: 'Marketing emails',
    description: 'Seasonal offers, new services, and chef updates.',
  },
  {
    key: 'eventUpdates',
    title: 'Event updates',
    description: 'Important changes, confirmations, and event reminders.',
  },
  {
    key: 'paymentReceipts',
    title: 'Payment receipts',
    description: 'Receipts, payment confirmations, and balance updates.',
  },
  {
    key: 'loyaltyUpdates',
    title: 'Loyalty updates',
    description: 'Points awarded, tier changes, and reward activity.',
  },
  {
    key: 'postEventFollowups',
    title: 'Post-event follow-ups',
    description: 'Review requests, photos-ready notices, and wrap-up emails.',
  },
]

const EXPERIENCE_PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: 'availabilitySignals',
    title: 'Chef availability notifications',
    description: 'Get notified when your chef opens specific dates for booking.',
  },
]

type ClientNotificationPreferencesProps = {
  initialPreferences: ClientNotificationPreferences
}

export function ClientNotificationPreferences({
  initialPreferences,
}: ClientNotificationPreferencesProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isDirty = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences]
  )

  function setPreference(key: keyof ClientNotificationPreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  function handleSave() {
    setError(null)

    startTransition(async () => {
      try {
        await updateMyNotificationPreferences(preferences)
        setSavedPreferences(preferences)
        toast.success('Notification preferences saved')
      } catch (saveError) {
        const message =
          saveError instanceof Error ? saveError.message : 'Failed to save notification preferences'
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleReset() {
    setPreferences(savedPreferences)
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Email delivery</h3>
            <p className="mt-1 text-sm text-stone-400">
              Choose which email updates you want ChefFlow to send to you.
            </p>
          </div>

          <div className="space-y-3">
            {EMAIL_PREFERENCE_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-stone-700 bg-stone-900/70 p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium text-stone-100">{row.title}</p>
                  <p className="text-sm text-stone-400">{row.description}</p>
                </div>
                <Switch
                  checked={preferences[row.key]}
                  onCheckedChange={(checked) => setPreference(row.key, checked)}
                  aria-label={row.title}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-t border-stone-800 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Experience alerts</h3>
            <p className="mt-1 text-sm text-stone-400">
              Control helpful booking signals without affecting transactional emails.
            </p>
          </div>

          <div className="space-y-3">
            {EXPERIENCE_PREFERENCE_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-start justify-between gap-4 rounded-xl border border-stone-700 bg-stone-900/70 p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium text-stone-100">{row.title}</p>
                  <p className="text-sm text-stone-400">{row.description}</p>
                </div>
                <Switch
                  checked={preferences[row.key]}
                  onCheckedChange={(checked) => setPreference(row.key, checked)}
                  aria-label={row.title}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || isPending}
            loading={isPending}
          >
            Save Preferences
          </Button>
          <Button variant="secondary" onClick={handleReset} disabled={!isDirty || isPending}>
            Reset Changes
          </Button>
          <p className="text-xs text-stone-500">
            Transactional updates stay enabled by default until you change them here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
