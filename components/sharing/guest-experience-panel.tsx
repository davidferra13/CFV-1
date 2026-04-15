'use client'

import { useState, useTransition } from 'react'
import {
  sendDayOfGuestReminders,
  getDayOfReminderStatus,
  createGuestFeedbackForEvent,
  getGuestFeedbackForEvent,
  getGuestMessagesForEvent,
  markGuestMessageRead,
  sendDietaryConfirmations,
  getDietaryConfirmationStatus,
  getGuestDocumentsForEvent,
  createGuestDocument,
  publishGuestDocument,
  deleteGuestDocument,
  reconcileAttendance,
  getAttendanceReconciliation,
  updatePreEventContent,
} from '@/lib/sharing/actions'

type Tab =
  | 'reminders'
  | 'feedback'
  | 'messages'
  | 'dietary'
  | 'documents'
  | 'attendance'
  | 'pre-event'

export function GuestExperiencePanel({
  eventId,
  eventStatus,
}: {
  eventId: string
  eventStatus: string
}) {
  const [tab, setTab] = useState<Tab>('messages')

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'messages', label: 'Messages', show: true },
    {
      key: 'reminders',
      label: 'Reminders',
      show: ['accepted', 'paid', 'confirmed'].includes(eventStatus),
    },
    {
      key: 'dietary',
      label: 'Dietary',
      show: ['accepted', 'paid', 'confirmed'].includes(eventStatus),
    },
    {
      key: 'pre-event',
      label: 'Pre-Event',
      show: ['accepted', 'paid', 'confirmed'].includes(eventStatus),
    },
    { key: 'documents', label: 'Documents', show: true },
    { key: 'feedback', label: 'Feedback', show: ['completed'].includes(eventStatus) },
    {
      key: 'attendance',
      label: 'Attendance',
      show: ['completed', 'in_progress'].includes(eventStatus),
    },
  ]

  const visibleTabs = tabs.filter((t) => t.show)

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-700">
        <h3 className="text-sm font-semibold text-stone-100">Guest Experience</h3>
      </div>
      <div className="flex border-b border-stone-700 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'text-stone-100 border-b-2 border-emerald-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'reminders' && <RemindersTab eventId={eventId} />}
        {tab === 'feedback' && <FeedbackTab eventId={eventId} />}
        {tab === 'messages' && <MessagesTab eventId={eventId} />}
        {tab === 'dietary' && <DietaryTab eventId={eventId} />}
        {tab === 'documents' && <DocumentsTab eventId={eventId} />}
        {tab === 'attendance' && <AttendanceTab eventId={eventId} />}
        {tab === 'pre-event' && <PreEventTab eventId={eventId} />}
      </div>
    </div>
  )
}

// --- Reminders Tab ---
function RemindersTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<any>(null)
  const [result, setResult] = useState<string>('')

  function loadStatus() {
    startTransition(async () => {
      try {
        const s = await getDayOfReminderStatus(eventId)
        setStatus(s)
      } catch (err) {
        setResult('Failed to load status')
      }
    })
  }

  function sendReminders(type: 'day_before' | 'day_of') {
    startTransition(async () => {
      try {
        const r = await sendDayOfGuestReminders({ eventId, reminderType: type })
        setResult(`Queued ${r.queuedCount} of ${r.recipientCount} guests`)
        loadStatus()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed to send reminders')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">Send event reminders to confirmed guests.</p>
      <div className="flex gap-2">
        <button
          onClick={() => sendReminders('day_before')}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
        >
          Send Day-Before Reminder
        </button>
        <button
          onClick={() => sendReminders('day_of')}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
        >
          Send Day-Of Reminder
        </button>
      </div>
      {!status && (
        <button
          onClick={loadStatus}
          disabled={isPending}
          className="text-xs text-stone-400 underline"
        >
          Load send history
        </button>
      )}
      {status && (
        <div className="text-xs text-stone-400">
          Sent: {status.sent} | Pending: {status.pending} | Failed: {status.failed}
        </div>
      )}
      {result && <p className="text-xs text-emerald-400">{result}</p>}
    </div>
  )
}

// --- Feedback Tab ---
function FeedbackTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [result, setResult] = useState('')

  function load() {
    startTransition(async () => {
      try {
        const data = await getGuestFeedbackForEvent(eventId)
        setFeedback(data)
        setLoaded(true)
      } catch (err) {
        setResult('Failed to load feedback')
      }
    })
  }

  function createFeedback() {
    startTransition(async () => {
      try {
        const r = await createGuestFeedbackForEvent(eventId)
        setResult(`Created feedback requests for ${r.created} of ${r.total} guests`)
        load()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">Post-event guest satisfaction feedback.</p>
        <button
          onClick={createFeedback}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
        >
          Send Feedback Requests
        </button>
      </div>
      {!loaded && (
        <button onClick={load} disabled={isPending} className="text-xs text-stone-400 underline">
          Load responses
        </button>
      )}
      {loaded && feedback.length === 0 && (
        <p className="text-xs text-stone-500">No feedback requests sent yet.</p>
      )}
      {feedback.length > 0 && (
        <div className="space-y-2">
          {feedback.map((fb: any) => (
            <div key={fb.id} className="rounded-lg bg-stone-800 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-200 font-medium">{fb.guestName}</span>
                <span className={fb.submitted_at ? 'text-emerald-400' : 'text-stone-500'}>
                  {fb.submitted_at ? `${'★'.repeat(fb.overall_rating || 0)}` : 'Pending'}
                </span>
              </div>
              {fb.highlight_text && (
                <p className="mt-1 text-stone-400 italic">"{fb.highlight_text}"</p>
              )}
              {fb.suggestion_text && (
                <p className="mt-1 text-stone-500">Suggestion: {fb.suggestion_text}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {result && <p className="text-xs text-emerald-400">{result}</p>}
    </div>
  )
}

// --- Messages Tab ---
function MessagesTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [messages, setMessages] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  function load() {
    startTransition(async () => {
      try {
        const data = await getGuestMessagesForEvent(eventId)
        setMessages(data)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  function markRead(id: string) {
    startTransition(async () => {
      try {
        await markGuestMessageRead(id)
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, readAt: new Date().toISOString() } : m))
        )
      } catch (err) {
        console.error('[GuestExperiencePanel] markRead failed:', err)
      }
    })
  }

  if (!loaded) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-400">Messages from event guests.</p>
        <button onClick={load} disabled={isPending} className="text-xs text-stone-400 underline">
          Load messages
        </button>
      </div>
    )
  }

  if (messages.length === 0) {
    return <p className="text-xs text-stone-500">No guest messages yet.</p>
  }

  return (
    <div className="space-y-2">
      {messages.map((msg: any) => (
        <div
          key={msg.id}
          className={`rounded-lg p-3 text-xs ${msg.readAt ? 'bg-stone-800' : 'bg-stone-800 border border-emerald-800/40'}`}
        >
          <div className="flex justify-between items-start">
            <span className="text-stone-200 font-medium">{msg.guestName}</span>
            <div className="flex items-center gap-2">
              <span className="text-stone-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
              {!msg.readAt && (
                <button
                  onClick={() => markRead(msg.id)}
                  disabled={isPending}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-stone-300">{msg.message}</p>
        </div>
      ))}
    </div>
  )
}

// --- Dietary Tab ---
function DietaryTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmations, setConfirmations] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [result, setResult] = useState('')

  function load() {
    startTransition(async () => {
      try {
        const data = await getDietaryConfirmationStatus(eventId)
        setConfirmations(data)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  function sendConfirmations() {
    startTransition(async () => {
      try {
        const r = await sendDietaryConfirmations(eventId)
        setResult(`Sent to ${r.created} of ${r.total} guests with dietary info`)
        load()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">Confirm dietary needs 48-72hrs before event.</p>
        <button
          onClick={sendConfirmations}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
        >
          Send Confirmations
        </button>
      </div>
      {!loaded && (
        <button onClick={load} disabled={isPending} className="text-xs text-stone-400 underline">
          Load status
        </button>
      )}
      {loaded && confirmations.length === 0 && (
        <p className="text-xs text-stone-500">No dietary confirmations sent yet.</p>
      )}
      {confirmations.map((c: any) => (
        <div key={c.id} className="rounded-lg bg-stone-800 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-200 font-medium">{c.guestName}</span>
            <span
              className={
                c.status === 'confirmed'
                  ? 'text-emerald-400'
                  : c.status === 'updated'
                    ? 'text-amber-400'
                    : 'text-stone-500'
              }
            >
              {c.status}
            </span>
          </div>
          <p className="mt-1 text-stone-400">{c.dietary_summary}</p>
          {c.response_note && <p className="mt-1 text-stone-300 italic">"{c.response_note}"</p>}
        </div>
      ))}
      {result && <p className="text-xs text-emerald-400">{result}</p>}
    </div>
  )
}

// --- Documents Tab ---
function DocumentsTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [docs, setDocs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [docType, setDocType] = useState<string>('other')
  const [contentText, setContentText] = useState('')
  const [isPreEvent, setIsPreEvent] = useState(false)

  function load() {
    startTransition(async () => {
      try {
        const data = await getGuestDocumentsForEvent(eventId)
        setDocs(data)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  function create() {
    if (!title.trim()) return
    startTransition(async () => {
      try {
        await createGuestDocument({
          eventId,
          title: title.trim(),
          description: description.trim() || undefined,
          documentType: docType as any,
          contentText: contentText.trim() || undefined,
          isPreEvent,
          publish: true,
        })
        setTitle('')
        setDescription('')
        setContentText('')
        setShowForm(false)
        load()
      } catch (err) {
        console.error('[GuestExperiencePanel] create document failed:', err)
      }
    })
  }

  function publish(id: string) {
    startTransition(async () => {
      try {
        await publishGuestDocument(id)
        load()
      } catch (err) {
        console.error('[GuestExperiencePanel] publish failed:', err)
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteGuestDocument(id)
        load()
      } catch (err) {
        console.error('[GuestExperiencePanel] delete failed:', err)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">Share documents with event guests.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60"
        >
          {showForm ? 'Cancel' : 'Add Document'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg bg-stone-800 p-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="w-full rounded-lg bg-stone-700 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-lg bg-stone-700 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
            title="Document type"
          >
            <option value="recipe_card">Recipe Card</option>
            <option value="wine_pairing">Wine Pairing</option>
            <option value="event_photos">Event Photos</option>
            <option value="pre_event_info">Pre-Event Info</option>
            <option value="thank_you">Thank You Note</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description (optional)"
            rows={2}
            className="w-full rounded-lg bg-stone-700 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Document content (text, recipe details, notes...)"
            rows={4}
            className="w-full rounded-lg bg-stone-700 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
          <label className="flex items-center gap-2 text-xs text-stone-300">
            <input
              type="checkbox"
              checked={isPreEvent}
              onChange={(e) => setIsPreEvent(e.target.checked)}
            />
            Show before event (on countdown page)
          </label>
          <button
            onClick={create}
            disabled={isPending || !title.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 text-stone-100 disabled:opacity-50"
          >
            Create and Publish
          </button>
        </div>
      )}

      {!loaded && (
        <button onClick={load} disabled={isPending} className="text-xs text-stone-400 underline">
          Load documents
        </button>
      )}

      {loaded && docs.length === 0 && (
        <p className="text-xs text-stone-500">No documents shared yet.</p>
      )}
      {docs.map((doc: any) => (
        <div key={doc.id} className="rounded-lg bg-stone-800 p-3 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-stone-200 font-medium">{doc.title}</span>
              <span className="ml-2 text-stone-500">{doc.document_type.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex gap-2">
              {!doc.published_at && (
                <button
                  onClick={() => publish(doc.id)}
                  disabled={isPending}
                  className="text-emerald-400"
                >
                  Publish
                </button>
              )}
              <button onClick={() => remove(doc.id)} disabled={isPending} className="text-red-400">
                Delete
              </button>
            </div>
          </div>
          {doc.description && <p className="mt-1 text-stone-400">{doc.description}</p>}
          {doc.is_pre_event && (
            <span className="inline-block mt-1 text-xs text-amber-400">Pre-event</span>
          )}
          {doc.published_at && (
            <span className="inline-block mt-1 ml-2 text-xs text-emerald-400">Published</span>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Attendance Tab ---
function AttendanceTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [guests, setGuests] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [result, setResult] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})

  function load() {
    startTransition(async () => {
      try {
        const data = await getAttendanceReconciliation(eventId)
        setGuests(data)
        const initial: Record<string, string> = {}
        for (const g of data) {
          initial[g.id] = g.actual_attended || ''
        }
        setEdits(initial)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  function save() {
    const reconciliations = Object.entries(edits)
      .filter(([, status]) => status !== '')
      .map(([guestId, status]) => ({ guestId, status: status as any }))

    if (reconciliations.length === 0) return

    startTransition(async () => {
      try {
        const r = await reconcileAttendance({ eventId, reconciliations })
        setResult(`Updated ${r.updated} of ${r.total} guests`)
        load()
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  if (!loaded) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-400">Mark actual attendance after the event.</p>
        <button onClick={load} disabled={isPending} className="text-xs text-stone-400 underline">
          Load guest list
        </button>
      </div>
    )
  }

  if (guests.length === 0) {
    return <p className="text-xs text-stone-500">No attending or maybe guests to reconcile.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">Mark who actually showed up.</p>
      <div className="space-y-2">
        {guests.map((g: any) => (
          <div
            key={g.id}
            className="flex items-center justify-between rounded-lg bg-stone-800 px-3 py-2 text-xs"
          >
            <div>
              <span className="text-stone-200">{g.full_name}</span>
              <span className="ml-2 text-stone-500">RSVP: {g.rsvp_status}</span>
            </div>
            <select
              value={edits[g.id] || ''}
              onChange={(e) => setEdits((prev) => ({ ...prev, [g.id]: e.target.value }))}
              className="rounded bg-stone-700 border border-stone-600 px-2 py-1 text-xs text-stone-100"
              title={`Attendance status for ${g.full_name}`}
            >
              <option value="">Not set</option>
              <option value="attended">Attended</option>
              <option value="no_show">No-show</option>
              <option value="late">Late</option>
              <option value="left_early">Left early</option>
            </select>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
      >
        Save Attendance
      </button>
      {result && <p className="text-xs text-emerald-400">{result}</p>}
    </div>
  )
}

// --- Pre-Event Content Tab ---
function PreEventTab({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [parking, setParking] = useState('')
  const [dressCode, setDressCode] = useState('')
  const [whatToExpect, setWhatToExpect] = useState('')
  const [arrival, setArrival] = useState('')
  const [customMsg, setCustomMsg] = useState('')
  const [result, setResult] = useState('')

  function save() {
    startTransition(async () => {
      try {
        await updatePreEventContent({
          eventId,
          content: {
            parking_info: parking || undefined,
            dress_code: dressCode || undefined,
            what_to_expect: whatToExpect || undefined,
            arrival_instructions: arrival || undefined,
            custom_message: customMsg || undefined,
          },
        })
        setResult('Saved! Guests will see this on their countdown page.')
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">
        Customize what guests see on their pre-event countdown page.
      </p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-stone-300">Parking info</label>
          <input
            type="text"
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            placeholder="Street parking available on Main St."
            className="mt-1 w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
        <div>
          <label className="text-xs text-stone-300">Dress code</label>
          <input
            type="text"
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            placeholder="Smart casual"
            className="mt-1 w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
        <div>
          <label className="text-xs text-stone-300">What to expect</label>
          <textarea
            value={whatToExpect}
            onChange={(e) => setWhatToExpect(e.target.value)}
            placeholder="A multi-course seated dinner with wine pairings..."
            rows={2}
            className="mt-1 w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
        <div>
          <label className="text-xs text-stone-300">Arrival instructions</label>
          <input
            type="text"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            placeholder="Ring the bell, side entrance"
            className="mt-1 w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
        <div>
          <label className="text-xs text-stone-300">Custom message</label>
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            placeholder="Looking forward to seeing everyone!"
            rows={2}
            className="mt-1 w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-800/40 text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
      >
        Save Pre-Event Content
      </button>
      {result && <p className="text-xs text-emerald-400">{result}</p>}
    </div>
  )
}
