'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  createPrivateContext,
  updatePrivateContext,
  deletePrivateContext,
  togglePinContext,
  archiveContext,
} from '@/lib/private-context/actions'
import type {
  ChefPrivateContext,
  PrivateContextEntityType,
  PrivateContextType,
} from '@/lib/private-context/types'

const CONTEXT_TYPE_LABELS: Record<PrivateContextType, string> = {
  note: 'Note',
  reminder: 'Reminder',
  observation: 'Observation',
  intention: 'Intention',
  item: 'Item',
}

const CONTEXT_TYPE_COLORS: Record<PrivateContextType, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  note: 'default',
  reminder: 'warning',
  observation: 'info',
  intention: 'success',
  item: 'default',
}

interface Props {
  entityType: PrivateContextEntityType
  entityId: string
  contexts: ChefPrivateContext[]
}

export function PrivateContextPanel({ entityType, entityId, contexts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    context_type: 'note' as PrivateContextType,
    remind_at: '',
  })
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setFormData({ title: '', content: '', context_type: 'note', remind_at: '' })
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  function handleSubmit() {
    if (!formData.content.trim() && !formData.title.trim()) return

    startTransition(async () => {
      try {
        if (editingId) {
          const res = await updatePrivateContext(editingId, {
            title: formData.title || null,
            content: formData.content || null,
            remind_at: formData.remind_at ? new Date(formData.remind_at).toISOString() : null,
          })
          if (!res.success) throw new Error(res.error)
        } else {
          const res = await createPrivateContext({
            entity_type: entityType,
            entity_id: entityId,
            context_type: formData.context_type,
            title: formData.title || null,
            content: formData.content || null,
            remind_at: formData.remind_at ? new Date(formData.remind_at).toISOString() : null,
          })
          if (!res.success) throw new Error(res.error)
        }
        resetForm()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function handleEdit(ctx: ChefPrivateContext) {
    setEditingId(ctx.id)
    setFormData({
      title: ctx.title ?? '',
      content: ctx.content ?? '',
      context_type: ctx.context_type,
      remind_at: ctx.remind_at ? new Date(ctx.remind_at).toISOString().slice(0, 16) : '',
    })
    setShowForm(true)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletePrivateContext(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handlePin(id: string) {
    startTransition(async () => {
      try {
        await togglePinContext(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      try {
        await archiveContext(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Private Notes
        </h3>
        <Button
          variant="ghost"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          disabled={isPending}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex gap-2">
            <select
              value={formData.context_type}
              onChange={e => setFormData(f => ({ ...f, context_type: e.target.value as PrivateContextType }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
              disabled={!!editingId}
            >
              {Object.entries(CONTEXT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Title (optional)"
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>
          <textarea
            placeholder="Your private note..."
            value={formData.content}
            onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 resize-none"
          />
          {formData.context_type === 'reminder' && (
            <input
              type="datetime-local"
              value={formData.remind_at}
              onChange={e => setFormData(f => ({ ...f, remind_at: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
            />
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetForm} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {contexts.length === 0 && !showForm && (
        <p className="text-sm text-zinc-500 italic">No private notes yet. Chef-only, never visible to clients.</p>
      )}

      <div className="space-y-2">
        {contexts.map(ctx => (
          <div
            key={ctx.id}
            className={`p-3 rounded-lg border ${
              ctx.pinned ? 'border-amber-700/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={CONTEXT_TYPE_COLORS[ctx.context_type]}>
                    {CONTEXT_TYPE_LABELS[ctx.context_type]}
                  </Badge>
                  {ctx.pinned && (
                    <span className="text-xs text-amber-400">Pinned</span>
                  )}
                  {ctx.title && (
                    <span className="text-sm font-medium text-zinc-200 truncate">{ctx.title}</span>
                  )}
                </div>
                {ctx.content && (
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{ctx.content}</p>
                )}
                {ctx.remind_at && (
                  <p className="text-xs text-yellow-500 mt-1">
                    Reminder: {new Date(ctx.remind_at).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-zinc-600 mt-1">
                  {new Date(ctx.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handlePin(ctx.id)}
                  className="text-xs text-zinc-500 hover:text-amber-400 px-1"
                  title={ctx.pinned ? 'Unpin' : 'Pin'}
                  disabled={isPending}
                >
                  {ctx.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => handleEdit(ctx)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 px-1"
                  disabled={isPending}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleArchive(ctx.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 px-1"
                  disabled={isPending}
                >
                  Archive
                </button>
                <button
                  onClick={() => handleDelete(ctx.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 px-1"
                  disabled={isPending}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
