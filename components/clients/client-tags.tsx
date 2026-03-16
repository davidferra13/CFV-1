'use client'

// Client Tags - inline tag manager on the client detail page.
// Shows existing tags as removable pills, plus an add-tag input with
// autocomplete suggestions from the chef's existing tag vocabulary.

import { useState, useRef } from 'react'
import { addClientTag, removeClientTag } from '@/lib/clients/tag-actions'
import { X, Plus } from '@/components/ui/icons'

interface ClientTagsProps {
  clientId: string
  initialTags: string[]
  suggestedTags?: string[] // All tags used by this chef (for autocomplete)
}

export function ClientTags({ clientId, initialTags, suggestedTags = [] }: ClientTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [inputValue, setInputValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = suggestedTags.filter(
    (t) => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t)
  )

  async function handleAdd(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) {
      setInputValue('')
      setIsAdding(false)
      return
    }
    setTags((prev) => [...prev, trimmed].sort())
    setInputValue('')
    setIsAdding(false)
    setShowSuggestions(false)
    await addClientTag(clientId, trimmed)
  }

  async function handleRemove(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
    await removeClientTag(clientId, tag)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing tags */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700"
        >
          {tag}
          <button
            onClick={() => handleRemove(tag)}
            className="hover:text-red-500 transition-colors ml-0.5"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* Add tag */}
      {isAdding ? (
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd(inputValue)
              if (e.key === 'Escape') {
                setIsAdding(false)
                setInputValue('')
              }
            }}
            onBlur={() => {
              // Small delay to allow suggestion click to fire
              setTimeout(() => {
                setIsAdding(false)
                setInputValue('')
                setShowSuggestions(false)
              }, 150)
            }}
            placeholder="Tag name…"
            maxLength={50}
            className="text-xs border border-stone-600 rounded-full px-2.5 py-0.5 w-32 focus:outline-none focus:border-brand-400"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-stone-900 border border-stone-700 rounded-md shadow-md min-w-[140px]">
              {filtered.slice(0, 6).map((t) => (
                <button
                  key={t}
                  onMouseDown={() => handleAdd(t)}
                  className="block w-full text-left text-xs px-3 py-1.5 hover:bg-stone-800 text-stone-300"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-brand-600 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add tag
        </button>
      )}
    </div>
  )
}
