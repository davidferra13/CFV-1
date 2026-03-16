'use client'

import { useState, useTransition } from 'react'
import { ChefHat, Link2, Unlink, Plus, Search, X } from '@/components/ui/icons'
import { linkRecipeToInquiry, unlinkRecipeFromInquiry } from '@/lib/inquiries/note-actions'
import { toast } from 'sonner'
import type { InquiryRecipeLink } from '@/lib/inquiries/note-actions'

// ============================================================
// Types
// ============================================================

interface RecipeOption {
  id: string
  name: string
  category: string
  description: string | null
  photo_url: string | null
}

interface InquiryRecipeLinkerProps {
  inquiryId: string
  initialLinks: InquiryRecipeLink[]
  availableRecipes: RecipeOption[]
}

// ============================================================
// Category display helper
// ============================================================

function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================
// Component
// ============================================================

export function InquiryRecipeLinker({
  inquiryId,
  initialLinks,
  availableRecipes,
}: InquiryRecipeLinkerProps) {
  const [links, setLinks] = useState<InquiryRecipeLink[]>(initialLinks)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingNote, setPendingNote] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Already-linked recipe IDs (to exclude from picker)
  const linkedIds = new Set(links.map((l) => l.recipe_id))

  // Filter available recipes by search + exclude already linked
  const filteredRecipes = availableRecipes.filter(
    (r) => !linkedIds.has(r.id) && r.name.toLowerCase().includes(search.toLowerCase())
  )

  // ---- Handlers ----

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId)
  }

  const handleLink = () => {
    if (!selectedRecipeId) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await linkRecipeToInquiry({
          inquiry_id: inquiryId,
          recipe_id: selectedRecipeId,
          note: pendingNote.trim() || null,
        })

        // Build the full link object from available data
        const recipe = availableRecipes.find((r) => r.id === selectedRecipeId)!
        const newLink: InquiryRecipeLink = {
          ...(result.link as any),
          recipe,
        }

        setLinks((prev) => [newLink, ...prev])
        setShowPicker(false)
        setSelectedRecipeId(null)
        setPendingNote('')
        setSearch('')
      } catch (err: any) {
        setError(err.message || 'Failed to link recipe')
      }
    })
  }

  const handleUnlink = (linkId: string) => {
    startTransition(async () => {
      try {
        await unlinkRecipeFromInquiry(linkId)
        setLinks((prev) => prev.filter((l) => l.id !== linkId))
      } catch (err) {
        toast.error('Failed to unlink recipe')
      }
    })
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="border border-stone-700 rounded-xl bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-stone-500" />
          <h3 className="font-semibold text-stone-100">Recipe Ideas</h3>
          <span className="text-xs text-stone-400">
            {links.length} recipe{links.length !== 1 ? 's' : ''} linked
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowPicker(!showPicker)
            setSelectedRecipeId(null)
            setSearch('')
            setPendingNote('')
          }}
          className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Recipe
        </button>
      </div>

      {/* Recipe picker */}
      {showPicker && (
        <div className="px-5 py-3 border-b border-stone-800 bg-stone-800 space-y-3">
          {!selectedRecipeId ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search your recipes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full text-sm border border-stone-600 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Recipe list */}
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg">
                {filteredRecipes.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">
                    {availableRecipes.length === 0
                      ? 'No recipes in your Recipe Book yet.'
                      : 'No matches found.'}
                  </p>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => handleSelectRecipe(recipe.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800 border border-transparent hover:border-stone-700 text-left transition-colors"
                    >
                      {recipe.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.photo_url}
                          alt={recipe.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0 border border-stone-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-stone-700 flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-4 h-4 text-stone-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-100 truncate">{recipe.name}</p>
                        <p className="text-[10px] text-stone-400">
                          {formatCategory(recipe.category)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            /* Confirm + add optional note */
            (() => {
              const recipe = availableRecipes.find((r) => r.id === selectedRecipeId)!
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-brand-500" />
                    <span className="text-sm font-medium text-stone-100">{recipe.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipeId(null)}
                      className="ml-auto text-stone-400 hover:text-stone-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    value={pendingNote}
                    onChange={(e) => setPendingNote(e.target.value)}
                    placeholder="Optional note (e.g. scale to 8 portions, use wild mushroom variation...)"
                    rows={2}
                    className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />

                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipeId(null)
                        setError(null)
                      }}
                      className="text-xs text-stone-500 hover:text-stone-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleLink}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                    >
                      Link Recipe
                    </button>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Linked recipes list */}
      <div className="divide-y divide-stone-50">
        {links.length === 0 && !showPicker && (
          <div className="px-5 py-8 text-center text-sm text-stone-400">
            No recipes linked yet. Click &quot;Link Recipe&quot; to connect one from your Recipe
            Book.
          </div>
        )}

        {links.map((link) => (
          <div key={link.id} className="px-5 py-3 group flex items-start gap-3">
            {link.recipe.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.recipe.photo_url}
                alt={link.recipe.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-5 h-5 text-stone-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-100">{link.recipe.name}</p>
              <p className="text-[10px] text-stone-400">{formatCategory(link.recipe.category)}</p>
              {link.note && <p className="text-xs text-stone-400 mt-0.5 italic">{link.note}</p>}
            </div>

            <button
              type="button"
              onClick={() => handleUnlink(link.id)}
              className="flex-shrink-0 p-1 text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="Remove link"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
