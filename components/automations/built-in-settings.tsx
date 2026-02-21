// Built-in Automation Settings
// Toggle cards for each system automation with plain-English descriptions.
// Chef can enable/disable each and configure key parameters.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateAutomationSettings } from '@/lib/automations/settings-actions'
import type { ChefAutomationSettings } from '@/lib/automations/types'

interface BuiltInSettingsProps {
  settings: ChefAutomationSettings
}

export function BuiltInSettings({ settings }: BuiltInSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local state mirrors the settings
  const [followUpEnabled, setFollowUpEnabled] = useState(settings.follow_up_reminders_enabled)
  const [followUpHours, setFollowUpHours] = useState(settings.follow_up_reminder_interval_hours)
  const [noResponseEnabled, setNoResponseEnabled] = useState(settings.no_response_alerts_enabled)
  const [noResponseDays, setNoResponseDays] = useState(settings.no_response_threshold_days)
  const [eventApproachingEnabled, setEventApproachingEnabled] = useState(
    settings.event_approaching_alerts_enabled
  )
  const [eventApproachingHours, setEventApproachingHours] = useState(
    settings.event_approaching_hours
  )
  const [inquiryExpiryEnabled, setInquiryExpiryEnabled] = useState(
    settings.inquiry_auto_expiry_enabled
  )
  const [inquiryExpiryDays, setInquiryExpiryDays] = useState(settings.inquiry_expiry_days)
  const [quoteExpiryEnabled, setQuoteExpiryEnabled] = useState(settings.quote_auto_expiry_enabled)
  const [clientRemindersEnabled, setClientRemindersEnabled] = useState(
    settings.client_event_reminders_enabled
  )
  const [timeTrackingEnabled, setTimeTrackingEnabled] = useState(
    settings.time_tracking_reminders_enabled
  )
  const [receiptUploadEnabled, setReceiptUploadEnabled] = useState(
    settings.receipt_upload_reminders_enabled ?? true
  )
  const [closureDeadlineEnabled, setClosureDeadlineEnabled] = useState(
    settings.closure_deadline_alerts_enabled ?? true
  )
  const [closureDeadlineDays, setClosureDeadlineDays] = useState(
    settings.closure_deadline_days ?? 3
  )
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(
    settings.weekly_summary_enabled ?? false
  )
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(
    settings.auto_response_template_enabled ?? false
  )
  const [autoResponseTemplate, setAutoResponseTemplate] = useState(
    settings.inquiry_auto_response_template ?? ''
  )
  // Deposit default preferences
  const [depositEnabled, setDepositEnabled] = useState(settings.default_deposit_enabled ?? false)
  const [depositType, setDepositType] = useState<'percentage' | 'fixed'>(
    settings.default_deposit_type ?? 'percentage'
  )
  const [depositPercentage, setDepositPercentage] = useState(
    settings.default_deposit_percentage ?? 0
  )
  const [depositFixedDollars, setDepositFixedDollars] = useState(
    (settings.default_deposit_amount_cents ?? 0) / 100
  )
  // Pre-event reminder interval toggles
  const [reminder30d, setReminder30d] = useState(settings.event_reminder_30d_enabled ?? true)
  const [reminder14d, setReminder14d] = useState(settings.event_reminder_14d_enabled ?? true)
  const [reminder7d, setReminder7d] = useState(settings.event_reminder_7d_enabled ?? true)
  const [reminder2d, setReminder2d] = useState(settings.event_reminder_2d_enabled ?? true)
  const [reminder1d, setReminder1d] = useState(settings.event_reminder_1d_enabled ?? true)

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateAutomationSettings({
          follow_up_reminders_enabled: followUpEnabled,
          follow_up_reminder_interval_hours: followUpHours,
          no_response_alerts_enabled: noResponseEnabled,
          no_response_threshold_days: noResponseDays,
          event_approaching_alerts_enabled: eventApproachingEnabled,
          event_approaching_hours: eventApproachingHours,
          inquiry_auto_expiry_enabled: inquiryExpiryEnabled,
          inquiry_expiry_days: inquiryExpiryDays,
          quote_auto_expiry_enabled: quoteExpiryEnabled,
          client_event_reminders_enabled: clientRemindersEnabled,
          time_tracking_reminders_enabled: timeTrackingEnabled,
          receipt_upload_reminders_enabled: receiptUploadEnabled,
          closure_deadline_alerts_enabled: closureDeadlineEnabled,
          closure_deadline_days: closureDeadlineDays,
          weekly_summary_enabled: weeklySummaryEnabled,
          auto_response_template_enabled: autoResponseEnabled,
          inquiry_auto_response_template: autoResponseTemplate || null,
          // Deposit defaults
          default_deposit_enabled: depositEnabled,
          default_deposit_type: depositType,
          default_deposit_percentage: depositPercentage,
          default_deposit_amount_cents: Math.round(depositFixedDollars * 100),
          // Reminder intervals
          event_reminder_30d_enabled: reminder30d,
          event_reminder_14d_enabled: reminder14d,
          event_reminder_7d_enabled: reminder7d,
          event_reminder_2d_enabled: reminder2d,
          event_reminder_1d_enabled: reminder1d,
        })
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Built-in Automations</CardTitle>
            <p className="text-sm text-stone-500 mt-0.5">
              These run automatically in the background. Toggle any you don&apos;t need.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave} loading={isPending}>
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Follow-up Reminders */}
        <SettingRow
          enabled={followUpEnabled}
          onToggle={setFollowUpEnabled}
          title="Follow-up Reminders"
          description="Notifies you when an inquiry is waiting for your follow-up."
        >
          {followUpEnabled && (
            <InlineParam label="Remind every">
              <NumberInput
                value={followUpHours}
                onChange={setFollowUpHours}
                min={1}
                max={336}
                suffix="hours"
              />
            </InlineParam>
          )}
        </SettingRow>

        {/* No-Response Alerts */}
        <SettingRow
          enabled={noResponseEnabled}
          onToggle={setNoResponseEnabled}
          title="No-Response Alerts"
          description="Alerts you when a client hasn't responded and the conversation has gone quiet."
        >
          {noResponseEnabled && (
            <InlineParam label="Alert after">
              <NumberInput
                value={noResponseDays}
                onChange={setNoResponseDays}
                min={1}
                max={30}
                suffix="days of silence"
              />
            </InlineParam>
          )}
        </SettingRow>

        {/* Event Approach Alerts */}
        <SettingRow
          enabled={eventApproachingEnabled}
          onToggle={setEventApproachingEnabled}
          title="Event Approach Alerts"
          description="Fires your custom rules when a confirmed event is getting close."
        >
          {eventApproachingEnabled && (
            <InlineParam label="Alert when within">
              <NumberInput
                value={eventApproachingHours}
                onChange={setEventApproachingHours}
                min={1}
                max={168}
                suffix="hours"
              />
            </InlineParam>
          )}
        </SettingRow>

        {/* Inquiry Auto-Expiry */}
        <SettingRow
          enabled={inquiryExpiryEnabled}
          onToggle={setInquiryExpiryEnabled}
          title="Inquiry Auto-Expiry"
          description="Automatically marks inquiries as expired when a client goes silent for too long."
        >
          {inquiryExpiryEnabled && (
            <InlineParam label="Expire after">
              <NumberInput
                value={inquiryExpiryDays}
                onChange={setInquiryExpiryDays}
                min={7}
                max={365}
                suffix="days of no activity"
              />
            </InlineParam>
          )}
        </SettingRow>

        {/* Quote Auto-Expiry */}
        <SettingRow
          enabled={quoteExpiryEnabled}
          onToggle={setQuoteExpiryEnabled}
          title="Quote Auto-Expiry"
          description="Automatically marks sent quotes as expired once their expiry date passes."
        />

        {/* Client Pre-Event Reminders */}
        <SettingRow
          enabled={clientRemindersEnabled}
          onToggle={setClientRemindersEnabled}
          title="Client Pre-Event Reminders"
          description="Sends your clients automated reminder emails before their event. Choose which intervals to use."
        >
          {clientRemindersEnabled && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-stone-400 mb-2">
                Each reminder fires once per event. Uncheck any you don&apos;t want.
              </p>
              {[
                { label: '30 days before', state: reminder30d, setter: setReminder30d },
                { label: '14 days before', state: reminder14d, setter: setReminder14d },
                { label: '7 days before (prep email)', state: reminder7d, setter: setReminder7d },
                { label: '2 days before', state: reminder2d, setter: setReminder2d },
                { label: '1 day before', state: reminder1d, setter: setReminder1d },
              ].map(({ label, state, setter }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={state}
                    onChange={(e) => setter(e.target.checked)}
                    aria-label={label}
                    className="rounded border-stone-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </SettingRow>

        {/* Default Deposit on New Events */}
        <SettingRow
          enabled={depositEnabled}
          onToggle={setDepositEnabled}
          title="Default Deposit on New Events"
          description="Auto-fills the deposit amount when you create a new event. You can always change or remove it."
        >
          {depositEnabled && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="deposit-type"
                    checked={depositType === 'percentage'}
                    onChange={() => setDepositType('percentage')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  Percentage of quote
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="deposit-type"
                    checked={depositType === 'fixed'}
                    onChange={() => setDepositType('fixed')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  Fixed amount
                </label>
              </div>
              {depositType === 'percentage' ? (
                <InlineParam label="Deposit">
                  <NumberInput
                    value={depositPercentage}
                    onChange={setDepositPercentage}
                    min={1}
                    max={100}
                    suffix="% of quoted price"
                  />
                </InlineParam>
              ) : (
                <InlineParam label="Deposit">
                  <span className="text-xs">$</span>
                  <input
                    type="number"
                    value={depositFixedDollars}
                    min={1}
                    step={1}
                    onChange={(e) => setDepositFixedDollars(parseFloat(e.target.value) || 0)}
                    className="w-20 border border-stone-300 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </InlineParam>
              )}
            </div>
          )}
        </SettingRow>

        {/* Time Tracking Reminders */}
        <SettingRow
          enabled={timeTrackingEnabled}
          onToggle={setTimeTrackingEnabled}
          title="Time-Tracking Reminders"
          description="Nudges you to log hours when a timer has been running a long time or an event is done."
        />

        {/* Receipt Upload Reminders */}
        <SettingRow
          enabled={receiptUploadEnabled}
          onToggle={setReceiptUploadEnabled}
          title="Receipt Upload Reminders"
          description="Alerts you when a completed or in-progress event has no receipts uploaded within 24 hours."
        />

        {/* Closure Deadline Alerts */}
        <SettingRow
          enabled={closureDeadlineEnabled}
          onToggle={setClosureDeadlineEnabled}
          title="Closure Deadline Alerts"
          description="Reminds you to close out an event when it hasn't been filed within your chosen window."
        >
          {closureDeadlineEnabled && (
            <InlineParam label="Alert after">
              <NumberInput
                value={closureDeadlineDays}
                onChange={setClosureDeadlineDays}
                min={1}
                max={30}
                suffix="days after completion"
              />
            </InlineParam>
          )}
        </SettingRow>

        {/* Weekly Summary */}
        <SettingRow
          enabled={weeklySummaryEnabled}
          onToggle={setWeeklySummaryEnabled}
          title="Weekly Summary"
          description="Sends a digest every Monday with upcoming events, pending follow-ups, and key financial stats."
        />

        {/* Inquiry Auto-Responder Template */}
        <SettingRow
          enabled={autoResponseEnabled}
          onToggle={setAutoResponseEnabled}
          title="Inquiry Auto-Responder"
          description="Pre-fills your first reply when you open a new inquiry. You always review before sending."
        >
          {autoResponseEnabled && (
            <div className="mt-2">
              <label className="text-[11px] text-stone-500 mb-1 block">
                Template message (use [Name], [Date], [Occasion] as placeholders)
              </label>
              <textarea
                value={autoResponseTemplate}
                onChange={(e) => setAutoResponseTemplate(e.target.value)}
                rows={4}
                placeholder={`Hi [Name],\n\nThanks for reaching out! I'd love to learn more about your [Occasion]...`}
                className="w-full text-xs border border-stone-300 rounded-md px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                maxLength={2000}
              />
              <p className="text-[10px] text-stone-400 mt-1">
                {autoResponseTemplate.length}/2000 chars
              </p>
            </div>
          )}
        </SettingRow>
      </CardContent>
    </Card>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SettingRow({
  enabled,
  onToggle,
  title,
  description,
  children,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${enabled ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50'}`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
            enabled ? 'bg-brand-600' : 'bg-stone-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${enabled ? 'text-stone-800' : 'text-stone-400'}`}>
            {title}
          </p>
          <p className={`text-xs mt-0.5 ${enabled ? 'text-stone-500' : 'text-stone-400'}`}>
            {description}
          </p>
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </div>
  )
}

function InlineParam({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-stone-600">
      <span>{label}</span>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  suffix: string
}) {
  return (
    <>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n) && n >= min && n <= max) onChange(n)
        }}
        className="w-16 border border-stone-300 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <span>{suffix}</span>
    </>
  )
}
