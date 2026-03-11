'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  approveAndSendMessage,
  deleteDraftMessage,
  type ApprovalQueueMessage,
  updateDraftMessage,
} from '@/lib/gmail/actions'
import { Button } from '@/components/ui/button'

type DraftRowState = ApprovalQueueMessage & {
  draftSubject: string
  draftBody: string
}

interface ApprovalQueueClientProps {
  drafts: ApprovalQueueMessage[]
}

export function ApprovalQueueClient({ drafts }: ApprovalQueueClientProps) {
  const [rows, setRows] = useState<DraftRowState[]>(
    drafts.map((draft) => ({
      ...draft,
      draftSubject: draft.subject ?? '',
      draftBody: draft.body,
    }))
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasDrafts = rows.length > 0
  const orderedRows = useMemo(
    () =>
      [...rows].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      ),
    [rows]
  )

  function updateRow(id: string, patch: Partial<DraftRowState>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  async function saveDraft(row: DraftRowState) {
    if (!row.draftBody.trim()) {
      throw new Error('Email body is required')
    }

    await updateDraftMessage(row.id, {
      subject: row.draftSubject,
      body: row.draftBody,
    })

    updateRow(row.id, {
      subject: row.draftSubject,
      body: row.draftBody,
    })
  }

  function handleSave(row: DraftRowState) {
    setActiveId(row.id)
    startTransition(async () => {
      try {
        await saveDraft(row)
        toast.success('Draft saved')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save draft')
      } finally {
        setActiveId(null)
      }
    })
  }

  function handleApproveAndSend(row: DraftRowState) {
    setActiveId(row.id)
    startTransition(async () => {
      try {
        await saveDraft(row)
        await approveAndSendMessage(row.id)
        removeRow(row.id)
        toast.success('Email sent')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to send email')
      } finally {
        setActiveId(null)
      }
    })
  }

  function handleDelete(row: DraftRowState) {
    setActiveId(row.id)
    startTransition(async () => {
      try {
        await deleteDraftMessage(row.id)
        removeRow(row.id)
        toast.success('Draft deleted')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete draft')
      } finally {
        setActiveId(null)
      }
    })
  }

  if (!hasDrafts) {
    return (
      <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/60 p-8 text-center">
        <p className="text-lg font-medium text-stone-100">No emails waiting for approval.</p>
        <p className="mt-2 text-sm text-stone-400">
          Drafts saved from inquiries and inbox threads will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orderedRows.map((row) => {
        const isActive = isPending && activeId === row.id

        return (
          <div key={row.id} className="rounded-xl border border-stone-700 bg-stone-900 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-stone-100">
                  {row.recipientName || row.recipientEmail || 'Unknown recipient'}
                </p>
                {row.recipientEmail && (
                  <p className="text-xs text-stone-400">{row.recipientEmail}</p>
                )}
                <p className="mt-2 text-xs text-stone-500">
                  Queued {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                  {row.contextLabel ? ` · ${row.contextLabel}` : ''}
                </p>
              </div>
              <Link href={row.href} className="text-sm text-brand-400 hover:text-brand-300">
                Open context
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Subject</label>
                <input
                  type="text"
                  value={row.draftSubject}
                  onChange={(event) => updateRow(row.id, { draftSubject: event.target.value })}
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Body</label>
                <textarea
                  value={row.draftBody}
                  onChange={(event) => updateRow(row.id, { draftBody: event.target.value })}
                  rows={8}
                  className="w-full resize-y rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={isActive}
                onClick={() => handleSave(row)}
              >
                Save Draft
              </Button>
              <Button size="sm" loading={isActive} onClick={() => handleApproveAndSend(row)}>
                Approve & Send
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isActive}
                onClick={() => handleDelete(row)}
              >
                Delete
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
