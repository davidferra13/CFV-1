'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { useEffect, useCallback, useId } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  ListBullets,
  ListOrdered,
  Quote,
  Code,
  Link,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
} from '@/components/ui/icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TiptapEditorProps {
  /** HTML string value */
  value?: string
  /** Fires with HTML string on every change */
  onChange?: (html: string) => void
  placeholder?: string
  label?: string
  error?: string
  helperText?: string
  /** Minimum editor height in px */
  minHeight?: number
  className?: string
  /** Disable editing */
  disabled?: boolean
  /** Which toolbar groups to show. Default: all */
  toolbar?: ToolbarGroup[]
  /** Compact mode hides less-used buttons */
  compact?: boolean
}

type ToolbarGroup = 'text' | 'heading' | 'list' | 'alignment' | 'insert' | 'highlight'

const ALL_GROUPS: ToolbarGroup[] = ['text', 'heading', 'list', 'alignment', 'insert', 'highlight']

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-brand-600/30 text-brand-400'
          : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-stone-600 mx-0.5 shrink-0" />
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function EditorToolbar({ editor, groups }: { editor: Editor; groups: ToolbarGroup[] }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL:', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const iconSize = 'h-4 w-4'
  const show = (g: ToolbarGroup) => groups.includes(g)

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-stone-800 border-b border-stone-700 flex-wrap">
      {/* Text formatting */}
      {show('text') && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className={iconSize} />
          </ToolbarButton>
        </>
      )}

      {/* Headings */}
      {show('heading') && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className={iconSize} />
          </ToolbarButton>
        </>
      )}

      {/* Lists */}
      {show('list') && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <ListBullets className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className={iconSize} />
          </ToolbarButton>
        </>
      )}

      {/* Alignment */}
      {show('alignment') && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight className={iconSize} />
          </ToolbarButton>
        </>
      )}

      {/* Insert elements */}
      {show('insert') && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code block"
          >
            <Code className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            <Minus className={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
            <Link className={iconSize} />
          </ToolbarButton>
        </>
      )}

      {/* Highlight */}
      {show('highlight') && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className={iconSize} />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  label,
  error,
  helperText,
  minHeight = 150,
  className = '',
  disabled = false,
  toolbar = ALL_GROUPS,
  compact = false,
}: TiptapEditorProps) {
  const autoId = useId()
  const editorId = `tiptap-${autoId}`

  const groups = compact ? toolbar.filter((g) => ['text', 'list', 'insert'].includes(g)) : toolbar

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-brand-400 underline cursor-pointer' },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'tiptap-content outline-none',
        id: editorId,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
  })

  // Sync external value changes (e.g. form reset, AI draft injection)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    // Only update if external value genuinely differs (avoid cursor reset)
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  // Sync disabled state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  const errorId = error ? `${editorId}-error` : undefined
  const helperId = helperText && !error ? `${editorId}-helper` : undefined

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={editorId} className="block text-sm font-medium text-stone-300 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`border rounded-lg overflow-hidden transition-[border-color,box-shadow] duration-200 ${
          error
            ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-stone-600 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {editor && <EditorToolbar editor={editor} groups={groups} />}
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className="tiptap-editor-wrapper bg-stone-900"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 animate-fade-slide-up" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-sm text-stone-400">
          {helperText}
        </p>
      )}
    </div>
  )
}

export default TiptapEditor
