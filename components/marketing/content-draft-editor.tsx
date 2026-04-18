'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  generateContentDraft,
  saveContentDraft,
  updateContentDraft,
  updateDraftStatus,
  getEventContentDrafts,
  deleteContentDraft,
  type ContentPlatform,
  type ContentDraft,
} from '@/lib/content/post-event-content-actions'

// ── Constants ──────────────────────────────────────────────────────────────

const PLATFORMS: { key: ContentPlatform; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'story', label: 'Story' },
  { key: 'blog', label: 'Blog' },
]

const CHAR_LIMITS: Record<ContentPlatform, number> = {
  instagram: 2200,
  story: 300,
  blog: 5000,
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'success' | 'warning' }> =
  {
    draft: { label: 'Draft', variant: 'default' },
    approved: { label: 'Approved', variant: 'warning' },
    posted: { label: 'Posted', variant: 'success' },
  }

// ── Toast ──────────────────────────────────────────────────────────────────

type Toast = { message: string; type: 'success' | 'error' }

function ToastBanner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={`rounded-lg px-4 py-2 text-sm ${
        toast.type === 'success'
          ? 'bg-green-900/30 border border-green-700/50 text-green-400'
          : 'bg-red-900/30 border border-red-700/50 text-red-400'
      }`}
    >
      {toast.message}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ContentDraftEditor({
  eventId,
  eventOccasion,
  hasNda,
}: {
  eventId: string
  eventOccasion: string | null
  hasNda: boolean
}) {
  const [platform, setPlatform] = useState<ContentPlatform>('instagram')
  const [draftText, setDraftText] = useState('')
  const [aiGenerated, setAiGenerated] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [existingDrafts, setExistingDrafts] = useState<ContentDraft[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ollamaOffline, setOllamaOffline] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [isGenerating, startGenerating] = useTransition()
  const [isSaving, startSaving] = useTransition()
  const [isUpdatingStatus, startUpdatingStatus] = useTransition()
  const [isDeleting, startDeleting] = useTransition()

  const charLimit = CHAR_LIMITS[platform]
  const charCount = draftText.length
  const isOverLimit = charCount > charLimit

  // Load existing drafts
  const loadDrafts = useCallback(async () => {
    try {
      const drafts = await getEventContentDrafts(eventId)
      setExistingDrafts(drafts)
      setLoadError(null)
    } catch (err) {
      console.error('[ContentDraftEditor] Failed to load drafts:', err)
      setLoadError('Failed to load existing drafts.')
    }
  }, [eventId])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  // Generate AI draft
  function handleGenerate() {
    setOllamaOffline(false)
    startGenerating(async () => {
      try {
        const result = await generateContentDraft(eventId, platform)
        if (result.success) {
          setDraftText(result.draft)
          setAiGenerated(true)
          setEditingDraftId(null)
          showToast('AI draft generated.', 'success')
        } else {
          showToast(result.error, 'error')
        }
      } catch (err: any) {
        if (err?.message?.includes?.('Ollama') || err?.name === 'OllamaOfflineError') {
          setOllamaOffline(true)
        } else {
          showToast('Failed to generate draft. Please try again.', 'error')
        }
      }
    })
  }

  // Save new draft
  function handleSave() {
    if (!draftText.trim() || isOverLimit) return

    startSaving(async () => {
      try {
        if (editingDraftId) {
          // Update existing draft
          const result = await updateContentDraft(editingDraftId, draftText)
          if (result.success) {
            showToast('Draft updated.', 'success')
            setEditingDraftId(null)
            setDraftText('')
            setAiGenerated(false)
            await loadDrafts()
          } else {
            showToast(result.error ?? 'Failed to update draft.', 'error')
          }
        } else {
          // Save new draft
          const result = await saveContentDraft({
            eventId,
            platform,
            draftText,
            aiGenerated,
          })
          if (result.success) {
            showToast('Draft saved.', 'success')
            setDraftText('')
            setAiGenerated(false)
            await loadDrafts()
          } else {
            showToast(result.error, 'error')
          }
        }
      } catch {
        showToast('Failed to save draft.', 'error')
      }
    })
  }

  // Update draft status
  function handleStatusChange(draftId: string, status: 'approved' | 'posted') {
    startUpdatingStatus(async () => {
      try {
        const result = await updateDraftStatus(draftId, status)
        if (result.success) {
          showToast(`Draft marked as ${status}.`, 'success')
          await loadDrafts()
        } else {
          showToast(result.error ?? 'Failed to update status.', 'error')
        }
      } catch {
        showToast('Failed to update status.', 'error')
      }
    })
  }

  // Delete draft
  function handleDelete(draftId: string) {
    startDeleting(async () => {
      try {
        const result = await deleteContentDraft(draftId)
        if (result.success) {
          showToast('Draft deleted.', 'success')
          setConfirmDeleteId(null)
          if (editingDraftId === draftId) {
            setEditingDraftId(null)
            setDraftText('')
            setAiGenerated(false)
          }
          await loadDrafts()
        } else {
          showToast(result.error ?? 'Failed to delete draft.', 'error')
        }
      } catch {
        showToast('Failed to delete draft.', 'error')
      }
    })
  }

  // Edit an existing draft
  function startEditDraft(draft: ContentDraft) {
    setEditingDraftId(draft.id)
    setPlatform(draft.platform)
    setDraftText(draft.draft_text)
    setAiGenerated(draft.ai_generated)
  }

  // Cancel editing
  function cancelEdit() {
    setEditingDraftId(null)
    setDraftText('')
    setAiGenerated(false)
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6 space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-stone-100">
          {editingDraftId ? 'Edit Draft' : 'Create Content'}
        </h3>
        <p className="text-sm text-stone-500 mt-0.5">{eventOccasion || 'Private Event'}</p>
      </div>

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {/* NDA warning */}
      {hasNda && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3">
          <p className="text-sm text-amber-400">
            This client has an NDA. Content has been anonymized. Do not include identifying details.
          </p>
        </div>
      )}

      {/* Platform selector */}
      <div className="flex gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPlatform(p.key)
              if (!editingDraftId) {
                setDraftText('')
                setAiGenerated(false)
              }
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                platform === p.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Ollama offline warning */}
      {ollamaOffline && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">
            AI drafting is temporarily unavailable. You can write manually instead.
          </p>
        </div>
      )}

      {/* Generate button */}
      {!editingDraftId && (
        <Button variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
      )}

      {/* Text area */}
      <div>
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={`Write your ${platform} content here, or generate with AI...`}
          rows={platform === 'blog' ? 8 : platform === 'story' ? 3 : 5}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 text-stone-100 placeholder-stone-600 px-4 py-3 text-sm resize-y focus:outline-none focus:border-amber-600 transition-colors"
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {aiGenerated && <span className="text-xs text-stone-500">AI-generated draft</span>}
          </div>
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-stone-500'}`}>
            {charCount} / {charLimit}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || !draftText.trim() || isOverLimit}
        >
          {isSaving ? 'Saving...' : editingDraftId ? 'Update Draft' : 'Save Draft'}
        </Button>
        {editingDraftId && (
          <Button variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
        )}
      </div>

      {/* Existing drafts */}
      {loadError && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{loadError}</p>
        </div>
      )}

      {existingDrafts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
            Existing Drafts
          </h4>
          {existingDrafts.map((draft) => {
            const statusCfg = STATUS_BADGES[draft.status] ?? STATUS_BADGES.draft
            const isConfirmingDelete = confirmDeleteId === draft.id
            return (
              <div
                key={draft.id}
                className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{draft.platform}</Badge>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    {draft.ai_generated && <span className="text-xs text-stone-600">AI</span>}
                  </div>
                  <span className="text-xs text-stone-600">
                    {new Date(draft.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-stone-300 whitespace-pre-wrap line-clamp-3">
                  {draft.draft_text}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditDraft(draft)}
                    disabled={editingDraftId === draft.id}
                  >
                    Edit
                  </Button>
                  {draft.status === 'draft' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(draft.id, 'approved')}
                      disabled={isUpdatingStatus}
                    >
                      Approve
                    </Button>
                  )}
                  {(draft.status === 'draft' || draft.status === 'approved') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(draft.id, 'posted')}
                      disabled={isUpdatingStatus}
                    >
                      Mark Posted
                    </Button>
                  )}
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Delete this draft?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(draft.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(draft.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
