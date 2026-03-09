// KanbanBoard — Visual pipeline view for the Inquiry Pipeline page
// No drag-and-drop — clicking a card navigates to the inquiry detail page.
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { KanbanCard, type KanbanCardInquiry } from './kanban-card'

export interface KanbanBoardInquiry {
  id: string
  status: string
  client_name?: string
  occasion?: string
  event_date?: string
  guest_count?: number
  budget_cents?: number
  updated_at?: string
  created_at: string
}

interface KanbanBoardProps {
  inquiries: KanbanBoardInquiry[]
}

// Column definitions — order matters (pipeline left-to-right)
interface ColumnDef {
  id: string
  label: string
  statuses: string[]
  badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'info'
  collapsedByDefault?: boolean
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'new',
    label: 'New',
    statuses: ['new'],
    badgeVariant: 'default',
  },
  {
    id: 'awaiting_chef',
    label: 'Needs Response',
    statuses: ['awaiting_chef', 'awaiting_response'],
    badgeVariant: 'warning',
  },
  {
    id: 'awaiting_client',
    label: 'Waiting for Reply',
    statuses: ['awaiting_client'],
    badgeVariant: 'info',
  },
  {
    id: 'quoted',
    label: 'Quote Sent',
    statuses: ['quoted'],
    badgeVariant: 'info',
  },
  {
    id: 'confirmed',
    label: 'Ready to Book',
    statuses: ['confirmed'],
    badgeVariant: 'success',
  },
  {
    id: 'closed',
    label: 'Declined / Expired',
    statuses: ['declined', 'expired'],
    badgeVariant: 'error',
    collapsedByDefault: true,
  },
]

// Column header accent colors (top border)
const COLUMN_ACCENT: Record<string, string> = {
  new: 'border-t-amber-400',
  awaiting_chef: 'border-t-stone-400',
  awaiting_client: 'border-t-sky-400',
  quoted: 'border-t-sky-500',
  confirmed: 'border-t-emerald-500',
  closed: 'border-t-red-400',
}

interface KanbanColumnProps {
  column: ColumnDef
  cards: KanbanCardInquiry[]
}

function formatColumnRevenue(cents: number): string {
  if (cents === 0) return ''
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

function KanbanColumn({ column, cards }: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState<boolean>(column.collapsedByDefault ?? false)

  const accentClass = COLUMN_ACCENT[column.id] ?? 'border-t-stone-300'
  const totalBudgetCents = cards.reduce((sum, c) => sum + (c.budget_cents ?? 0), 0)
  const revenueLabel = formatColumnRevenue(totalBudgetCents)

  return (
    <div
      className={`flex flex-col bg-stone-50 rounded-xl border border-stone-200 border-t-4 ${accentClass} min-w-[280px] max-w-[320px] flex-shrink-0`}
    >
      {/* Sticky column header */}
      <div className="sticky top-0 z-10 bg-stone-50 rounded-t-xl px-3 pt-3 pb-2 border-b border-stone-200">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 group"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-stone-800 text-sm">{column.label}</span>
            <Badge variant={column.badgeVariant}>{cards.length}</Badge>
            {revenueLabel && (
              <span className="text-xs text-emerald-700 font-medium ml-auto shrink-0">
                {revenueLabel}
              </span>
            )}
          </div>
          <span className="text-stone-400 group-hover:text-stone-600 transition-colors shrink-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
      </div>

      {/* Cards or collapsed state */}
      {!collapsed && (
        <div className="flex flex-col gap-2 p-3 overflow-y-auto">
          {cards.length === 0 ? (
            <p className="text-center text-xs text-stone-400 py-6">No inquiries here</p>
          ) : (
            cards.map((inquiry) => <KanbanCard key={inquiry.id} inquiry={inquiry} />)
          )}
        </div>
      )}

      {/* Collapsed summary — show count only */}
      {collapsed && cards.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-xs text-stone-500 text-center">
            {cards.length} {cards.length === 1 ? 'inquiry' : 'inquiries'} hidden
          </p>
        </div>
      )}
    </div>
  )
}

export function KanbanBoard({ inquiries }: KanbanBoardProps) {
  // Group inquiries by column
  const columnCards: Record<string, KanbanCardInquiry[]> = {}
  for (const col of COLUMNS) {
    columnCards[col.id] = []
  }

  for (const inquiry of inquiries) {
    const col = COLUMNS.find((c) => c.statuses.includes(inquiry.status))
    if (col) {
      columnCards[col.id].push({
        id: inquiry.id,
        status: inquiry.status,
        client_name: inquiry.client_name,
        occasion: inquiry.occasion,
        event_date: inquiry.event_date,
        guest_count: inquiry.guest_count,
        budget_cents: inquiry.budget_cents,
        updated_at: inquiry.updated_at,
        created_at: inquiry.created_at,
      })
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} column={col} cards={columnCards[col.id] ?? []} />
        ))}
      </div>
    </div>
  )
}
