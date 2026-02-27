'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  createCampaign,
  getChannelSplit,
  sendCampaignNow,
  listCampaignTemplates,
} from '@/lib/marketing/actions'
import { CAMPAIGN_TYPE_LABELS, SEGMENT_OPTIONS } from '@/lib/marketing/constants'
import { AVAILABLE_TOKENS } from '@/lib/marketing/tokens'
import type { ChannelSplit } from '@/lib/marketing/actions'

type Step = 'compose' | 'preview' | 'sent'

const CAMPAIGN_TYPES = Object.entries(CAMPAIGN_TYPE_LABELS)

export function CampaignBuilderClient() {
  const router = useRouter()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [step, setStep] = useState<Step>('compose')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [channelSplit, setChannelSplit] = useState<ChannelSplit | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showSendConfirm, setShowSendConfirm] = useState(false)

  const [form, setForm] = useState({
    name: '',
    campaign_type: 're_engagement',
    subject: '',
    body_html: '',
    segment_type: 'dormant_90_days',
    scheduled_at: '',
  })

  // Load templates on mount
  useEffect(() => {
    setLoadingTemplates(true)
    listCampaignTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoadingTemplates(false))
  }, [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function applyTemplate(t: any) {
    setForm((prev) => ({
      ...prev,
      campaign_type: t.campaign_type,
      subject: t.subject,
      body_html: t.body_html,
    }))
  }

  function insertToken(token: string) {
    const ta = bodyRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newBody = form.body_html.slice(0, start) + token + form.body_html.slice(end)
    update('body_html', newBody)
    // Restore cursor
    requestAnimationFrame(() => {
      ta.selectionStart = start + token.length
      ta.selectionEnd = start + token.length
      ta.focus()
    })
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const id = await createCampaign({
        name: form.name,
        campaign_type: form.campaign_type as any,
        subject: form.subject,
        body_html: form.body_html,
        target_segment: { type: form.segment_type },
        ...(showSchedule && form.scheduled_at ? { scheduled_at: form.scheduled_at } : {}),
      })
      setCampaignId(id)

      const split = await getChannelSplit({ type: form.segment_type })
      setChannelSplit(split)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleSend() {
    if (!campaignId) return
    setShowSendConfirm(true)
  }

  async function handleConfirmedSend() {
    if (!campaignId) return
    setShowSendConfirm(false)
    setSaving(true)
    setError(null)
    try {
      await sendCampaignNow(campaignId)
      setStep('sent')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStep('compose')
    setCampaignId(null)
    setChannelSplit(null)
    setForm({
      name: '',
      campaign_type: 're_engagement',
      subject: '',
      body_html: '',
      segment_type: 'dormant_90_days',
      scheduled_at: '',
    })
  }

  // ---- SENT ----
  if (step === 'sent') {
    return (
      <div className="text-center py-6">
        <p className="text-lg font-semibold text-stone-100">Campaign sent!</p>
        <p className="text-sm text-stone-500 mt-1">Your emails are on their way.</p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={reset}>
          Create another
        </Button>
      </div>
    )
  }

  // ---- PREVIEW ----
  if (step === 'preview' && channelSplit) {
    const emailCount = channelSplit.email.length
    const smsCount = channelSplit.sms.length
    const callCount = channelSplit.call.length
    const instaCount = channelSplit.instagram.length
    const noMethodCount = channelSplit.no_method.length
    const isScheduled = showSchedule && form.scheduled_at

    return (
      <div className="space-y-4">
        {/* Message preview */}
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
          <p className="text-sm font-semibold text-stone-100">{form.name}</p>
          <p className="text-xs text-stone-500">Subject: {form.subject}</p>
          <div className="mt-3 border border-stone-700 rounded p-3 bg-stone-900 text-xs text-stone-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {form.body_html}
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Channel breakdown
          </p>

          {emailCount > 0 && (
            <ChannelRow
              icon="✉"
              count={emailCount}
              label="will receive this by email automatically"
              color="text-blue-600"
            />
          )}
          {smsCount > 0 && (
            <div className="space-y-1">
              <ChannelRow
                icon="💬"
                count={smsCount}
                label="prefer text — see SMS queue below"
                color="text-emerald-600"
              />
              <div className="ml-6 pl-2 border-l border-stone-700">
                <p className="text-xs text-stone-500 mb-1">Draft SMS to send:</p>
                <pre className="whitespace-pre-wrap text-xs text-stone-400 bg-stone-800 p-2 rounded">
                  {form.body_html.slice(0, 160)}
                </pre>
                <p className="text-xs text-stone-400 mt-1">
                  {channelSplit.sms.map((c) => c.full_name).join(', ')}
                </p>
              </div>
            </div>
          )}
          {callCount > 0 && (
            <div className="space-y-1">
              <ChannelRow
                icon="📞"
                count={callCount}
                label="prefer phone calls — call list:"
                color="text-amber-600"
              />
              <div className="ml-6 pl-2 border-l border-stone-700">
                <p className="text-xs text-stone-500">
                  {channelSplit.call
                    .map((c) => c.full_name + (c.phone ? ` (${c.phone})` : ''))
                    .join(' · ')}
                </p>
              </div>
            </div>
          )}
          {instaCount > 0 && (
            <div className="space-y-1">
              <ChannelRow
                icon="📸"
                count={instaCount}
                label="prefer Instagram — DM copy ready:"
                color="text-purple-600"
              />
              <div className="ml-6 pl-2 border-l border-stone-700">
                <pre className="whitespace-pre-wrap text-xs text-stone-400 bg-stone-800 p-2 rounded">
                  {form.body_html.slice(0, 300)}
                </pre>
                <p className="text-xs text-stone-400 mt-1">
                  {channelSplit.instagram.map((c) => c.full_name).join(', ')}
                </p>
              </div>
            </div>
          )}
          {noMethodCount > 0 && (
            <ChannelRow
              icon="—"
              count={noMethodCount}
              label="no preference set → defaulting to email"
              color="text-stone-400"
            />
          )}
          {emailCount === 0 &&
            smsCount === 0 &&
            callCount === 0 &&
            instaCount === 0 &&
            noMethodCount === 0 && (
              <p className="text-xs text-amber-600">No clients match this segment.</p>
            )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 flex-wrap">
          {isScheduled ? (
            <Button disabled={saving}>
              {saving
                ? 'Scheduling…'
                : `Schedule for ${new Date(form.scheduled_at).toLocaleString()}`}
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={saving || emailCount === 0}>
              {saving ? 'Sending…' : `Send to ${emailCount} clients by email`}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setStep('compose')}>
            ← Edit
          </Button>
        </div>

        {smsCount > 0 || callCount > 0 || instaCount > 0 ? (
          <p className="text-xs text-stone-400">
            Non-email clients require manual outreach — their preferred channels are shown above.
          </p>
        ) : null}

        <ConfirmModal
          open={showSendConfirm}
          title="Send campaign now?"
          description={`Send to ${channelSplit?.email.length ?? 0} clients by email now?`}
          confirmLabel="Send"
          variant="primary"
          loading={saving}
          onConfirm={handleConfirmedSend}
          onCancel={() => setShowSendConfirm(false)}
        />
      </div>
    )
  }

  // ---- COMPOSE ----
  return (
    <form onSubmit={handlePreview} className="space-y-4">
      {/* Template picker */}
      {!loadingTemplates && templates.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Start from a template (optional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {templates.slice(0, 6).map((t: any) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="text-left rounded-md border border-stone-700 bg-stone-800 hover:bg-stone-700 px-3 py-2 text-xs transition-colors"
              >
                <span className="font-medium text-stone-200 block truncate">{t.name}</span>
                <span className="text-stone-400 truncate block">{t.subject}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Campaign name *</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Spring re-engagement 2026"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
          <select
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
            title="Campaign type"
            value={form.campaign_type}
            onChange={(e) => update('campaign_type', e.target.value)}
          >
            {CAMPAIGN_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Audience</label>
          <select
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
            title="Audience segment"
            value={form.segment_type}
            onChange={(e) => update('segment_type', e.target.value)}
          >
            {SEGMENT_OPTIONS.filter((s) => s.value !== 'client_ids').map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Subject *</label>
          <Input
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder="Spring is here — let's plan your next dinner"
            required
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-stone-400">Message body *</label>
            {/* Token toolbar */}
            <div className="flex gap-1 flex-wrap justify-end">
              {AVAILABLE_TOKENS.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken(t.token)}
                  className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-400 rounded px-1.5 py-0.5 transition-colors font-mono"
                  title={`Insert ${t.token}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={bodyRef}
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm min-h-[160px] resize-y font-mono"
            value={form.body_html}
            onChange={(e) => update('body_html', e.target.value)}
            placeholder={`Hi {{first_name}},\n\nWrite your message here. Plain text is perfect.\n\n{{chef_name}}`}
            required
          />
          <p className="text-xs text-stone-400 mt-1">
            Use tokens like <code className="bg-stone-800 px-1 rounded">{'{{first_name}}'}</code> —
            they get replaced with each client&apos;s real name before sending.
          </p>
        </div>
      </div>

      {/* Schedule toggle */}
      <div>
        <button
          type="button"
          className="text-xs text-stone-500 hover:text-stone-300 underline"
          onClick={() => setShowSchedule((v) => !v)}
        >
          {showSchedule ? 'Send immediately (remove schedule)' : '+ Schedule for a future date'}
        </button>
        {showSchedule && (
          <div className="mt-2">
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => update('scheduled_at', new Date(e.target.value).toISOString())}
              className="w-auto text-sm"
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Preview & audience split →'}
      </Button>
    </form>
  )
}

function ChannelRow({
  icon,
  count,
  label,
  color,
}: {
  icon: string
  count: number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-bold ${color}`}>
        {icon} {count}
      </span>
      <span className="text-stone-400">
        {count === 1 ? 'client' : 'clients'} {label}
      </span>
    </div>
  )
}
