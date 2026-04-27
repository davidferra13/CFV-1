'use client'

// Legacy component: now wraps TiptapEditor for full rich text support.
// Same API so any future imports still work.

import { TiptapEditor, type TiptapEditorProps } from './tiptap-editor'

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
  return (
    <TiptapEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      className={className}
      compact
    />
  )
}

export { TiptapEditor, type TiptapEditorProps }
