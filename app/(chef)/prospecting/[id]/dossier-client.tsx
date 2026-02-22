'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  updateProspect,
  updateProspectStatus,
  deleteProspect,
  addProspectNote,
} from '@/lib/prospecting/actions'
import type { Prospect, ProspectNote } from '@/lib/prospecting/types'
import { logProspectCall, convertProspectToInquiry } from '@/lib/prospecting/queue-actions'
import type { CallScript } from '@/lib/prospecting/types'
import {
  PROSPECT_CATEGORY_LABELS,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
  CALL_OUTCOMES,
  NOTE_TYPES,
} from '@/lib/prospecting/constants'
import type { ProspectCategory, ProspectStatus } from '@/lib/prospecting/constants'
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Shield,
  Target,
  MessageSquare,
  Star,
  ExternalLink,
  Loader2,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface DossierProps {
  prospect: Prospect
  notes: ProspectNote[]
  script: CallScript | null
}

export function ProspectDossierClient({
  prospect: initialProspect,
  notes: initialNotes,
  script,
}: DossierProps) {
  const router = useRouter()
  const [prospect, setProspect] = useState(initialProspect)
  const [notes, setNotes] = useState(initialNotes)
  const [isPending, startTransition] = useTransition()

  // Call logging state
  const [showCallLog, setShowCallLog] = useState(false)
  const [callOutcome, setCallOutcome] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [followUpDays, setFollowUpDays] = useState(3)

  // Note adding state
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')

  const categoryLabel =
    PROSPECT_CATEGORY_LABELS[prospect.category as ProspectCategory] ?? prospect.category
  const statusLabel = PROSPECT_STATUS_LABELS[prospect.status as ProspectStatus] ?? prospect.status
  const statusColor = PROSPECT_STATUS_COLORS[prospect.status as ProspectStatus] ?? 'default'

  function handleLogCall() {
    if (!callOutcome) return
    startTransition(async () => {
      const outcome = CALL_OUTCOMES.find((o) => o.value === callOutcome)
      const result = await logProspectCall(
        prospect.id,
        callOutcome,
        callNotes || undefined,
        outcome?.nextStatus === 'follow_up' ? followUpDays : undefined
      )
      setProspect((prev) => ({
        ...prev,
        status: result.newStatus,
        call_count: prev.call_count + 1,
        last_called_at: new Date().toISOString(),
        last_outcome: CALL_OUTCOMES.find((o) => o.value === callOutcome)?.label ?? callOutcome,
      }))
      setShowCallLog(false)
      setCallOutcome('')
      setCallNotes('')
      router.refresh()
    })
  }

  function handleAddNote() {
    if (!newNote.trim()) return
    startTransition(async () => {
      const result = await addProspectNote(prospect.id, newNote.trim(), noteType)
      setNotes((prev) => [result.note, ...prev])
      setNewNote('')
      setNoteType('general')
    })
  }

  function handleConvert() {
    if (
      !confirm(
        'Convert this prospect to an inquiry? This will create a new inquiry linked to this prospect.'
      )
    )
      return
    startTransition(async () => {
      const result = await convertProspectToInquiry(prospect.id)
      setProspect((prev) => ({
        ...prev,
        status: 'converted',
        converted_to_inquiry_id: result.inquiryId,
        converted_at: new Date().toISOString(),
      }))
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Delete this prospect permanently? This cannot be undone.')) return
    startTransition(async () => {
      await deleteProspect(prospect.id)
      router.push('/prospecting')
    })
  }

  const socialProfiles = prospect.social_profiles ?? {}
  const hasSocials = Object.values(socialProfiles).some((v) => v)

  return (
    <>
      {/* Back button + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/prospecting')}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prospects
          </button>
          <div className="flex items-center gap-3">
            {prospect.prospect_type === 'organization' ? (
              <Building2 className="h-6 w-6 text-stone-400" />
            ) : (
              <User className="h-6 w-6 text-stone-400" />
            )}
            <h1 className="text-2xl">{prospect.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={statusColor as any}>{statusLabel}</Badge>
            <Badge variant="default">{categoryLabel}</Badge>
            {prospect.priority === 'high' && <Badge variant="warning">High Priority</Badge>}
            {prospect.priority === 'low' && <Badge variant="info">Low Priority</Badge>}
            {prospect.source === 'web_enriched' && (
              <span className="text-xs text-green-600 font-medium">Web-Verified</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {prospect.status !== 'converted' && (
            <Button variant="secondary" size="sm" onClick={handleConvert} disabled={isPending}>
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              Convert to Inquiry
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Contact & Gatekeeper Intel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-500" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {prospect.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  <a
                    href={`tel:${prospect.phone}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {prospect.phone}
                  </a>
                </div>
              )}
              {prospect.contact_direct_phone &&
                prospect.contact_direct_phone !== prospect.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-green-500" />
                    <a
                      href={`tel:${prospect.contact_direct_phone}`}
                      className="text-green-700 hover:underline text-xs"
                    >
                      Direct: {prospect.contact_direct_phone}
                    </a>
                  </div>
                )}
              {prospect.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  <a href={`mailto:${prospect.email}`} className="text-brand-600 hover:underline">
                    {prospect.email}
                  </a>
                </div>
              )}
              {prospect.contact_direct_email &&
                prospect.contact_direct_email !== prospect.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-green-500" />
                    <a
                      href={`mailto:${prospect.contact_direct_email}`}
                      className="text-green-700 hover:underline text-xs"
                    >
                      Direct: {prospect.contact_direct_email}
                    </a>
                  </div>
                )}
              {prospect.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-stone-400" />
                  <a
                    href={prospect.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline flex items-center gap-1"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {(prospect.address || prospect.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5" />
                  <span className="text-stone-600">
                    {[prospect.address, prospect.city, prospect.state, prospect.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {prospect.region && (
                <div className="text-xs text-stone-500 pl-5">Region: {prospect.region}</div>
              )}

              {/* Social profiles */}
              {hasSocials && (
                <div className="border-t border-stone-100 pt-3 mt-3 space-y-1">
                  {Object.entries(socialProfiles).map(([platform, url]) =>
                    url ? (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-brand-600 hover:underline capitalize"
                      >
                        {platform} <ExternalLink className="inline h-2.5 w-2.5" />
                      </a>
                    ) : null
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gatekeeper Intel */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                Gatekeeper Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {prospect.contact_person && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Ask For:</span>
                  <p className="text-stone-900 font-medium">{prospect.contact_person}</p>
                  {prospect.contact_title && (
                    <p className="text-xs text-stone-500">{prospect.contact_title}</p>
                  )}
                </div>
              )}
              {prospect.gatekeeper_name && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Gatekeeper:</span>
                  <p className="text-stone-700">{prospect.gatekeeper_name}</p>
                </div>
              )}
              {prospect.gatekeeper_notes && (
                <div>
                  <span className="text-xs font-medium text-stone-500">How to Get Through:</span>
                  <p className="text-stone-700">{prospect.gatekeeper_notes}</p>
                </div>
              )}
              {prospect.best_time_to_call && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-stone-700">Best time: {prospect.best_time_to_call}</span>
                </div>
              )}
              {!prospect.contact_person &&
                !prospect.gatekeeper_name &&
                !prospect.gatekeeper_notes &&
                !prospect.best_time_to_call && (
                  <p className="text-stone-400 text-xs italic">No gatekeeper intel gathered yet.</p>
                )}
            </CardContent>
          </Card>

          {/* Call Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-stone-500" />
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-stone-50 p-2 text-center">
                  <p className="text-lg font-semibold text-stone-900">{prospect.call_count}</p>
                  <p className="text-stone-500">Total Calls</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-2 text-center">
                  <p className="text-sm font-medium text-stone-900 mt-1">
                    {prospect.last_outcome ?? 'Never called'}
                  </p>
                  <p className="text-stone-500">Last Outcome</p>
                </div>
              </div>
              {prospect.last_called_at && (
                <p className="text-xs text-stone-500">
                  Last called: {format(new Date(prospect.last_called_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
              {prospect.next_follow_up_at && (
                <p className="text-xs text-amber-600 font-medium">
                  Follow-up: {format(new Date(prospect.next_follow_up_at), 'MMM d, yyyy')}
                </p>
              )}
              {prospect.converted_to_inquiry_id && (
                <a
                  href={`/inquiries/${prospect.converted_to_inquiry_id}`}
                  className="block text-xs text-green-600 hover:underline font-medium"
                >
                  View linked inquiry &rarr;
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Approach, Intelligence, Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Call Log */}
          <Card className="border-brand-200 bg-brand-50/20">
            <CardContent className="py-4">
              {!showCallLog ? (
                <div className="flex items-center gap-3">
                  {prospect.phone && (
                    <a
                      href={`tel:${prospect.contact_direct_phone || prospect.phone}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4" />
                      Call {prospect.contact_direct_phone || prospect.phone}
                    </a>
                  )}
                  <Button onClick={() => setShowCallLog(true)}>Log Call Outcome</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {CALL_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome.value}
                        onClick={() => setCallOutcome(outcome.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          callOutcome === outcome.value
                            ? 'bg-brand-600 text-white'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {outcome.label}
                      </button>
                    ))}
                  </div>
                  {callOutcome === 'spoke_follow_up' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-stone-600">Follow up in:</label>
                      <select
                        value={followUpDays}
                        onChange={(e) => setFollowUpDays(Number(e.target.value))}
                        className="rounded border border-stone-200 px-2 py-1 text-xs"
                      >
                        <option value={1}>1 day</option>
                        <option value={3}>3 days</option>
                        <option value={7}>1 week</option>
                        <option value={14}>2 weeks</option>
                        <option value={30}>1 month</option>
                      </select>
                    </div>
                  )}
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes (optional)..."
                    rows={2}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleLogCall} disabled={!callOutcome || isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Outcome
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCallLog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approach Strategy */}
          {prospect.approach_strategy && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Approach Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-800 whitespace-pre-wrap">
                  {prospect.approach_strategy}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Talking Points */}
          {prospect.talking_points && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-brand-500" />
                  Talking Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">
                  {prospect.talking_points}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Call Script */}
          {script && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4 text-stone-500" />
                  Call Script: {script.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-700 whitespace-pre-wrap font-mono bg-stone-50 rounded-lg p-3">
                  {script.script_body}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Intelligence Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-stone-500" />
                Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {prospect.description && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Description</span>
                  <p className="text-stone-700">{prospect.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {prospect.annual_events_estimate && (
                  <div className="rounded-lg bg-stone-50 p-2">
                    <span className="font-medium text-stone-500">Annual Events</span>
                    <p className="text-stone-800 mt-0.5">{prospect.annual_events_estimate}</p>
                  </div>
                )}
                {prospect.membership_size && (
                  <div className="rounded-lg bg-stone-50 p-2">
                    <span className="font-medium text-stone-500">Membership Size</span>
                    <p className="text-stone-800 mt-0.5">{prospect.membership_size}</p>
                  </div>
                )}
                {prospect.avg_event_budget && (
                  <div className="rounded-lg bg-stone-50 p-2">
                    <span className="font-medium text-stone-500">Avg Event Budget</span>
                    <p className="text-stone-800 mt-0.5">{prospect.avg_event_budget}</p>
                  </div>
                )}
                {prospect.competitors_present && (
                  <div className="rounded-lg bg-stone-50 p-2">
                    <span className="font-medium text-stone-500">Current Caterer</span>
                    <p className="text-stone-800 mt-0.5">{prospect.competitors_present}</p>
                  </div>
                )}
              </div>
              {prospect.event_types_hosted && prospect.event_types_hosted.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Event Types</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prospect.event_types_hosted.map((type) => (
                      <span
                        key={type}
                        className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.seasonal_notes && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Seasonal Notes</span>
                  <p className="text-xs text-stone-700">{prospect.seasonal_notes}</p>
                </div>
              )}
              {prospect.luxury_indicators && prospect.luxury_indicators.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Luxury Indicators</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prospect.luxury_indicators.map((ind) => (
                      <span
                        key={ind}
                        className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.tags.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-stone-500">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prospect.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-xs text-brand-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes & History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="rounded border border-stone-200 px-2 py-1 text-xs"
                  >
                    {NOTE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || isPending}>
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Add Note
                </Button>
              </div>

              {/* Notes timeline */}
              {notes.length > 0 ? (
                <div className="space-y-2 border-t border-stone-100 pt-4">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-stone-500 capitalize">
                          {note.note_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-stone-400">
                          {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic pt-2">No notes yet.</p>
              )}

              {/* Chef's personal notes from prospect record */}
              {prospect.notes && (
                <div className="border-t border-stone-100 pt-4">
                  <span className="text-xs font-medium text-stone-500">Original Notes</span>
                  <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">
                    {prospect.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
