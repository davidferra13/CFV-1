'use client'

// CocktailBrowserPanel — Search TheCocktailDB for cocktail recipes.
// Shows cocktail name, thumbnail, glass type, ingredients, and instructions.
// Used in the menu editor sidebar to help chefs pair cocktails with courses.

import { useState, useTransition } from 'react'
import {
  searchCocktailsAction,
  searchCocktailsByIngredientAction,
  getCocktailByIdAction,
} from '@/lib/food/actions'
import type { Cocktail } from '@/lib/cocktails/cocktail-db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface CocktailBrowserPanelProps {
  /** Called when the chef wants to add a cocktail to the menu as a drink pairing */
  onSelectCocktail?: (cocktail: {
    name: string
    glass: string
    ingredients: string
    instructions: string
    thumbnail: string
    alcoholic: boolean
  }) => void
}

function CocktailDetail({
  cocktail,
  onBack,
  onAdd,
}: {
  cocktail: Cocktail
  onBack: () => void
  onAdd?: (cocktail: Cocktail) => void
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {cocktail.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cocktail.thumbnail + '/preview'}
              alt={cocktail.name}
              width={64}
              height={64}
              className="rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100">{cocktail.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant={cocktail.alcoholic ? 'warning' : 'success'}>
                {cocktail.alcoholic ? 'Alcoholic' : 'Non-alcoholic'}
              </Badge>
              {cocktail.glass && <span className="text-xs text-stone-500">{cocktail.glass}</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-stone-400 hover:text-stone-200 flex-shrink-0"
        >
          Back
        </button>
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-xs font-semibold text-stone-400 mb-1.5">Ingredients</p>
        <div className="space-y-1">
          {cocktail.ingredients.map((ing, i) => (
            <div key={i} className="flex justify-between text-sm py-0.5">
              <span className="text-stone-300">{ing.ingredient}</span>
              {ing.measure && <span className="text-stone-500 text-xs">{ing.measure}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {cocktail.instructions && (
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-1">Instructions</p>
          <p className="text-xs text-stone-500 leading-relaxed">{cocktail.instructions}</p>
        </div>
      )}

      {/* Category */}
      {cocktail.category && <Badge variant="default">{cocktail.category}</Badge>}

      {/* Add to menu button */}
      {onAdd && (
        <Button variant="primary" size="sm" onClick={() => onAdd(cocktail)} className="w-full">
          Use as beverage pairing
        </Button>
      )}

      <p className="text-[10px] text-stone-600 text-right">Source: TheCocktailDB</p>
    </div>
  )
}

export function CocktailBrowserPanel({ onSelectCocktail }: CocktailBrowserPanelProps) {
  const [mode, setMode] = useState<'name' | 'ingredient'>('name')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Cocktail[]>([])
  const [ingredientResults, setIngredientResults] = useState<
    { id: string; name: string; thumbnail: string }[]
  >([])
  const [selected, setSelected] = useState<Cocktail | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searched, setSearched] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    setSearched(true)
    setSelected(null)
    setResults([])
    setIngredientResults([])

    if (mode === 'ingredient') {
      startTransition(async () => {
        try {
          const items = await searchCocktailsByIngredientAction(query.trim())
          setIngredientResults(items)
        } catch (err) {
          toast.error('Failed to search cocktails by ingredient')
        }
      })
    } else {
      startTransition(async () => {
        try {
          const cocktails = await searchCocktailsAction(query.trim())
          setResults(cocktails)
        } catch (err) {
          toast.error('Failed to search cocktails')
        }
      })
    }
  }

  const handleSelectFromIngredient = (id: string) => {
    startTransition(async () => {
      try {
        const cocktail = await getCocktailByIdAction(id)
        if (cocktail) {
          setSelected(cocktail)
        }
      } catch (err) {
        toast.error('Failed to load cocktail details')
      }
    })
  }

  const handleAdd = (cocktail: Cocktail) => {
    if (onSelectCocktail) {
      onSelectCocktail({
        name: cocktail.name,
        glass: cocktail.glass,
        ingredients: cocktail.ingredients
          .map((i) => `${i.measure} ${i.ingredient}`.trim())
          .join(', '),
        instructions: cocktail.instructions,
        thumbnail: cocktail.thumbnail,
        alcoholic: cocktail.alcoholic,
      })
    }
  }

  const hasResults = mode === 'name' ? results.length > 0 : ingredientResults.length > 0
  const noResults = searched && !isPending && !hasResults && !selected

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-100">Cocktail Browser</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('name')
              setResults([])
              setIngredientResults([])
              setSelected(null)
              setSearched(false)
            }}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              mode === 'name'
                ? 'bg-purple-950 text-purple-400 border border-purple-700'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            By name
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('ingredient')
              setResults([])
              setIngredientResults([])
              setSelected(null)
              setSearched(false)
            }}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              mode === 'ingredient'
                ? 'bg-purple-950 text-purple-400 border border-purple-700'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            By spirit
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        {mode === 'name'
          ? 'Search cocktails by name (e.g. "Negroni", "Margarita")'
          : 'Search by base spirit (e.g. "gin", "vodka", "tequila")'}
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={mode === 'name' ? 'Cocktail name...' : 'Spirit or ingredient...'}
          className="flex-1 rounded-md border border-stone-600 px-3 py-2 text-sm bg-stone-900 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <Button variant="secondary" onClick={handleSearch} disabled={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* No results */}
      {noResults && (
        <p className="text-sm text-stone-500 text-center py-3">
          No cocktails found. Try a different search.
        </p>
      )}

      {/* Name search results */}
      {mode === 'name' && results.length > 0 && !selected && (
        <ul className="divide-y divide-stone-800 border border-stone-700 rounded-md overflow-hidden max-h-72 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-3 transition-colors"
              >
                {c.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail + '/preview'}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-100 truncate">{c.name}</p>
                  <p className="text-xs text-stone-500">
                    {c.glass}
                    {c.category && ` / ${c.category}`}
                  </p>
                </div>
                <Badge variant={c.alcoholic ? 'warning' : 'success'}>
                  {c.alcoholic ? 'Alc' : 'N/A'}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Ingredient search results (simplified — need lookup for detail) */}
      {mode === 'ingredient' && ingredientResults.length > 0 && !selected && (
        <ul className="divide-y divide-stone-800 border border-stone-700 rounded-md overflow-hidden max-h-72 overflow-y-auto">
          {ingredientResults.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelectFromIngredient(c.id)}
                disabled={isPending}
                className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                {c.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail + '/preview'}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded object-cover flex-shrink-0"
                  />
                )}
                <p className="text-sm font-medium text-stone-100 truncate">{c.name}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Selected cocktail detail */}
      {selected && (
        <CocktailDetail
          cocktail={selected}
          onBack={() => setSelected(null)}
          onAdd={onSelectCocktail ? handleAdd : undefined}
        />
      )}
    </Card>
  )
}
