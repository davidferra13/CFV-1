'use client'

import { useState, useRef, type KeyboardEvent } from 'react'

type TagArrayInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  label?: string
  id?: string
  maxTags?: number
  suggestions?: string[]
}

export function TagArrayInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  label,
  id,
  maxTags = 50,
  suggestions,
}: TagArrayInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) return
    if (value.length >= maxTags) return
    onChange([...value, trimmed])
    setInput('')
    setShowSuggestions(false)
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const filteredSuggestions = suggestions
    ?.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s))
    .slice(0, 6)

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
          {label}
        </label>
      )}
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-lg border border-zinc-700 bg-zinc-800/50 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/30 transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-700 text-zinc-200 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(i)
              }}
              className="text-zinc-400 hover:text-zinc-100 ml-0.5"
              aria-label={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) addTag(input)
            setTimeout(() => setShowSuggestions(false), 150)
          }}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="mt-1 rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg max-h-36 overflow-y-auto">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="block w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
