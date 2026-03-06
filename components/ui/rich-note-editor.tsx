'use client'
import { useRef } from 'react'
import { Bold, Italic, List, Link as LinkIcon } from '@/components/ui/icons'

interface RichNoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

export function RichNoteEditor({
  value,
  onChange,
  placeholder = 'Add notes...',
  minHeight = 120,
  className = '',
}: RichNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertAtCursor(before: string, after = '') {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(newValue)
    // Restore cursor
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  return (
    <div
      className={`border border-stone-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-stone-800 border-b border-stone-700">
        <button
          type="button"
          onClick={() => insertAtCursor('**', '**')}
          className="p-1.5 rounded hover:bg-stone-700 text-stone-400"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('*', '*')}
          className="p-1.5 rounded hover:bg-stone-700 text-stone-400"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('\n- ')}
          className="p-1.5 rounded hover:bg-stone-700 text-stone-400"
          title="List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-stone-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) insertAtCursor('[', `](${url})`)
          }}
          className="p-1.5 rounded hover:bg-stone-700 text-stone-400"
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full px-3 py-2 text-sm text-stone-100 resize-y focus:outline-none bg-stone-900"
      />
      {/* Preview hint */}
      {value && (
        <div className="px-3 py-1.5 bg-stone-800 border-t border-stone-700">
          <pre className="whitespace-pre-wrap text-xs text-stone-500 font-sans line-clamp-2">
            {value}
          </pre>
        </div>
      )}
    </div>
  )
}
