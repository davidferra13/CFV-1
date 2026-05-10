'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useState, useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
} from 'lucide-react'
import './rich-text-editor-styles.css'

/* ------------------------------------------------------------------ */
/*  Color presets (ChefFlow dark theme)                                */
/* ------------------------------------------------------------------ */

const TEXT_COLORS = [
  { label: 'Default', value: '#e7e5e4' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Red', value: '#f87171' },
  { label: 'Green', value: '#34d399' },
  { label: 'Blue', value: '#38bdf8' },
  { label: 'Purple', value: '#a78bfa' },
]

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Amber', value: '#f59e0b33' },
  { label: 'Red', value: '#ef444433' },
  { label: 'Green', value: '#10b98133' },
  { label: 'Blue', value: '#0ea5e933' },
  { label: 'Purple', value: '#8b5cf633' },
]

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 150,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      // TipTap emits '<p></p>' for empty content; normalize to empty string
      if (html === '<p></p>') {
        onChange('')
      } else {
        onChange(html)
      }
    },
    editorProps: {
      attributes: {
        class: 'px-3 py-2 text-sm text-stone-100 min-h-[inherit] cursor-text',
        style: `min-height: ${minHeight}px`,
      },
    },
    // Prevent SSR hydration mismatch
    immediatelyRender: false,
  })

  // Sync external value changes (e.g. when config reloads)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current === '<p></p>' && !value) return
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      className={`border border-stone-700 rounded-lg overflow-hidden focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition ${className}`}
    >
      <EditorToolbar editor={editor} />
      <div className="bg-stone-950">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-stone-800 border-b border-stone-700">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Colors */}
      <ColorPicker
        colors={TEXT_COLORS}
        activeColor={editor.getAttributes('textStyle').color}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        icon={<Palette className="h-3.5 w-3.5" />}
        title="Text Color"
      />
      <ColorPicker
        colors={HIGHLIGHT_COLORS}
        activeColor={editor.getAttributes('highlight').color ?? ''}
        onSelect={(color) => {
          if (!color) {
            editor.chain().focus().unsetHighlight().run()
          } else {
            editor.chain().focus().toggleHighlight({ color }).run()
          }
        }}
        icon={<Highlighter className="h-3.5 w-3.5" />}
        title="Highlight Color"
      />

      <ToolbarDivider />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
            return
          }
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }
        }}
        isActive={editor.isActive('link')}
        title="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        title="Undo"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        title="Redo"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toolbar primitives                                                 */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-brand-500/20 text-brand-400'
          : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-stone-600 mx-1" />
}

function ColorPicker({
  colors,
  activeColor,
  onSelect,
  icon,
  title,
}: {
  colors: Array<{ label: string; value: string }>
  activeColor: string | undefined
  onSelect: (color: string) => void
  icon: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)

  // Close on outside click
  const handleBlur = useCallback(() => {
    // Small delay so the swatch click registers before close
    setTimeout(() => setOpen(false), 150)
  }, [])

  return (
    <div className="relative" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={title}
        className="p-1.5 rounded text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-stone-800 border border-stone-600 rounded-lg shadow-xl z-50 flex gap-1.5">
          {colors.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                onSelect(c.value)
                setOpen(false)
              }}
              title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                activeColor === c.value ? 'border-white scale-110' : 'border-stone-600'
              }`}
              style={{
                backgroundColor: c.value || 'transparent',
                // Show a checkerboard-ish pattern for "None"
                ...(c.value === '' && {
                  background:
                    'repeating-conic-gradient(#57534e 0% 25%, #292524 0% 50%) 50% / 8px 8px',
                }),
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
