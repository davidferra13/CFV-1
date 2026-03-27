// Generic combobox: text input + filterable dropdown from a provided list
// Keyboard-navigable (arrow keys, Enter to select, Escape to close)
// No external API calls, purely client-side
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export type ComboboxOption = {
  value: string // stored value
  label: string // display text
  subtitle?: string // secondary line
}

type ComboboxInputProps = {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  onSelect?: (option: ComboboxOption) => void
  placeholder?: string
  allowFreeText?: boolean
  className?: string
  id?: string
  name?: string
  required?: boolean
}

export function ComboboxInput({
  value,
  onChange,
  options,
  onSelect,
  placeholder,
  allowFreeText = true,
  className,
  id,
  name,
  required,
}: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter options based on input
  const filtered = value.trim()
    ? options.filter((opt) => {
        const term = value.toLowerCase()
        return (
          opt.label.toLowerCase().includes(term) ||
          opt.value.toLowerCase().includes(term) ||
          (opt.subtitle && opt.subtitle.toLowerCase().includes(term))
        )
      })
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlight when filtered options change
  useEffect(() => {
    setHighlightIndex(-1)
  }, [value])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const selectOption = useCallback(
    (option: ComboboxOption) => {
      onChange(option.value)
      onSelect?.(option)
      setIsOpen(false)
      setHighlightIndex(-1)
    },
    [onChange, onSelect]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true)
      e.preventDefault()
      return
    }

    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectOption(filtered[highlightIndex])
        } else if (!allowFreeText && filtered.length > 0) {
          selectOption(filtered[0])
        } else {
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightIndex(-1)
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const defaultClass =
    'w-full rounded-xl border border-stone-600 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  // Highlight matching portion
  function highlightMatch(text: string) {
    if (!value.trim()) return text
    const idx = text.toLowerCase().indexOf(value.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-brand-400 font-medium">{text.slice(idx, idx + value.length)}</span>
        {text.slice(idx + value.length)}
      </>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        required={required}
        className={className || defaultClass}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (filtered.length > 0) setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-stone-600 bg-stone-900 shadow-lg"
          role="listbox"
        >
          {filtered.slice(0, 20).map((option, i) => (
            <li
              key={option.value}
              role="option"
              aria-selected={i === highlightIndex}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur before click registers
                selectOption(option)
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <div>{highlightMatch(option.label)}</div>
              {option.subtitle && (
                <div className="text-xs text-stone-500 mt-0.5">{option.subtitle}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && value.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-500 shadow-lg">
          No matches found
        </div>
      )}
    </div>
  )
}
