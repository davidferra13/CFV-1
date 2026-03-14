'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sendProspectEmail } from '@/lib/prospecting/pipeline-actions'
import { Loader2, Send, CheckCircle, Mail, AlertCircle } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SendEmailPanelProps {
  prospectId: string
  prospectName: string
  recipientEmail: string | null
  draftEmail?: string | null
  gmailConnected?: boolean
}

export function SendEmailPanel({
  prospectId,
  prospectName,
  recipientEmail,
  draftEmail,
  gmailConnected = false,
}: SendEmailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState(`Introduction — Private Chef Services`)
  const [body, setBody] = useState(draftEmail ?? '')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()

  if (!recipientEmail) return null

  // Gmail not connected — show guidance instead of Send button
  if (!gmailConnected) {
    return (
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        <span>
          Connect Gmail in{' '}
          <Link
            href="/settings/integrations"
            className="text-brand-500 hover:text-brand-400 underline"
          >
            Settings &rarr; Integrations
          </Link>{' '}
          to send emails directly.
        </span>
      </div>
    )
  }

  function handleSend() {
    if (!subject.trim() || !body.trim()) return
    setResult(null)
    startTransition(async () => {
      try {
        await sendProspectEmail(prospectId, subject.trim(), body.trim())
        setResult({ success: true, message: `Email sent to ${recipientEmail}` })
        setShowForm(false)
        router.refresh()
      } catch (err) {
        setResult({
          success: false,
          message: err instanceof Error ? err.message : 'Failed to send email',
        })
      }
    })
  }

  if (!showForm) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          <Mail className="h-4 w-4 mr-1" />
          Send Email
        </Button>
        {result && (
          <span
            className={`text-xs ${result.success ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}
          >
            {result.success && <CheckCircle className="h-3 w-3" />}
            {result.message}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="border-purple-800 bg-purple-950/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="h-4 w-4 text-purple-400" />
          Send Email to {prospectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-stone-400">
          To: <span className="text-stone-200">{recipientEmail}</span>
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject..."
          className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body..."
          rows={8}
          className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-stone-500 italic">
          Review carefully before sending. This goes directly to their inbox via your connected
          Gmail.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={handleSend} disabled={!subject.trim() || !body.trim() || isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send Email
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
        {result && !result.success && <p className="text-xs text-red-400">{result.message}</p>}
      </CardContent>
    </Card>
  )
}
