'use client'

import { useState, useTransition } from 'react'
import { addCulinaryWord } from '@/lib/culinary-words/actions'
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/culinary-words/constants'
import type { WordCategory, WordTier } from '@/lib/culinary-words/constants'

type AddWordDialogProps = {
  onAdded?: () => void
}

export function AddWordDialog({ onAdded }: AddWordDialogProps) {
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [category, setCategory] = useState<WordCategory>('texture')
  const [tier, setTier] = useState<WordTier>(3)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!word.trim()) {
      setError('Please enter a word')
      return
    }

    startTransition(async () => {
      try {
        await addCulinaryWord({ word: word.trim(), category, tier })
        setWord('')
        setCategory('texture')
        setTier(3)
        setOpen(false)
        onAdded?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add word')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Add Word
      </button>
    )
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4 bg-stone-900 shadow-sm max-w-md">
      <h3 className="font-semibold text-stone-100 mb-3">Add a Word</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Word input */}
        <div>
          <label htmlFor="cw-word" className="block text-sm font-medium text-stone-300 mb-1">
            Word or Phrase
          </label>
          <input
            id="cw-word"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. Velvety, Brûléed, Umami Bomb"
            maxLength={60}
            className="w-full px-3 py-2 border border-stone-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Category select */}
        <div>
          <label htmlFor="cw-category" className="block text-sm font-medium text-stone-300 mb-1">
            Category
          </label>
          <select
            id="cw-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as WordCategory)}
            className="w-full px-3 py-2 border border-stone-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Tier select */}
        <div>
          <label htmlFor="cw-tier" className="block text-sm font-medium text-stone-300 mb-1">
            Importance Tier
          </label>
          <select
            id="cw-tier"
            value={tier}
            onChange={(e) => setTier(Number(e.target.value) as WordTier)}
            className="w-full px-3 py-2 border border-stone-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value={1}>Tier 1 - Foundational (huge on board)</option>
            <option value={2}>Tier 2 - Essential (large)</option>
            <option value={3}>Tier 3 - Core (medium)</option>
            <option value={4}>Tier 4 - Advanced (small)</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add to My Board'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
            className="px-4 py-2 rounded-md border border-stone-600 text-stone-300 text-sm hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
