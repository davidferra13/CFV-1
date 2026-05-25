'use client'

import { useState, useMemo } from 'react'
import { ConditionCard } from '@/components/reference/condition-card'
import {
  searchConditions,
  filterByCategory,
  getConditionCategories,
  CONDITION_CATEGORY_LABELS,
} from '@/lib/reference/dietary-conditions'
import type { ConditionCategory } from '@/lib/reference/types'
import { Search, ShieldAlert } from '@/components/ui/icons'

export default function DietaryConditionsPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ConditionCategory | 'all'>('all')
  const categories = getConditionCategories()

  const results = useMemo(() => {
    let items =
      activeCategory === 'all' ? searchConditions(query) : filterByCategory(activeCategory)
    if (activeCategory !== 'all' && query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.avoidList.some((a) => a.toLowerCase().includes(q))
      )
    }
    return items
  }, [query, activeCategory])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-stone-100">
            Allergy and Dietary Condition Reference
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            FDA Big 9 allergens, common intolerances, religious and lifestyle dietary needs. What to
            avoid, safe alternatives, and questions to ask clients.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conditions (celiac, nut allergy, vegan, kosher...)"
          className="w-full rounded-lg border border-stone-600 bg-stone-900 pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-400 focus:outline-none"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          All ({results.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {CONDITION_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-stone-500 text-sm">
            No conditions found. Try a different search term.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((condition) => (
            <ConditionCard key={condition.id} condition={condition} />
          ))}
        </div>
      )}
    </div>
  )
}
