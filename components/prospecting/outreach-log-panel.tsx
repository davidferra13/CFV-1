'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logOutreach } from '@/lib/prospecting/pipeline-actions'
import type { OutreachLogEntry } from '@/lib/prospecting/types'
import { OUTREACH_TYPE_LABELS } from '@/lib/prospecting/constants'
import type { OutreachType } from '@/lib/prospecting/constants'
import {
  Mail,
  Phone,
  MailPlus,
  MessageSquare,
  CalendarCheck,
  Inbox,
  Plus,
  Loader2,
  Send,
} from '@/components/ui/icons'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

const OUTREACH_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5 text-purple-400" />,
  call: <Phone className="h-3.5 w-3.5 text-green-400" />,
  follow_up_email: <MailPlus className="h-3.5 w-3.5 text-indigo-400" />,
  response_received: <Inbox className="h-3.5 w-3.5 text-cyan-400" />,
  meeting_scheduled: <CalendarCheck className="h-3.5 w-3.5 text-amber-400" />,
  note: <MessageSquare className="h-3.5 w-3.5 text-stone-400" />,
}

interface OutreachLogPanelProps {
  prospectId: string
  log: OutreachLogEntry[]
}

export function OutreachLogPanel({ prospectId, log }: OutreachLogPanelProps) {
  const [entries, setEntries] = useState(log)
  const [showAddForm, setShowAddForm] = useState(false)
  const [outreachType, setOutreachType] = useState<string>('email')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAddOutreach() {
    if (!notes.trim() && outreachType === 'note') return
    startTransition(async () => {
      try {
        await logOutreach(prospectId, outreachType, { notes: notes || undefined })
        // Optimistic add
        setEntries((prev) => [
          {
            id: crypto.randomUUID(),
            prospect_id: prospectId,
            chef_id: '',
            outreach_type: outreachType as OutreachLogEntry['outreach_type'],
            sequence_number: null,
            subject: null,
            body: null,
            outcome: null,
            notes: notes || null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
        setShowAddForm(false)
        setNotes('')
        setOutreachType('email')
        router.refresh()
      } catch {
        // silently fail - user can retry
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4 text-brand-500" />
            Outreach Activity Log
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Log Activity
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add outreach form */}
        {showAddForm && (
          <div className="rounded-lg bg-stone-800 p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  'email',
                  'call',
                  'follow_up_email',
                  'response_received',
                  'meeting_scheduled',
                  'note',
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOutreachType(type)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    outreachType === type
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {OUTREACH_ICONS[type]}
                  {OUTREACH_TYPE_LABELS[type as OutreachType]}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about this outreach activity..."
              rows={2}
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddOutreach} disabled={isPending}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Log
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {entries.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-2">No outreach activity logged yet.</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-lg bg-stone-800/50 px-3 py-2"
              >
                <span className="mt-0.5">
                  {OUTREACH_ICONS[entry.outreach_type] || OUTREACH_ICONS.note}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-300">
                      {OUTREACH_TYPE_LABELS[entry.outreach_type as OutreachType] ||
                        entry.outreach_type}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {entry.notes && <p className="text-xs text-stone-400 mt-0.5">{entry.notes}</p>}
                  {entry.subject && (
                    <p className="text-xs text-stone-400 mt-0.5 italic">Subject: {entry.subject}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
