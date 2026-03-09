'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  setQuoteExclusionsNote,
  setQuoteLineItems,
  toggleQuoteCostBreakdown,
  updateCostBreakdownDefaults,
} from '@/lib/quotes/cost-breakdown-actions'
import { formatCurrency } from '@/lib/utils/currency'

type CostBreakdownEditorProps = {
  quoteId: string
  totalQuotedCents: number
  initialShowCostBreakdown: boolean
  initialExclusionsNote: string | null
  initialLineItems: Array<{
    id: string
    label: string
    amount_cents: number
    percentage: number | null
    sort_order: number
    is_visible_to_client: boolean
    source_note: string | null
  }>
}

type EditorRow = {
  id: string
  label: string
  amount: string
  percentage: string
  isVisibleToClient: boolean
  sourceNote: string
}

const DEFAULT_ROWS: EditorRow[] = [
  { id: 'ingredients', label: 'Ingredients', amount: '', percentage: '', isVisibleToClient: true, sourceNote: '' },
  { id: 'labor', label: 'Labor', amount: '', percentage: '', isVisibleToClient: true, sourceNote: '' },
  { id: 'travel', label: 'Travel', amount: '', percentage: '', isVisibleToClient: true, sourceNote: '' },
  { id: 'equipment', label: 'Equipment', amount: '', percentage: '', isVisibleToClient: true, sourceNote: '' },
  { id: 'overhead', label: 'Overhead', amount: '', percentage: '', isVisibleToClient: true, sourceNote: '' },
]

function formatMoneyInput(cents: number) {
  return cents > 0 ? (cents / 100).toFixed(2) : ''
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '')
  if (!normalized) return 0
  const number = Number(normalized)
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

export function CostBreakdownEditor({
  quoteId,
  totalQuotedCents,
  initialShowCostBreakdown,
  initialExclusionsNote,
  initialLineItems,
}: CostBreakdownEditorProps) {
  const [showCostBreakdown, setShowCostBreakdown] = useState(initialShowCostBreakdown)
  const [exclusionsNote, setExclusionsNote] = useState(initialExclusionsNote ?? '')
  const [rows, setRows] = useState<EditorRow[]>(
    initialLineItems.length > 0
      ? initialLineItems.map((item) => ({
          id: item.id,
          label: item.label,
          amount: formatMoneyInput(item.amount_cents),
          percentage: item.percentage == null ? '' : String(item.percentage),
          isVisibleToClient: item.is_visible_to_client,
          sourceNote: item.source_note ?? '',
        }))
      : DEFAULT_ROWS
  )
  const [isPending, startTransition] = useTransition()

  const parsedRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id,
        label: row.label.trim(),
        amountCents: parseMoneyInput(row.amount),
        percentage: row.percentage.trim() ? Number(row.percentage) : undefined,
        sortOrder: index,
        isVisibleToClient: row.isVisibleToClient,
        sourceNote: row.sourceNote.trim() || undefined,
      })),
    [rows]
  )

  const breakdownTotal = parsedRows.reduce((sum, row) => sum + row.amountCents, 0)
  const variance = totalQuotedCents - breakdownTotal

  function updateRow(id: string, patch: Partial<EditorRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: `row-${crypto.randomUUID()}`,
        label: '',
        amount: '',
        percentage: '',
        isVisibleToClient: true,
        sourceNote: '',
      },
    ])
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  function handleSave() {
    startTransition(() => {
      void (async () => {
        try {
          await setQuoteLineItems(
            quoteId,
            parsedRows.map((row) => ({
              label: row.label,
              amountCents: row.amountCents,
              percentage: row.percentage,
              sortOrder: row.sortOrder,
              isVisibleToClient: row.isVisibleToClient,
              sourceNote: row.sourceNote,
            }))
          )
          await toggleQuoteCostBreakdown(quoteId, showCostBreakdown)
          await setQuoteExclusionsNote(quoteId, exclusionsNote)
          toast.success('Quote cost breakdown saved')
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to save cost breakdown')
        }
      })()
    })
  }

  function handleSaveDefaults() {
    startTransition(() => {
      void (async () => {
        try {
          await updateCostBreakdownDefaults(showCostBreakdown, exclusionsNote)
          toast.success('Default quote transparency settings saved')
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to save defaults')
        }
      })()
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Client Transparency</h3>
            <p className="mt-1 text-sm text-stone-400">
              Keep the total private by default, or share line items and sourcing details when it
              helps the client trust the quote.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <span>Show cost breakdown to client</span>
            <Switch checked={showCostBreakdown} onCheckedChange={setShowCostBreakdown} />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-stone-700 bg-stone-950/40 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_140px_120px]">
              <Input
                value={row.label}
                onChange={(event) => updateRow(row.id, { label: event.target.value })}
                placeholder="Line item label"
              />
              <Input
                value={row.amount}
                onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                placeholder="0.00"
              />
              <Input
                value={row.percentage}
                onChange={(event) => updateRow(row.id, { percentage: event.target.value })}
                placeholder="%"
              />
            </div>

            <Input
              value={row.sourceNote}
              onChange={(event) => updateRow(row.id, { sourceNote: event.target.value })}
              placeholder="Optional sourcing note, like Local farm produce or Monterey Bay seafood"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-300">
                <span>Show this line to client</span>
                <Switch
                  checked={row.isVisibleToClient}
                  onCheckedChange={(checked) => updateRow(row.id, { isVisibleToClient: checked })}
                />
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.id)}>
                Remove Line
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        Add Line Item
      </Button>

      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-100">Breakdown math</p>
            <p className="text-sm text-stone-400">
              Breakdown total {formatCurrency(breakdownTotal)} against quote total{' '}
              {formatCurrency(totalQuotedCents)}.
            </p>
          </div>
          <div
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold',
              variance === 0
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-amber-950 text-amber-400',
            ].join(' ')}
          >
            {variance === 0 ? 'Totals match' : `${formatCurrency(Math.abs(variance))} difference`}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-stone-100" htmlFor="quote-exclusions-note">
          What&apos;s Not Included
        </label>
        <Textarea
          id="quote-exclusions-note"
          value={exclusionsNote}
          onChange={(event) => setExclusionsNote(event.target.value)}
          rows={4}
          placeholder="Optional exclusions, like alcohol, rentals, taxes, or venue fees"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleSave} loading={isPending}>
          Save Breakdown
        </Button>
        <Button type="button" variant="secondary" onClick={handleSaveDefaults} loading={isPending}>
          Save as Defaults
        </Button>
      </div>
    </div>
  )
}
