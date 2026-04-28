'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { updateCompItem } from '@/lib/complimentary/actions'
import type { ComplimentaryItem } from '@/lib/private-context/types'

const REACTION_OPTIONS = [
  { value: 'delighted', label: 'Delighted', color: 'success' as const },
  { value: 'pleased', label: 'Pleased', color: 'success' as const },
  { value: 'neutral', label: 'Neutral', color: 'default' as const },
  { value: 'unnoticed', label: 'Unnoticed', color: 'warning' as const },
]

const IMPACT_OPTIONS = [
  { value: 'strong_positive', label: 'Strong retention signal' },
  { value: 'mild_positive', label: 'Mild positive' },
  { value: 'neutral', label: 'No noticeable impact' },
  { value: 'unknown', label: 'Too early to tell' },
]

interface Props {
  compItems: ComplimentaryItem[]
}

/**
 * Post-event reaction capture for executed comp items.
 * Shows only items with status 'executed' that lack client_reaction.
 * Appears in the wrap-up/debrief phase.
 */
export function CompReactionCapture({ compItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reactions, setReactions] = useState<Record<string, { reaction: string; impact: string; notes: string }>>({})

  const needsReaction = compItems.filter(
    item => item.status === 'executed' && !item.client_reaction
  )

  if (needsReaction.length === 0) return null

  function handleSave(itemId: string) {
    const r = reactions[itemId]
    if (!r?.reaction) return

    startTransition(async () => {
      try {
        await updateCompItem(itemId, {
          client_reaction: `${r.reaction}${r.notes ? `: ${r.notes}` : ''}`,
          retention_impact: r.impact || null,
        })
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function updateReaction(itemId: string, field: string, value: string) {
    setReactions(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { reaction: '', impact: '', notes: '' }), [field]: value },
    }))
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
        Complimentary Item Reactions
      </h3>
      <p className="text-xs text-zinc-500 mb-3">
        How did clients react to these complimentary items? This feedback improves future suggestions.
      </p>

      <div className="space-y-3">
        {needsReaction.map(item => {
          const r = reactions[item.id] ?? { reaction: '', impact: '', notes: '' }
          return (
            <div key={item.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success">executed</Badge>
                <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                {item.actual_cost_cents != null && (
                  <span className="text-xs text-zinc-500">
                    ${(item.actual_cost_cents / 100).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Reaction */}
              <div className="flex flex-wrap gap-2">
                {REACTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateReaction(item.id, 'reaction', opt.value)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      r.reaction === opt.value
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Impact */}
              <div>
                <select
                  title="Retention impact"
                  value={r.impact}
                  onChange={e => updateReaction(item.id, 'impact', e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 w-full"
                >
                  <option value="">Retention impact...</option>
                  {IMPACT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Additional notes (optional)"
                  value={r.notes}
                  onChange={e => updateReaction(item.id, 'notes', e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500"
                />
                <Button
                  variant="primary"
                  onClick={() => handleSave(item.id)}
                  disabled={isPending || !r.reaction}
                >
                  Save
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
