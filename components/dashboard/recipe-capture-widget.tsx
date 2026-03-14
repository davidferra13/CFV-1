'use client'

// Recipe Quick Capture Widget (Phase 3, Widget 17)
// Lets the chef brain-dump a recipe as raw text. No AI, no parsing.
// First line becomes the name, full text saved as notes on a draft recipe.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createRecipeDraft } from '@/lib/recipes/actions'
import { BookOpen, Plus } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface RecipeCaptureWidgetProps {
  recipeDebt: number
}

export function RecipeCaptureWidget({ recipeDebt }: RecipeCaptureWidgetProps) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [savedCount, setSavedCount] = useState(0)

  function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) {
      toast.error('Write something first')
      return
    }

    const previousText = text
    const previousCount = savedCount

    // Optimistic: collapse and clear
    setText('')
    setExpanded(false)
    setSavedCount((c) => c + 1)

    startTransition(async () => {
      try {
        const result = await createRecipeDraft(trimmed)
        toast.success(`Draft saved: ${result.name}`)
      } catch (err) {
        // Rollback
        setText(previousText)
        setExpanded(true)
        setSavedCount(previousCount)
        toast.error('Failed to save recipe draft')
      }
    })
  }

  function handleCancel() {
    setText('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <div className="space-y-2">
        {recipeDebt > 0 && (
          <p className="text-xs text-amber-400">
            {recipeDebt} recipe{recipeDebt !== 1 ? 's' : ''} to document from recent events
          </p>
        )}
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-600 hover:border-brand-500 bg-stone-800/50 hover:bg-stone-800 px-4 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Quick capture recipe
        </button>
        {savedCount > 0 && (
          <p className="text-xs text-emerald-400">
            {savedCount} draft{savedCount !== 1 ? 's' : ''} saved this session
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recipeDebt > 0 && (
        <p className="text-xs text-amber-400">
          {recipeDebt} recipe{recipeDebt !== 1 ? 's' : ''} to document from recent events
        </p>
      )}
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-3">
        <div className="flex items-center gap-2 text-stone-300">
          <BookOpen className="h-4 w-4" />
          <span className="text-sm font-medium">Quick Capture</span>
        </div>
        <textarea
          autoFocus
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Brain dump your recipe here. Name, ingredients, rough method. You'll clean it up later."
          className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">First line becomes the recipe name</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isPending || !text.trim()}
            >
              {isPending ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
