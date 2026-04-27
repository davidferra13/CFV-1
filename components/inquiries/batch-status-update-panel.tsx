'use client'

// Batch Status Update Panel
// One-click: generate drafts for everyone waiting, review, send all.
// The anti-procrastination weapon for ADHD chefs drowning in pending replies.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  generateBatchStatusDrafts,
  sendBatchDrafts,
  type BatchDraftItem,
  type BatchDraftResult,
} from '@/lib/inquiries/batch-status-update'
import { updateDraftMessage, deleteDraftMessage } from '@/lib/gmail/actions'

type Phase = 'idle' | 'generating' | 'reviewing' | 'sending' | 'done'

export function BatchStatusUpdatePanel({ queueCount }: { queueCount: number }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<BatchDraftResult | null>(null)
  const [drafts, setDrafts] = useState<BatchDraftItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [generationProgress, setGenerationProgress] = useState(0)

  if (queueCount === 0) return null

  // Phase 1: Generate all drafts
  const handleGenerate = () => {
    setPhase('generating')
    setError(null)
    setGenerationProgress(0)

    startTransition(async () => {
      try {
        const batchResult = await generateBatchStatusDrafts()
        setResult(batchResult)
        setDrafts(batchResult.drafts)
        setPhase('reviewing')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate drafts')
        setPhase('idle')
      }
    })
  }

  // Toggle include/exclude a draft from send batch
  const toggleExclude = (inquiryId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(inquiryId)) next.delete(inquiryId)
      else next.add(inquiryId)
      return next
    })
  }

  // Start editing a draft
  const startEdit = (draft: BatchDraftItem) => {
    setEditingId(draft.inquiryId)
    setEditBody(draft.body)
    setEditSubject(draft.subject)
  }

  // Save edit
  const saveEdit = (draft: BatchDraftItem) => {
    if (!draft.messageId) return

    startTransition(async () => {
      try {
        await updateDraftMessage(draft.messageId!, {
          subject: editSubject,
          body: editBody,
        })
        // Update local state
        setDrafts((prev) =>
          prev.map((d) =>
            d.inquiryId === draft.inquiryId
              ? { ...d, subject: editSubject, body: editBody }
              : d
          )
        )
        setEditingId(null)
      } catch (err) {
        setError(`Failed to save edit: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    })
  }

  // Phase 2: Send all included drafts
  const handleSendAll = () => {
    const toSend = drafts
      .filter((d) => d.status === 'draft' && d.messageId && !excluded.has(d.inquiryId))
      .map((d) => d.messageId!)

    if (toSend.length === 0) {
      setError('No drafts selected to send')
      return
    }

    setPhase('sending')
    setError(null)

    startTransition(async () => {
      try {
        const result = await sendBatchDrafts(toSend)
        setSendResult({ sent: result.sent, failed: result.failed })
        if (result.errors.length > 0) {
          setError(result.errors.join('\n'))
        }
        setPhase('done')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Batch send failed')
        setPhase('reviewing')
      }
    })
  }

  // Discard all drafts and reset
  const handleDiscard = () => {
    startTransition(async () => {
      for (const draft of drafts) {
        if (draft.messageId) {
          try {
            await deleteDraftMessage(draft.messageId)
          } catch {
            // Non-blocking cleanup
          }
        }
      }
      setPhase('idle')
      setResult(null)
      setDrafts([])
      setExcluded(new Set())
      setSendResult(null)
      setError(null)
    })
  }

  const sendableDrafts = drafts.filter(
    (d) => d.status === 'draft' && d.messageId && !excluded.has(d.inquiryId)
  )

  return (
    <Card className="p-4 mb-4">
      {/* Idle: Show the trigger button */}
      {phase === 'idle' && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-200">
              {queueCount} {queueCount === 1 ? 'person is' : 'people are'} waiting for a response
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Generate personalized replies for everyone at once
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={isPending}>
            Update Everyone
          </Button>
        </div>
      )}

      {/* Generating: Progress */}
      {phase === 'generating' && (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-stone-600 border-t-brand-500 mb-3" />
          <p className="text-sm text-stone-300">
            Generating personalized drafts for {queueCount} {queueCount === 1 ? 'inquiry' : 'inquiries'}...
          </p>
          <p className="text-xs text-stone-500 mt-1">
            This takes a few seconds per inquiry
          </p>
        </div>
      )}

      {/* Reviewing: Show all drafts for approval */}
      {phase === 'reviewing' && result && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-stone-200">
                Batch Update Ready
              </h3>
              <Badge variant="success">{sendableDrafts.length} to send</Badge>
              {excluded.size > 0 && (
                <Badge variant="default">{excluded.size} skipped</Badge>
              )}
              {result.errorCount > 0 && (
                <Badge variant="error">{result.errorCount} failed</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleDiscard} disabled={isPending}>
                Discard All
              </Button>
              <Button
                onClick={handleSendAll}
                disabled={isPending || sendableDrafts.length === 0}
              >
                Send {sendableDrafts.length} {sendableDrafts.length === 1 ? 'Message' : 'Messages'}
              </Button>
            </div>
          </div>

          {/* Draft list */}
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {drafts.map((draft) => {
              const isExcluded = excluded.has(draft.inquiryId)
              const isEditing = editingId === draft.inquiryId

              return (
                <div
                  key={draft.inquiryId}
                  className={`rounded-lg border p-3 transition-all ${
                    draft.status === 'error' || draft.status === 'no_email'
                      ? 'border-red-800/50 bg-red-950/20'
                      : isExcluded
                        ? 'border-stone-700/30 bg-stone-900/30 opacity-60'
                        : 'border-stone-700/50 bg-stone-800/30'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-stone-200">
                        {draft.clientName}
                      </span>
                      {draft.occasion && (
                        <span className="text-xs text-stone-400">{draft.occasion}</span>
                      )}
                      <span className="text-xs text-amber-500">
                        waiting {draft.waitingHours}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {draft.status === 'draft' && (
                        <>
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(draft)}
                              disabled={isPending}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExclude(draft.inquiryId)}
                            disabled={isPending}
                          >
                            {isExcluded ? 'Include' : 'Skip'}
                          </Button>
                        </>
                      )}
                      {draft.status === 'error' && (
                        <Badge variant="error">Failed</Badge>
                      )}
                      {draft.status === 'no_email' && (
                        <Badge variant="warning">No email</Badge>
                      )}
                    </div>
                  </div>

                  {/* Draft content */}
                  {draft.status === 'draft' && (
                    <>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-200"
                            placeholder="Subject"
                          />
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={6}
                            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-300 resize-y"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(draft)}
                              disabled={isPending}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className={isExcluded ? 'line-through' : ''}>
                          <p className="text-xs text-stone-400 mb-1">
                            Subject: {draft.subject}
                          </p>
                          <p className="text-xs text-stone-400 whitespace-pre-wrap line-clamp-3">
                            {draft.body}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Error info */}
                  {(draft.status === 'error' || draft.status === 'no_email') && draft.error && (
                    <p className="text-xs text-red-400">{draft.error}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sending: Progress */}
      {phase === 'sending' && (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-stone-600 border-t-emerald-500 mb-3" />
          <p className="text-sm text-stone-300">
            Sending {sendableDrafts.length} {sendableDrafts.length === 1 ? 'message' : 'messages'} via Gmail...
          </p>
        </div>
      )}

      {/* Done: Results */}
      {phase === 'done' && sendResult && (
        <div className="space-y-3">
          <Alert variant={sendResult.failed > 0 ? 'warning' : 'success'}>
            <p className="text-sm font-medium">
              {sendResult.sent} {sendResult.sent === 1 ? 'message' : 'messages'} sent
              {sendResult.failed > 0 && `, ${sendResult.failed} failed`}
            </p>
            <p className="text-xs mt-1">
              All recipients have been moved to "Awaiting Client Reply"
            </p>
          </Alert>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setPhase('idle')
                setResult(null)
                setDrafts([])
                setExcluded(new Set())
                setSendResult(null)
                setError(null)
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="error" className="mt-3">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
    </Card>
  )
}
