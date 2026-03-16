'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Send, X, ChevronDown } from '@/components/ui/icons'
import { toast } from 'sonner'

interface EmailComposerProps {
  toEmail: string
  toName: string
  defaultSubject?: string
  defaultBody?: string
  onClose?: () => void
  onSent?: () => void
}

const EMAIL_TEMPLATES = [
  {
    label: 'Follow-Up After Event',
    subject: 'Thank you for a wonderful evening!',
    body: 'Hi {{name}},\n\nIt was such a pleasure cooking for you and your guests last night...',
  },
  {
    label: 'Quote Follow-Up',
    subject: 'Following up on your event quote',
    body: 'Hi {{name}},\n\nI wanted to check in on the proposal I sent over...',
  },
  {
    label: 'Booking Confirmation',
    subject: 'Your event is confirmed!',
    body: 'Hi {{name}},\n\nExciting news - your event is officially confirmed...',
  },
]

export function EmailComposer({
  toEmail,
  toName,
  defaultSubject = '',
  defaultBody = '',
  onClose,
  onSent,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isPending, startTransition] = useTransition()

  function applyTemplate(template: (typeof EMAIL_TEMPLATES)[0]) {
    setSubject(template.subject)
    setBody(template.body.replace('{{name}}', toName.split(' ')[0]))
    setShowTemplates(false)
  }

  function handleSend() {
    if (!subject.trim()) return toast.error('Subject is required')
    if (!body.trim()) return toast.error('Message body is required')

    startTransition(async () => {
      try {
        // In production, this would call a server action to send via Resend
        // For now, open the default email client as a fallback
        const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.open(mailto, '_blank')
        toast.success('Opening your email client...')
        onSent?.()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="border border-stone-700 rounded-xl bg-stone-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-b border-stone-700">
        <span className="text-sm font-semibold text-stone-300">New Email</span>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs text-brand-600 hover:text-brand-400 flex items-center gap-1"
            >
              Templates
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-stone-900 border border-stone-700 rounded-lg shadow-lg z-10">
                {EMAIL_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-stone-800 border-b border-stone-800 last:border-0"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-stone-400 hover:text-stone-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* To field */}
      <div className="px-4 py-2 border-b border-stone-800">
        <span className="text-xs text-stone-500 mr-2">To:</span>
        <span className="text-sm text-stone-200">
          {toName} &lt;{toEmail}&gt;
        </span>
      </div>

      {/* Subject */}
      <div className="px-4 py-2 border-b border-stone-800">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full text-sm focus:outline-none text-stone-100"
        />
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        className="w-full px-4 py-3 text-sm text-stone-200 focus:outline-none resize-none min-h-[160px]"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-t border-stone-700">
        <p className="text-xs text-stone-400">Opens in your email app</p>
        <Button onClick={handleSend} loading={isPending} size="sm">
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Send
        </Button>
      </div>
    </div>
  )
}
