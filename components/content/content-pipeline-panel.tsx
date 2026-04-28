'use client'

// Content Pipeline Panel
// Shows completed events eligible for content creation.
// Chef can generate AI drafts, edit them, and mark as posted.
// AI drafts require Ollama (private data). Chef always has final say.

import { useState, useTransition, useCallback } from 'react'
import type {
  ContentReadyEvent,
  ContentDraft,
  ContentPlatform,
} from '@/lib/content/post-event-content-types'
import {
  getContentReadyEvents,
  generateContentDraft,
  saveContentDraft,
  updateContentDraft,
  updateDraftStatus,
  getEventContentDrafts,
  deleteContentDraft,
} from '@/lib/content/post-event-content-actions'

// ── Platform Config ────────────────────────────────────────────────────────

const PLATFORMS: { value: ContentPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'story', label: 'Story' },
  { value: 'blog', label: 'Blog' },
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  posted: 'Posted',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-brand-100 text-brand-800',
  posted: 'bg-green-100 text-green-800',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ContentPipelinePanel({
  initialEvents,
}: {
  initialEvents: ContentReadyEvent[]
}) {
  const [events, setEvents] = useState<ContentReadyEvent[]>(initialEvents)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform>('instagram')
  const [draftText, setDraftText] = useState('')
  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generating, startGenerating] = useTransition()
  const [saving, startSaving] = useTransition()
  const [loading, startLoading] = useTransition()

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  // Load drafts for selected event
  const loadDrafts = useCallback((eventId: string) => {
    startLoading(async () => {
      try {
        const result = await getEventContentDrafts(eventId)
        setDrafts(result)
      } catch (err) {
        console.error('[ContentPipeline] Failed to load drafts:', err)
      }
    })
  }, [])

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    setDraftText('')
    setEditingDraftId(null)
    setError(null)
    loadDrafts(eventId)
  }

  // Generate AI draft
  const handleGenerate = () => {
    if (!selectedEventId) return
    setError(null)

    startGenerating(async () => {
      try {
        const result = await generateContentDraft(selectedEventId, selectedPlatform)
        if (result.success) {
          setDraftText(result.draft)
        } else {
          setError(result.error)
        }
      } catch (err: any) {
        // OllamaOfflineError surfaces as a serialized error from the server action
        const msg = err?.message ?? String(err)
        if (msg.includes('Ollama') || msg.includes('offline') || msg.includes('Local AI')) {
          setError('AI content generation is unavailable right now. Please try again shortly.')
        } else {
          setError('Failed to generate draft. Please try again.')
        }
      }
    })
  }

  // Save current draft
  const handleSave = () => {
    if (!selectedEventId || !draftText.trim()) return
    setError(null)

    startSaving(async () => {
      try {
        const result = await saveContentDraft({
          eventId: selectedEventId,
          platform: selectedPlatform,
          draftText: draftText.trim(),
          aiGenerated: true,
        })
        if (result.success) {
          setDraftText('')
          loadDrafts(selectedEventId)
          // Refresh event list to update draft counts
          const updatedEvents = await getContentReadyEvents()
          setEvents(updatedEvents)
        } else {
          setError(result.error)
        }
      } catch {
        setError('Failed to save draft.')
      }
    })
  }

  // Update draft text
  const handleUpdateDraft = (draftId: string) => {
    if (!editText.trim()) return
    setError(null)

    startSaving(async () => {
      try {
        const result = await updateContentDraft(draftId, editText.trim())
        if (result.success) {
          setEditingDraftId(null)
          setEditText('')
          if (selectedEventId) loadDrafts(selectedEventId)
        } else {
          setError(result.error ?? 'Failed to update draft')
        }
      } catch {
        setError('Failed to update draft.')
      }
    })
  }

  // Update status
  const handleStatusChange = (draftId: string, status: 'draft' | 'approved' | 'posted') => {
    setError(null)
    startSaving(async () => {
      try {
        const result = await updateDraftStatus(draftId, status)
        if (result.success) {
          if (selectedEventId) loadDrafts(selectedEventId)
        } else {
          setError(result.error ?? 'Failed to update status')
        }
      } catch {
        setError('Failed to update status.')
      }
    })
  }

  // Delete draft
  const handleDelete = (draftId: string) => {
    setError(null)
    startSaving(async () => {
      try {
        const result = await deleteContentDraft(draftId)
        if (result.success) {
          if (selectedEventId) loadDrafts(selectedEventId)
          const updatedEvents = await getContentReadyEvents()
          setEvents(updatedEvents)
        } else {
          setError(result.error ?? 'Failed to delete draft')
        }
      } catch {
        setError('Failed to delete draft.')
      }
    })
  }

  // Copy text to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback: select text in a hidden textarea
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Content Pipeline</h2>
        <p className="text-sm text-gray-500 mt-1">
          Create social media content from your completed events. AI helps draft, you edit and post.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Event List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No completed events with photos found.</p>
          <p className="text-sm mt-1">
            Complete an event and upload photos to start creating content.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event.id)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedEventId === event.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{event.occasion ?? 'Event'}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(event.event_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{event.photo_count} photos</span>
                  {event.draft_count > 0 && (
                    <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs">
                      {event.draft_count} draft{event.draft_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{event.guest_count} guests</span>
                {event.has_nda && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    NDA
                  </span>
                )}
                {event.photo_permission === 'none' && !event.has_nda && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    No photo permission
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Draft Generation Panel */}
      {selectedEvent && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Create Content: {selectedEvent.occasion ?? 'Event'}
            </h3>
            {(selectedEvent.has_nda || selectedEvent.photo_permission === 'none') && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                Privacy restrictions apply. Details will be anonymized.
              </span>
            )}
          </div>

          {/* Platform Selector */}
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setSelectedPlatform(p.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedPlatform === p.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2 px-4 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'Generating draft...' : `Generate ${selectedPlatform} Draft`}
          </button>

          {/* Draft Editor */}
          {draftText && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Draft (edit before saving)
              </label>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={selectedPlatform === 'blog' ? 8 : 4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !draftText.trim()}
                  className="py-2 px-4 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleCopy(draftText)}
                  className="py-2 px-4 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setDraftText('')}
                  className="py-2 px-4 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Existing Drafts */}
          {drafts.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700">Saved Drafts</h4>
              {drafts.map((draft) => (
                <div key={draft.id} className="border border-gray-200 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {draft.platform}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLORS[draft.status] ?? ''
                        }`}
                      >
                        {STATUS_LABELS[draft.status] ?? draft.status}
                      </span>
                      {draft.ai_generated && (
                        <span className="text-xs text-gray-400">AI-drafted</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {editingDraftId === draft.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateDraft(draft.id)}
                          disabled={saving}
                          className="py-1 px-3 rounded-md bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setEditingDraftId(null)
                            setEditText('')
                          }}
                          className="py-1 px-3 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {draft.draft_text}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setEditingDraftId(draft.id)
                            setEditText(draft.draft_text)
                          }}
                          className="py-1 px-3 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleCopy(draft.draft_text)}
                          className="py-1 px-3 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Copy
                        </button>
                        {draft.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(draft.id, 'approved')}
                            disabled={saving}
                            className="py-1 px-3 rounded-md bg-brand-100 text-brand-700 text-xs font-medium hover:bg-brand-200 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {(draft.status === 'draft' || draft.status === 'approved') && (
                          <button
                            onClick={() => handleStatusChange(draft.id, 'posted')}
                            disabled={saving}
                            className="py-1 px-3 rounded-md bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                          >
                            Mark as Posted
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(draft.id)}
                          disabled={saving}
                          className="py-1 px-3 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
