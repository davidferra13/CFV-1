'use client'

// Deposit Settings Form - Chef configures deposit policy
// Default: 50% non-refundable deposit, balance due 7 days before event.

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateDepositSettings } from '@/lib/finance/deposit-actions'
import type { DepositSettings } from '@/lib/finance/deposit-actions'
import { toast } from 'sonner'

interface Props {
  initialSettings: DepositSettings
}

const REMINDER_OPTIONS = [
  { days: 14, label: '14 days before' },
  { days: 7, label: '7 days before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: '1 day before' },
]

export function DepositSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState<DepositSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        await updateDepositSettings(settings)
        toast.success('Deposit settings saved')
      } catch (err) {
        toast.error('Failed to save deposit settings')
      }
    })
  }

  function toggleReminderDay(day: number) {
    setSettings((prev) => {
      const current = prev.reminderDaysBefore
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => b - a)
      return { ...prev, reminderDaysBefore: updated }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit Policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deposit required toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-200">Require Deposit</p>
            <p className="text-xs text-stone-500">Require an upfront deposit when booking events</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.depositRequired}
            onClick={() =>
              setSettings((prev) => ({ ...prev, depositRequired: !prev.depositRequired }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.depositRequired ? 'bg-brand-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                settings.depositRequired ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Deposit percentage slider */}
        {settings.depositRequired && (
          <div>
            <label className="text-sm font-medium text-stone-200 block mb-2">
              Deposit Percentage: {settings.depositPercentage}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.depositPercentage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  depositPercentage: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Balance due days before event */}
        <div>
          <label className="text-sm font-medium text-stone-200 block mb-2">
            Balance Due (days before event)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={90}
              value={settings.balanceDueDaysBefore}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  balanceDueDaysBefore: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-24 rounded-md bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-400">days before the event date</span>
          </div>
        </div>

        {/* Auto-reminder toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-200">Auto Reminders</p>
            <p className="text-xs text-stone-500">
              Automatically send payment reminders before due dates
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoReminder}
            onClick={() => setSettings((prev) => ({ ...prev, autoReminder: !prev.autoReminder }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoReminder ? 'bg-brand-600' : 'bg-stone-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                settings.autoReminder ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reminder schedule */}
        {settings.autoReminder && (
          <div>
            <p className="text-sm font-medium text-stone-200 mb-2">Reminder Schedule</p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => {
                const active = settings.reminderDaysBefore.includes(opt.days)
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => toggleReminderDay(opt.days)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment terms text */}
        <div>
          <label className="text-sm font-medium text-stone-200 block mb-2">
            Payment Terms (for quotes/contracts)
          </label>
          <textarea
            value={settings.paymentTermsText ?? ''}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                paymentTermsText: e.target.value || null,
              }))
            }
            placeholder="e.g., A 50% non-refundable deposit is required to secure your booking. The remaining balance is due 7 days before the event."
            rows={3}
            className="w-full rounded-md bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
