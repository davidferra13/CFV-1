'use client'

// Compose Contract Form - Client Component
// Checkbox selection of clauses with preview panel.
// Calls composeContractFromClauses on submit.

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { composeContractFromClauses } from '@/lib/contracts/compose-actions'

type ClauseCategory =
  | 'cancellation'
  | 'reschedule'
  | 'liability'
  | 'kitchen'
  | 'ip'
  | 'confidentiality'
  | 'force_majeure'
  | 'dispute'
  | 'payment'
  | 'scope'
  | 'custom'

const CATEGORY_LABELS: Record<string, string> = {
  cancellation: 'Cancellation',
  reschedule: 'Reschedule',
  liability: 'Liability',
  kitchen: 'Kitchen',
  ip: 'Intellectual Property',
  confidentiality: 'Confidentiality',
  force_majeure: 'Force Majeure',
  dispute: 'Dispute',
  payment: 'Payment',
  scope: 'Scope',
  custom: 'Custom',
}

const CATEGORY_ORDER: ClauseCategory[] = [
  'scope',
  'payment',
  'cancellation',
  'reschedule',
  'kitchen',
  'liability',
  'ip',
  'confidentiality',
  'force_majeure',
  'dispute',
  'custom',
]

type Clause = {
  id: string
  slug: string
  title: string
  body: string
  category: string
  is_default: boolean
  sort_order: number
}

type Props = {
  eventId: string
  clauses: Clause[]
}

export function ComposeContractForm({ eventId, clauses }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    // Pre-select default clauses
    new Set(clauses.filter((c) => c.is_default).map((c) => c.id))
  )
  const [isPending, startTransition] = useTransition()

  // Group clauses by category in display order
  const grouped = useMemo(() => {
    const map = new Map<string, Clause[]>()
    for (const clause of clauses) {
      const cat = clause.category || 'custom'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(clause)
    }
    const ordered: { category: string; label: string; clauses: Clause[] }[] = []
    for (const cat of CATEGORY_ORDER) {
      const items = map.get(cat)
      if (items && items.length > 0) {
        ordered.push({ category: cat, label: CATEGORY_LABELS[cat] || cat, clauses: items })
      }
    }
    return ordered
  }, [clauses])

  // Selected clauses in order for preview
  const selectedClauses = useMemo(() => {
    const ordered: Clause[] = []
    for (const group of grouped) {
      for (const clause of group.clauses) {
        if (selectedIds.has(clause.id)) {
          ordered.push(clause)
        }
      }
    }
    return ordered
  }, [grouped, selectedIds])

  function toggleClause(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(clauses.map((c) => c.id)))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  function handleCreate() {
    if (selectedIds.size === 0) {
      toast.error('Select at least one clause')
      return
    }

    const clauseIds = selectedClauses.map((c) => c.id)

    startTransition(async () => {
      try {
        const result = await composeContractFromClauses(eventId, clauseIds)
        if (!result.success) {
          toast.error(result.error || 'Failed to create contract')
          return
        }
        toast.success('Contract created')
        router.push('/contracts')
      } catch {
        toast.error('Something went wrong')
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Clause selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">Select Clauses</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Select all
            </button>
            <span className="text-stone-600">|</span>
            <button
              onClick={selectNone}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">
              {group.label}
            </h3>
            {group.clauses.map((clause) => (
              <label
                key={clause.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedIds.has(clause.id)
                    ? 'border-brand-500/50 bg-brand-500/5'
                    : 'border-stone-700 bg-stone-800/30 hover:border-stone-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(clause.id)}
                  onChange={() => toggleClause(clause.id)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500 focus:ring-offset-stone-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-100">{clause.title}</span>
                    {clause.is_default && <Badge variant="info">Default</Badge>}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                    {clause.body.replace(/[#*_\-]/g, '').slice(0, 120)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>

      {/* Right: Preview panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">
            Preview ({selectedClauses.length} clause{selectedClauses.length !== 1 ? 's' : ''})
          </h2>
        </div>

        <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-4 max-h-[600px] overflow-y-auto">
          {selectedClauses.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              Select clauses to preview the assembled contract.
            </p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-stone-400 text-xs italic mb-4">
                Merge fields (e.g. {'{{client_name}}'}) will be replaced with actual event data when
                the contract is created.
              </p>
              {selectedClauses.map((clause, i) => (
                <div key={clause.id}>
                  {i > 0 && <hr className="border-stone-700 my-4" />}
                  <div className="whitespace-pre-wrap text-sm text-stone-300 leading-relaxed">
                    {clause.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleCreate}
          loading={isPending}
          disabled={selectedIds.size === 0}
          className="w-full"
        >
          Create Contract ({selectedClauses.length} clause{selectedClauses.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  )
}
