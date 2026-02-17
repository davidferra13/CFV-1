'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMessage, getResponseTemplates } from '@/lib/messages/actions'
import type { CreateMessageInput } from '@/lib/messages/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

type Template = {
  id: string
  name: string
  template_text: string
  category: string | null
}

interface MessageLogFormProps {
  inquiryId?: string
  eventId?: string
  clientId?: string
  templates?: Template[]
}

const CHANNEL_OPTIONS: { value: CreateMessageInput['channel']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'take_a_chef', label: 'Take a Chef' },
  { value: 'phone', label: 'Phone' },
  { value: 'internal_note', label: 'Internal Note' },
]

export function MessageLogForm({ inquiryId, eventId, clientId, templates = [] }: MessageLogFormProps) {
  const router = useRouter()
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound')
  const [channel, setChannel] = useState<CreateMessageInput['channel']>('text')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [sentAt, setSentAt] = useState(
    new Date().toISOString().substring(0, 16)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createMessage({
        body,
        direction,
        channel,
        inquiry_id: inquiryId ?? null,
        event_id: eventId ?? null,
        client_id: clientId ?? null,
        subject: channel === 'email' ? subject || null : null,
        sent_at: sentAt ? new Date(sentAt).toISOString() : null,
        status: 'logged',
      })

      // Reset form
      setBody('')
      setSubject('')
      setSentAt(new Date().toISOString().substring(0, 16))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log message')
    } finally {
      setLoading(false)
    }
  }

  function applyTemplate(template: Template) {
    setBody(template.template_text)
    setShowTemplates(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Direction Toggle */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setDirection('outbound')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            direction === 'outbound'
              ? 'bg-white text-stone-900 shadow-sm font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          I sent
        </button>
        <button
          type="button"
          onClick={() => setDirection('inbound')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            direction === 'inbound'
              ? 'bg-white text-stone-900 shadow-sm font-medium'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          I received
        </button>
      </div>

      {/* Channel + Date Row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-stone-500 block mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as CreateMessageInput['channel'])}
            title="Communication channel"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-stone-500 block mb-1">When</label>
          <input
            type="datetime-local"
            value={sentAt}
            onChange={(e) => setSentAt(e.target.value)}
            title="Date and time of message"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Email Subject (conditional) */}
      {channel === 'email' && (
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Message Body */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-stone-500">Message</label>
          {templates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Use Template
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-6 z-10 w-64 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0"
                    >
                      <span className="font-medium text-stone-900">{t.name}</span>
                      <span className="block text-xs text-stone-500 truncate mt-0.5">
                        {t.template_text.substring(0, 60)}...
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            direction === 'outbound'
              ? 'What did you send? (can be a summary)'
              : 'What did you receive? (can be a summary)'
          }
          rows={3}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          required
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={loading || !body.trim()}>
          {loading ? 'Logging...' : 'Log Message'}
        </Button>
      </div>
    </form>
  )
}
