'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  createCompItem,
  updateCompItem,
  deleteCompItem,
  generateCompSuggestions,
  acceptSuggestion,
  rejectSuggestion,
} from '@/lib/complimentary/actions'
import type {
  ComplimentaryItem,
  ComplimentarySuggestion,
  CompItemType,
  CompItemStatus,
} from '@/lib/private-context/types'

const ITEM_TYPE_LABELS: Record<CompItemType, string> = {
  true_comp: 'Complimentary',
  piggyback: 'Piggyback',
  reuse: 'Reuse',
}

const STATUS_COLORS: Record<CompItemStatus, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
  suggested: 'info',
  accepted: 'warning',
  rejected: 'error',
  executed: 'success',
}

interface Props {
  eventId: string
  compItems: ComplimentaryItem[]
  suggestions: ComplimentarySuggestion[]
}

export function ComplimentaryPanel({ eventId, compItems, suggestions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    item_type: 'true_comp' as CompItemType,
    estimated_cost_cents: '',
  })

  function resetForm() {
    setFormData({ name: '', description: '', item_type: 'true_comp', estimated_cost_cents: '' })
    setShowForm(false)
    setError(null)
  }

  function handleCreate() {
    if (!formData.name.trim()) return
    startTransition(async () => {
      try {
        const res = await createCompItem({
          event_id: eventId,
          name: formData.name,
          description: formData.description || null,
          item_type: formData.item_type,
          estimated_cost_cents: formData.estimated_cost_cents ? parseInt(formData.estimated_cost_cents) : 0,
          suggestion_source: 'manual',
        })
        if (!res.success) throw new Error(res.error)
        resetForm()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create')
      }
    })
  }

  function handleGenerate() {
    startTransition(async () => {
      try {
        const res = await generateCompSuggestions(eventId)
        if (!res.success) throw new Error(res.error)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate')
      }
    })
  }

  function handleAcceptSuggestion(id: string) {
    startTransition(async () => {
      try {
        await acceptSuggestion(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleRejectSuggestion(id: string) {
    startTransition(async () => {
      try {
        await rejectSuggestion(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleStatusChange(id: string, status: CompItemStatus) {
    startTransition(async () => {
      try {
        await updateCompItem(id, { status })
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCompItem(id)
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
  const totalCostCents = compItems
    .filter(i => i.status === 'executed' || i.status === 'accepted')
    .reduce((sum, i) => sum + (i.actual_cost_cents ?? i.estimated_cost_cents), 0)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
            Complimentary Items
          </h3>
          {totalCostCents > 0 && (
            <span className="text-xs text-zinc-500">
              ~${(totalCostCents / 100).toFixed(2)} total
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleGenerate} disabled={isPending}>
            {isPending ? 'Analyzing...' : 'Detect Opportunities'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            disabled={isPending}
          >
            {showForm ? 'Cancel' : '+ Manual'}
          </Button>
        </div>
      </div>

      {/* AI Suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
            Suggestions ({pendingSuggestions.length})
          </h4>
          {pendingSuggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className="p-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="success">{suggestion.suggestion_type.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-zinc-500">
                      {suggestion.confidence_score}% confident
                    </span>
                    <span className="text-xs text-zinc-500">
                      {suggestion.effort_level} effort
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-200">{suggestion.title}</p>
                  {suggestion.description && (
                    <p className="text-xs text-zinc-400 mt-1">{suggestion.description}</p>
                  )}
                  {suggestion.reasoning && (
                    <p className="text-xs text-zinc-500 italic mt-1">{suggestion.reasoning}</p>
                  )}
                  {suggestion.estimated_cost_cents > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Est. cost: ${(suggestion.estimated_cost_cents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="primary"
                    onClick={() => handleAcceptSuggestion(suggestion.id)}
                    disabled={isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleRejectSuggestion(suggestion.id)}
                    disabled={isPending}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual add form */}
      {showForm && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex gap-2">
            <select
              value={formData.item_type}
              onChange={e => setFormData(f => ({ ...f, item_type: e.target.value as CompItemType }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
            >
              {Object.entries(ITEM_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Item name"
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
            <input
              type="number"
              placeholder="Cost (cents)"
              value={formData.estimated_cost_cents}
              onChange={e => setFormData(f => ({ ...f, estimated_cost_cents: e.target.value }))}
              className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetForm} disabled={isPending}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </div>
      )}

      {/* Comp items list */}
      {compItems.length === 0 && pendingSuggestions.length === 0 && !showForm && (
        <p className="text-sm text-zinc-500 italic">
          No complimentary items. Click "Detect Opportunities" to get AI-driven suggestions.
        </p>
      )}

      {compItems.length > 0 && (
        <div className="space-y-2">
          {compItems.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={STATUS_COLORS[item.status]}>{item.status}</Badge>
                    <Badge variant="default">{ITEM_TYPE_LABELS[item.item_type]}</Badge>
                    <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-zinc-400">{item.description}</p>
                  )}
                  {item.suggestion_reason && (
                    <p className="text-xs text-zinc-500 italic">{item.suggestion_reason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">
                      Est: ${(item.estimated_cost_cents / 100).toFixed(2)}
                    </span>
                    {item.actual_cost_cents != null && (
                      <span className="text-xs text-zinc-400">
                        Actual: ${(item.actual_cost_cents / 100).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">{item.suggestion_source}</span>
                  </div>
                  {item.client_reaction && (
                    <p className="text-xs text-emerald-400 mt-1">Reaction: {item.client_reaction}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.status === 'accepted' && (
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange(item.id, 'executed')}
                      disabled={isPending}
                    >
                      Execute
                    </Button>
                  )}
                  {item.status === 'suggested' && (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => handleStatusChange(item.id, 'accepted')}
                        disabled={isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleStatusChange(item.id, 'rejected')}
                        disabled={isPending}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {(item.status === 'suggested' || item.status === 'accepted') && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
