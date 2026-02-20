// Tag Input — reusable component for editing string arrays
// Used for dietary_restrictions, allergies, favorite_cuisines, etc.

'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  label?: string
  helperText?: string
  suggestions?: string[]
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter', label, helperText, suggestions }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const filteredSuggestions = suggestions?.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  ) || []

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          {label}
        </label>
      )}
      <div
        className="flex flex-wrap gap-1.5 p-2 border border-stone-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 min-h-[42px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i) }}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => { setTimeout(() => setShowSuggestions(false), 150) }}
            placeholder={value.length === 0 ? placeholder : ''}
            className="w-full border-0 p-0 py-0.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0 bg-transparent"
          />
          {showSuggestions && input && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
                  className="block w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {helperText && (
        <p className="mt-1 text-xs text-stone-500">{helperText}</p>
      )}
    </div>
  )
}
