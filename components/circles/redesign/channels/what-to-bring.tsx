'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

type Props = { circle: CircleDetail }

// ---------------------------------------------------------------------------
// Sample data (no real bring-list data in CircleDetail yet)
// ---------------------------------------------------------------------------

type BringItem = {
  id: string
  name: string
  quantity: string
  claimedBy: { name: string; avatarUrl?: string } | null
}

type BringCategory = {
  id: string
  label: string
  emoji: string
  items: BringItem[]
}

const SAMPLE_DATA: BringCategory[] = [
  {
    id: 'drinks',
    label: 'Drinks',
    emoji: '🍷',
    items: [
      {
        id: 'd1',
        name: 'Red wine',
        quantity: '2 bottles',
        claimedBy: { name: 'Sarah M.' },
      },
      {
        id: 'd2',
        name: 'Sparkling water',
        quantity: '1 case',
        claimedBy: null,
      },
      {
        id: 'd3',
        name: 'Cocktail mixers',
        quantity: 'Assorted',
        claimedBy: { name: 'James R.' },
      },
    ],
  },
  {
    id: 'sides',
    label: 'Sides & Extras',
    emoji: '🥗',
    items: [
      {
        id: 's1',
        name: 'Dinner rolls',
        quantity: '1 dozen',
        claimedBy: null,
      },
      {
        id: 's2',
        name: 'Garden salad',
        quantity: '1 large bowl',
        claimedBy: { name: 'Emily T.' },
      },
    ],
  },
  {
    id: 'supplies',
    label: 'Supplies',
    emoji: '🧊',
    items: [
      {
        id: 'u1',
        name: 'Ice',
        quantity: '2 bags',
        claimedBy: null,
      },
      {
        id: 'u2',
        name: 'Extra napkins',
        quantity: '1 pack',
        claimedBy: { name: 'Sarah M.' },
      },
      {
        id: 'u3',
        name: 'Candles',
        quantity: '6',
        claimedBy: null,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  return (name[0] ?? '?').toUpperCase()
}

function countClaimed(categories: BringCategory[]): { claimed: number; total: number } {
  let claimed = 0
  let total = 0
  for (const cat of categories) {
    for (const item of cat.items) {
      total++
      if (item.claimedBy) claimed++
    }
  }
  return { claimed, total }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ItemRow({ item }: { item: BringItem }) {
  const isClaimed = !!item.claimedBy

  return (
    <div className="flex items-center gap-3 rounded-lg bg-stone-900/40 px-3 py-2.5 group hover:bg-stone-900/60 transition-colors">
      {/* Status dot */}
      <span
        className={cn(
          'h-2 w-2 rounded-full flex-shrink-0',
          isClaimed ? 'bg-emerald-500' : 'bg-stone-600'
        )}
      />

      {/* Name + quantity */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-stone-200">{item.name}</span>
        <span className="ml-2 text-xs text-stone-500">{item.quantity}</span>
      </div>

      {/* Claimed-by or claim button */}
      {isClaimed ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.claimedBy!.avatarUrl ? (
            <img
              src={item.claimedBy!.avatarUrl}
              alt={item.claimedBy!.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900/40 text-[10px] font-semibold text-emerald-400">
              {getInitial(item.claimedBy!.name)}
            </div>
          )}
          <span className="text-xs text-stone-400">{item.claimedBy!.name}</span>
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
        >
          Claim
        </button>
      )}
    </div>
  )
}

function CategorySection({ category }: { category: BringCategory }) {
  const [open, setOpen] = useState(true)
  const claimed = category.items.filter((i) => i.claimedBy).length

  return (
    <div className="rounded-xl bg-stone-800/50 border border-stone-700/30 overflow-hidden">
      {/* Category header (collapsible) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-700/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{category.emoji}</span>
          <span className="text-sm font-semibold text-stone-100">{category.label}</span>
          <span className="text-xs text-stone-500">
            {claimed}/{category.items.length} claimed
          </span>
        </div>
        <svg
          className={cn(
            'h-4 w-4 text-stone-500 transition-transform',
            open ? 'rotate-0' : '-rotate-90'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Items */}
      {open && (
        <div className="space-y-1 px-3 pb-3">
          {category.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function AddItemPlaceholder() {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Add an item..."
        disabled
        className="flex-1 rounded-lg border border-stone-700/30 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-300 placeholder-stone-600 focus:outline-none focus:border-stone-600"
      />
      <button
        type="button"
        disabled
        className="rounded-lg bg-brand-500/50 px-4 py-2.5 text-sm font-semibold text-white/50 cursor-not-allowed"
      >
        Add
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800 text-3xl mb-4">
        🧺
      </div>
      <h3 className="text-lg font-semibold text-stone-200 mb-1">Nothing on the list yet</h3>
      <p className="text-sm text-stone-400 mb-4">
        Add items guests can claim to bring to the dinner.
      </p>
      <button
        type="button"
        className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
      >
        Add First Item
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function WhatToBringChannel({ circle: _circle }: Props) {
  // Using sample data since CircleDetail has no bring-list field yet
  const categories = SAMPLE_DATA
  const { claimed, total } = countClaimed(categories)
  const isEmpty = total === 0

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-100">
            <span>🧺</span> What to Bring
          </h2>
          {!isEmpty && (
            <p className="mt-0.5 text-sm text-stone-400">
              {claimed} of {total} items claimed
            </p>
          )}
        </div>

        {/* Toggle placeholder */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Allow Guest Contributions</span>
          <button
            type="button"
            className="relative h-5 w-9 rounded-full bg-stone-700 transition-colors"
            aria-label="Toggle guest contributions"
          >
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-stone-400 transition-transform" />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${total > 0 ? (claimed / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Category sections */}
          <div className="space-y-3">
            {categories.map((cat) => (
              <CategorySection key={cat.id} category={cat} />
            ))}
          </div>

          {/* Add item placeholder */}
          <AddItemPlaceholder />
        </>
      )}
    </div>
  )
}
