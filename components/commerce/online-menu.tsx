// Online Menu - responsive grid of menu items grouped by category
'use client'

import { useState, useRef } from 'react'
import type { OnlineMenuCategory, OnlineMenuItem } from '@/lib/commerce/online-order-actions'

type Props = {
  categories: OnlineMenuCategory[]
  onAddToCart: (
    item: OnlineMenuItem,
    quantity: number,
    modifiers?: Array<{ name: string; option: string; priceDeltaCents: number }>,
    notes?: string
  ) => void
}

const DIETARY_BADGES: Record<string, { label: string; color: string }> = {
  vegetarian: { label: 'V', color: 'bg-green-100 text-green-200' },
  vegan: { label: 'VG', color: 'bg-green-100 text-green-200' },
  'gluten-free': { label: 'GF', color: 'bg-amber-100 text-amber-200' },
  gluten_free: { label: 'GF', color: 'bg-amber-100 text-amber-200' },
  'dairy-free': { label: 'DF', color: 'bg-blue-100 text-blue-200' },
  dairy_free: { label: 'DF', color: 'bg-blue-100 text-blue-200' },
  'nut-free': { label: 'NF', color: 'bg-orange-100 text-orange-200' },
  nut_free: { label: 'NF', color: 'bg-orange-100 text-orange-200' },
  halal: { label: 'H', color: 'bg-teal-100 text-teal-200' },
  kosher: { label: 'K', color: 'bg-purple-100 text-purple-200' },
  spicy: { label: 'Spicy', color: 'bg-red-100 text-red-200' },
}

export function OnlineMenu({ categories, onAddToCart }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.category ?? '')
  const [selectedItem, setSelectedItem] = useState<OnlineMenuItem | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function scrollToCategory(cat: string) {
    setActiveCategory(cat)
    const el = sectionRefs.current[cat]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-stone-200">
        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => scrollToCategory(cat.category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.category
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Menu sections */}
      {categories.map((cat) => (
        <div
          key={cat.category}
          ref={(el) => {
            sectionRefs.current[cat.category] = el
          }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-stone-900 mb-4">{cat.label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cat.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={() => {
                  if (item.modifiers && item.modifiers.length > 0) {
                    setSelectedItem(item)
                  } else {
                    onAddToCart(item, 1)
                  }
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Modifier selection modal */}
      {selectedItem && (
        <ModifierModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(quantity, modifiers, notes) => {
            onAddToCart(selectedItem, quantity, modifiers, notes)
            setSelectedItem(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Menu Item Card ───────────────────────────────────────────────

function MenuItemCard({ item, onAdd }: { item: OnlineMenuItem; onAdd: () => void }) {
  const priceFormatted = `$${(item.price_cents / 100).toFixed(2)}`
  const dietaryTags = item.dietary_tags ?? []

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-900">{item.name}</h3>
          <span className="text-stone-900 font-medium whitespace-nowrap">{priceFormatted}</span>
        </div>
        {item.description && (
          <p className="text-stone-500 text-sm mt-1 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {dietaryTags.map((tag) => {
            const badge = DIETARY_BADGES[tag.toLowerCase()]
            if (!badge) return null
            return (
              <span
                key={tag}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}
              >
                {badge.label}
              </span>
            )
          })}
          <div className="flex-1" />
          <button
            onClick={onAdd}
            className="bg-stone-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modifier Modal ───────────────────────────────────────────────

function ModifierModal({
  item,
  onClose,
  onConfirm,
}: {
  item: OnlineMenuItem
  onClose: () => void
  onConfirm: (
    quantity: number,
    modifiers: Array<{ name: string; option: string; priceDeltaCents: number }>,
    notes: string
  ) => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [notes, setNotes] = useState('')

  // Initialize defaults
  const modifiers = item.modifiers ?? []

  function handleSelect(groupName: string, optionLabel: string, selType: string) {
    setSelections((prev) => {
      const current = prev[groupName] ?? []
      if (selType === 'single') {
        return { ...prev, [groupName]: [optionLabel] }
      }
      // multiple
      if (current.includes(optionLabel)) {
        return { ...prev, [groupName]: current.filter((o) => o !== optionLabel) }
      }
      return { ...prev, [groupName]: [...current, optionLabel] }
    })
  }

  function handleConfirm() {
    const selectedModifiers: Array<{ name: string; option: string; priceDeltaCents: number }> = []
    for (const group of modifiers) {
      const selected = selections[group.name] ?? []
      for (const optLabel of selected) {
        const opt = group.options.find((o) => o.label === optLabel)
        if (opt) {
          selectedModifiers.push({
            name: group.name,
            option: opt.label,
            priceDeltaCents: opt.price_delta_cents,
          })
        }
      }
    }
    onConfirm(quantity, selectedModifiers, notes)
  }

  const modifierTotal = Object.entries(selections).reduce((total, [groupName, opts]) => {
    const group = modifiers.find((m) => m.name === groupName)
    if (!group) return total
    return (
      total +
      opts.reduce((sum, optLabel) => {
        const opt = group.options.find((o) => o.label === optLabel)
        return sum + (opt?.price_delta_cents ?? 0)
      }, 0)
    )
  }, 0)

  const itemTotal = (item.price_cents + modifierTotal) * quantity

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{item.name}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">
            &times;
          </button>
        </div>

        {/* Modifier groups */}
        <div className="p-4 space-y-6">
          {modifiers.map((group) => {
            const selType = (group as any).selectionType || 'single'
            const required = (group as any).required ?? false
            const selected = selections[group.name] ?? []

            return (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-stone-900">{group.name}</span>
                  {required && (
                    <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                  {selType === 'multiple' && (
                    <span className="text-xs text-stone-400">Select multiple</span>
                  )}
                </div>
                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = selected.includes(opt.label)
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleSelect(group.name, opt.label, selType)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-sm text-stone-200">{opt.label}</span>
                        {opt.price_delta_cents > 0 && (
                          <span className="text-sm text-stone-500">
                            +${(opt.price_delta_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Special instructions */}
          <div>
            <label className="block text-sm font-medium text-stone-200 mb-1">
              Special instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests?"
              className="w-full border border-stone-200 rounded-lg p-2 text-sm text-stone-200 placeholder:text-stone-400 resize-none"
              rows={2}
            />
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100"
            >
              -
            </button>
            <span className="text-lg font-medium text-stone-900 w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-100"
            >
              +
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200">
          <button
            onClick={handleConfirm}
            className="w-full bg-stone-900 text-white py-3 rounded-lg font-medium hover:bg-stone-800 transition-colors"
          >
            Add to Cart - ${(itemTotal / 100).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
