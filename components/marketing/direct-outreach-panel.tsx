'use client'

// Direct Outreach Panel
// Shown on individual client profile pages. Lets the chef send a 1:1 email,
// SMS, or log a call/Instagram note — all stored in direct_outreach_log.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendDirectOutreach } from '@/lib/marketing/actions'
import { format } from 'date-fns'

type Channel = 'email' | 'sms' | 'call_note' | 'instagram_note'

const CHANNEL_OPTIONS: Array<{ value: Channel; label: string; icon: string; note?: string }> = [
  { value: 'email', label: 'Email', icon: '✉' },
  { value: 'sms', label: 'Text (SMS)', icon: '💬' },
  {
    value: 'call_note',
    label: 'Log a call',
    icon: '📞',
    note: 'Saves a record — does not place a call',
  },
  {
    value: 'instagram_note',
    label: 'Instagram note',
    icon: '📸',
    note: 'Saves a record — copy and paste into Instagram',
  },
]

const CHANNEL_ICON: Record<string, string> = {
  email: '✉',
  sms: '💬',
  call_note: '📞',
  instagram_note: '📸',
}

type OutreachRecord = {
  id: string
  channel: string
  subject: string | null
  body: string
  delivered: boolean | null
  error_msg: string | null
  sent_at: string
}

export function DirectOutreachPanel({
  clientId,
  clientEmail,
  clientPhone,
  preferredContactMethod,
  history,
}: {
  clientId: string
  clientEmail: string | null
  clientPhone: string | null
  preferredContactMethod: string | null
  history: OutreachRecord[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Default to preferred contact method if available
  const defaultChannel = (() => {
    const m = preferredContactMethod?.toLowerCase()
    if (m === 'text' || m === 'sms') return 'sms'
    if (m === 'instagram') return 'instagram_note'
    if (m === 'phone') return 'call_note'
    return 'email'
  })() as Channel

  const [channel, setChannel] = useState<Channel>(defaultChannel)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const needsSubject = channel === 'email'
  const bodyPlaceholder =
    channel === 'email'
      ? 'Write your message here…'
      : channel === 'sms'
        ? 'Keep it brief (160 chars max for one segment)'
        : channel === 'call_note'
          ? 'What did you discuss? Any follow-ups?'
          : 'What did you DM them?'

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await sendDirectOutreach({ clientId, channel, subject: subject || undefined, body })
      setSent(true)
      setBody('')
      setSubject('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      {!open && !sent && (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {CHANNEL_ICON[defaultChannel]} Send message
        </Button>
      )}

      {sent && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-700">Message sent.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSent(false)
              setOpen(true)
            }}
          >
            Send another
          </Button>
        </div>
      )}

      {/* Compose form */}
      {open && !sent && (
        <form
          onSubmit={handleSend}
          className="space-y-3 rounded-lg border border-stone-700 p-4 bg-stone-800"
        >
          {/* Channel selector */}
          <div className="flex gap-2 flex-wrap">
            {CHANNEL_OPTIONS.map((opt) => {
              const unavailable =
                (opt.value === 'email' && !clientEmail) || (opt.value === 'sms' && !clientPhone)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !unavailable && setChannel(opt.value)}
                  disabled={unavailable}
                  title={unavailable ? 'No contact info available' : opt.note}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                    channel === opt.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : unavailable
                        ? 'bg-stone-800 text-stone-300 border-stone-800 cursor-not-allowed'
                        : 'bg-surface text-stone-300 border-stone-700 hover:border-stone-600'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              )
            })}
          </div>

          {/* Channel note */}
          {CHANNEL_OPTIONS.find((o) => o.value === channel)?.note && (
            <p className="text-xs text-stone-400">
              {CHANNEL_OPTIONS.find((o) => o.value === channel)?.note}
            </p>
          )}

          {/* Subject (email only) */}
          {needsSubject && (
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="A note from your chef"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              {channel === 'call_note'
                ? 'Call notes'
                : channel === 'instagram_note'
                  ? 'Instagram DM content'
                  : 'Message'}
            </label>
            <textarea
              className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm min-h-[100px] resize-y"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={bodyPlaceholder}
              required
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !body.trim()}>
              {saving
                ? 'Sending…'
                : channel === 'call_note'
                  ? 'Log call'
                  : channel === 'instagram_note'
                    ? 'Log note'
                    : 'Send'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Outreach history */}
      {history.length > 0 && (
        <div className="space-y-1.5 mt-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            Outreach history
          </p>
          {history.map((record) => (
            <div
              key={record.id}
              className="flex items-start gap-2 text-xs text-stone-400 rounded-md border border-stone-800 bg-surface px-3 py-2"
            >
              <span className="shrink-0">{CHANNEL_ICON[record.channel] ?? '•'}</span>
              <div className="min-w-0 flex-1">
                {record.subject && (
                  <p className="font-medium text-stone-200 truncate">{record.subject}</p>
                )}
                <p className="text-stone-500 truncate">{record.body.slice(0, 120)}</p>
              </div>
              <div className="shrink-0 text-right text-stone-400">
                <p>{format(new Date(record.sent_at), 'MMM d')}</p>
                {record.delivered === false && <p className="text-red-400">Failed</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
