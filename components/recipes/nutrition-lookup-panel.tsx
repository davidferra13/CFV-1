'use client'

import { useState, useTransition } from 'react'
import { searchNutritionAction, searchFdcAction } from '@/lib/nutrition/actions'
import type { NutritionResult } from '@/lib/nutrition/open-food-facts'
import type { FdcNutritionResult } from '@/lib/nutrition/usda-fdc'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface NutritionLookupPanelProps {
  defaultQuery?: string
}

type Tab = 'off' | 'usda'

// ─── Shared sub-components ────────────────────────────────────────────────

function NutriRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null
  return (
    <div className="flex justify-between text-sm py-1 border-b border-stone-800 last:border-0">
      <span className="text-stone-400">{label}</span>
      <span className="font-medium text-stone-100">
        {value % 1 === 0 ? value : value.toFixed(1)} {unit}
      </span>
    </div>
  )
}

function NutriscoreBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    a: 'bg-green-600',
    b: 'bg-lime-500',
    c: 'bg-yellow-400',
    d: 'bg-orange-500',
    e: 'bg-red-600',
  }
  const bg = colors[grade.toLowerCase()] ?? 'bg-stone-400'
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold uppercase ${bg}`}
    >
      {grade}
    </span>
  )
}

function NutritionDetail({
  data,
  onBack,
  source,
}: {
  data: {
    name: string
    brand?: string
    nutriscore?: string
    per100g: NutritionResult['per100g'] | FdcNutritionResult['per100g']
  }
  onBack: () => void
  source: string
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-stone-100">{data.name}</p>
          {data.brand && <p className="text-xs text-stone-500">{data.brand}</p>}
        </div>
        <div className="flex items-center gap-2">
          {data.nutriscore && <NutriscoreBadge grade={data.nutriscore} />}
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-400">
            ← Back
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-400 mb-2">Per 100 g</p>
      <div className="border border-stone-700 rounded-md px-3 py-1">
        <NutriRow label="Calories" value={data.per100g.calories} unit="kcal" />
        <NutriRow label="Protein" value={data.per100g.protein} unit="g" />
        <NutriRow label="Fat" value={data.per100g.fat} unit="g" />
        <NutriRow label="Carbohydrates" value={data.per100g.carbs} unit="g" />
        <NutriRow label="Fiber" value={data.per100g.fiber} unit="g" />
        <NutriRow label="Sugar" value={data.per100g.sugar} unit="g" />
        <NutriRow label="Sodium" value={data.per100g.sodium} unit="mg" />
      </div>
      <p className="text-xs text-stone-400 mt-2 text-right">Source: {source}</p>
    </div>
  )
}

// ─── Open Food Facts tab ──────────────────────────────────────────────────

function OffTab({ defaultQuery }: { defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<NutritionResult[]>([])
  const [selected, setSelected] = useState<NutritionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  function handleSearch() {
    if (!query.trim()) return
    setSearched(true)
    setSelected(null)
    startTransition(async () => setResults(await searchNutritionAction(query)))
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search packaged food or dish…"
          className="flex-1 rounded-md border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button variant="primary" onClick={handleSearch} disabled={isPending}>
          {isPending ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {searched && !isPending && results.length === 0 && (
        <p className="text-sm text-stone-500">No results. Try a different term.</p>
      )}

      {results.length > 0 && !selected && (
        <ul className="divide-y divide-stone-800 border border-stone-700 rounded-md overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => setSelected(r)}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-3 transition-colors"
              >
                {r.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">{r.name}</p>
                  {r.brand && <p className="text-xs text-stone-500 truncate">{r.brand}</p>}
                </div>
                {r.nutriscore && (
                  <div className="ml-auto flex-shrink-0">
                    <NutriscoreBadge grade={r.nutriscore} />
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <NutritionDetail
          data={selected}
          onBack={() => setSelected(null)}
          source="Open Food Facts"
        />
      )}
    </div>
  )
}

// ─── USDA FDC tab ─────────────────────────────────────────────────────────

function UsdaTab({ defaultQuery }: { defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<FdcNutritionResult[]>([])
  const [selected, setSelected] = useState<FdcNutritionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  function handleSearch() {
    if (!query.trim()) return
    setSearched(true)
    setSelected(null)
    startTransition(async () => setResults(await searchFdcAction(query)))
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search whole ingredient (e.g. chicken breast)…"
          className="flex-1 rounded-md border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button variant="primary" onClick={handleSearch} disabled={isPending}>
          {isPending ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {searched && !isPending && results.length === 0 && (
        <p className="text-sm text-stone-500">No results. Try a different term.</p>
      )}

      {results.length > 0 && !selected && (
        <ul className="divide-y divide-stone-800 border border-stone-700 rounded-md overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => setSelected(r)}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-start gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">{r.name}</p>
                  <p className="text-xs text-stone-400">{r.dataType}</p>
                </div>
                {r.per100g.calories != null && (
                  <span className="ml-auto text-xs text-stone-500 whitespace-nowrap flex-shrink-0">
                    {Math.round(r.per100g.calories)} kcal
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <NutritionDetail
          data={selected}
          onBack={() => setSelected(null)}
          source="USDA FoodData Central"
        />
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────

export function NutritionLookupPanel({ defaultQuery = '' }: NutritionLookupPanelProps) {
  const [tab, setTab] = useState<Tab>('off')

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: 'off', label: 'Open Food Facts', hint: 'Packaged foods, products, branded items' },
    { id: 'usda', label: 'USDA FDC', hint: 'Raw ingredients, whole foods, USDA database' },
  ]

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-stone-100 mb-1">Nutrition Lookup</h3>
      <p className="text-xs text-stone-500 mb-4">
        Per-100 g nutritional data from two free databases — no API key required
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-stone-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
              tab === t.id
                ? 'bg-stone-900 border border-b-white border-stone-700 text-stone-100 -mb-px'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-400 mb-3">{tabs.find((t) => t.id === tab)?.hint}</p>

      {tab === 'off' && <OffTab defaultQuery={defaultQuery} />}
      {tab === 'usda' && <UsdaTab defaultQuery={defaultQuery} />}
    </Card>
  )
}
