// CallPrepPanel — agenda checklist + prep notes for a scheduled call

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Plus, X, Info } from 'lucide-react'
import {
  addAgendaItem,
  toggleAgendaItem,
  removeAgendaItem,
  type ScheduledCall,
  type AgendaItem,
} from '@/lib/calls/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SOURCE_LABELS: Record<AgendaItem['source'], string> = {
  manual: '',
  inquiry: 'From inquiry',
  event: 'From event',
}

function AgendaItemRow({
  item,
  callId,
  disabled,
}: {
  item: AgendaItem
  callId: string
  disabled: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleAgendaItem(callId, item.id)
      } catch (err) {
        toast.error('Failed to update agenda item')
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeAgendaItem(callId, item.id)
      } catch (err) {
        toast.error('Failed to remove agenda item')
      }
    })
  }

  return (
    <li
      className={`flex items-start gap-3 group py-2 border-b border-gray-100 last:border-0 ${isPending ? 'opacity-60' : ''}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isPending}
        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border transition-colors flex items-center justify-center ${
          item.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-400'
        } disabled:cursor-not-allowed`}
        aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>

      {/* Text + source badge */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
        >
          {item.item}
        </p>
        {item.source !== 'manual' && (
          <p className="text-xs text-gray-400 mt-0.5">{SOURCE_LABELS[item.source]}</p>
        )}
      </div>

      {/* Remove */}
      {!disabled && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 disabled:cursor-not-allowed"
          aria-label="Remove item"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  )
}

export function CallPrepPanel({ call }: { call: ScheduledCall }) {
  const [newItem, setNewItem] = useState('')
  const [isAdding, startAdding] = useTransition()
  const isTerminal =
    call.status === 'completed' || call.status === 'cancelled' || call.status === 'no_show'

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const text = newItem.trim()
    if (!text) return
    startAdding(async () => {
      try {
        await addAgendaItem(call.id, text)
        setNewItem('')
      } catch (err) {
        toast.error('Failed to add agenda item')
      }
    })
  }

  const completed = call.agenda_items.filter((i) => i.completed).length
  const total = call.agenda_items.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Agenda / Prep Checklist</h3>
        {total > 0 && (
          <span className="text-xs text-gray-500">
            {completed}/{total} done
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-300"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      {total === 0 ? (
        <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded p-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            No agenda items yet.
            {!isTerminal &&
              ' Add items below, or link this call to an inquiry or event to auto-populate.'}
          </span>
        </div>
      ) : (
        <ul className="divide-y-0">
          {call.agenda_items.map((item) => (
            <AgendaItemRow key={item.id} item={item} callId={call.id} disabled={isTerminal} />
          ))}
        </ul>
      )}

      {/* Add item form */}
      {!isTerminal && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add agenda item…"
            className="flex-1 text-sm"
            maxLength={300}
            disabled={isAdding}
          />
          <Button type="submit" size="sm" disabled={isAdding || !newItem.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      )}

      {/* Prep notes */}
      {call.prep_notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Prep notes
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{call.prep_notes}</p>
        </div>
      )}
    </div>
  )
}
