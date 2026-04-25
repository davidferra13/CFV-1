# Rich Text Editor for Dinner Circles

## Summary

Build a WYSIWYG rich text formatting toolbar for dinner circle organizers using TipTap (already installed, never wired up). Replace plain textareas for public-facing content fields with a real formatting editor. Store content as HTML strings in the existing JSONB `circle_config` column (no schema changes).

## Why

Circle organizers curate an experience. Plain text makes every circle look identical. A formatting toolbar (like Google Docs) lets them set tone through typography, color, and structure, making their listing feel branded and intentional.

## Architecture Decision

- **Editor library:** TipTap v3 (already in package.json: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` at v3.22.1, zero usage in codebase)
- **Storage format:** HTML strings in existing `DinnerCircleConfig` string fields (no type changes, no schema changes, no migrations)
- **Sanitization:** `dompurify` on render (prevents XSS)
- **Backward compatibility:** Existing plain text content renders correctly because TipTap treats plain text as paragraph content, and the renderer detects plain text vs HTML

---

## Phase 1: Install Dependencies

Run this ONE command:

```bash
npm install @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-placeholder dompurify && npm install -D @types/dompurify
```

Already installed (do NOT reinstall): `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`

---

## Phase 2: Create New Files (3 files)

### File 1: `components/ui/rich-text-editor-styles.css`

This CSS file styles the TipTap editor content and the read-only renderer. Both the editor and renderer import it.

```css
/* TipTap editor placeholder */
.tiptap p.is-editor-empty:first-child::before {
  color: #78716c;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Remove default outline */
.tiptap:focus {
  outline: none;
}

/* Shared content styles for editor (.tiptap) and renderer (.rich-text-content) */
.tiptap h2,
.rich-text-content h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 0 0.375rem;
  color: #e7e5e4;
}

.tiptap h3,
.rich-text-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
  color: #e7e5e4;
}

.tiptap p,
.rich-text-content p {
  margin: 0.25rem 0;
  line-height: 1.6;
}

.tiptap ul,
.rich-text-content ul {
  list-style-type: disc;
  padding-left: 1.5rem;
}

.tiptap ol,
.rich-text-content ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
}

.tiptap li,
.rich-text-content li {
  margin: 0.125rem 0;
}

.tiptap a,
.rich-text-content a {
  color: #f59e0b;
  text-decoration: underline;
}

.tiptap a:hover,
.rich-text-content a:hover {
  color: #fbbf24;
}

.tiptap blockquote,
.rich-text-content blockquote {
  border-left: 3px solid #78716c;
  padding-left: 0.75rem;
  color: #a8a29e;
  margin: 0.5rem 0;
  font-style: italic;
}

.tiptap mark,
.rich-text-content mark {
  border-radius: 0.125rem;
  padding: 0.0625rem 0.125rem;
}

.tiptap hr,
.rich-text-content hr {
  border-color: #44403c;
  margin: 0.75rem 0;
}

.tiptap s,
.rich-text-content s {
  text-decoration: line-through;
}
```

### File 2: `components/ui/rich-text-editor.tsx`

Complete WYSIWYG editor component. Copy this exactly:

```tsx
'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
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
      editor.commands.setContent(value || '', false)
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
```

### File 3: `components/ui/rich-text-renderer.tsx`

Read-only renderer for public pages. Copy exactly:

```tsx
'use client'

import { useEffect, useState } from 'react'
import './rich-text-editor-styles.css'

interface RichTextRendererProps {
  html: string
  className?: string
}

/**
 * Renders sanitized HTML content from the RichTextEditor.
 * Handles both plain text (legacy) and HTML content.
 */
export function RichTextRenderer({ html, className = '' }: RichTextRendererProps) {
  const [sanitized, setSanitized] = useState('')

  useEffect(() => {
    if (!html) {
      setSanitized('')
      return
    }

    // Detect plain text (no HTML tags) and convert to paragraphs
    const isPlainText = !/<[a-z][\s\S]*>/i.test(html)
    const content = isPlainText
      ? html
          .split('\n')
          .map((line) => `<p>${line || '<br>'}</p>`)
          .join('')
      : html

    // Dynamic import to avoid SSR issues with DOMPurify
    import('dompurify').then((mod) => {
      const DOMPurify = mod.default
      const clean = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          'p',
          'h2',
          'h3',
          'strong',
          'em',
          'u',
          's',
          'ul',
          'ol',
          'li',
          'a',
          'span',
          'br',
          'blockquote',
          'hr',
          'mark',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
      })
      setSanitized(clean)
    })
  }, [html])

  if (!sanitized) {
    // Fallback: render plain text while DOMPurify loads
    if (!html) return null
    return (
      <p className={`whitespace-pre-line text-sm leading-6 text-stone-300 ${className}`}>{html}</p>
    )
  }

  return (
    <div
      className={`rich-text-content text-sm leading-6 text-stone-300 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
```

---

## Phase 3: Integrate into Dinner Circle Command Center

**File to modify:** `components/events/dinner-circle-command-center.tsx`

### Step 3a: Add import at top of file

Add this import near the other component imports:

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

### Step 3b: Replace specific textareas with RichTextEditor

Replace ONLY these 5 fields. Find each textarea by its placeholder text or the field it binds to. The pattern is always the same:

**Before (textarea pattern):**

```tsx
<textarea
  className={fieldClass}
  rows={N}
  value={config.SECTION?.FIELD ?? ''}
  onChange={(e) => update({ SECTION: { ...config.SECTION, FIELD: e.target.value } })}
  placeholder="..."
/>
```

**After (RichTextEditor pattern):**

```tsx
<RichTextEditor
  value={config.SECTION?.FIELD ?? ''}
  onChange={(html) => update({ SECTION: { ...config.SECTION, FIELD: html } })}
  placeholder="..."
  minHeight={120}
/>
```

**The 5 fields to replace:**

1. **`publicPage.story`** - Look for `config.publicPage?.story` or placeholder containing "Story" or "host note" or "location context". This is the most important one.

2. **`menu.manualNotes`** - Look for `config.menu?.manualNotes` or placeholder containing "Manual courses" or "serving notes".

3. **`menu.fixedElements`** - Look for `config.menu?.fixedElements` or placeholder containing "Fixed menu promises".

4. **`menu.flexibleElements`** - Look for `config.menu?.flexibleElements` or placeholder containing "Flexible" or "seasonal ranges".

5. **`adaptive.clientExpectationNote`** - Look for `config.adaptive?.clientExpectationNote` or placeholder containing "What can change" or "stays fixed". This may be rendered via the `TextPanel` sub-component. If so, either (a) add a `rich?: boolean` prop to `TextPanel` that swaps textarea for RichTextEditor when true, or (b) replace the TextPanel usage with the RichTextEditor directly.

### What NOT to replace

Do NOT replace these fields (they are structured data, internal notes, or pipe-delimited):

- `money.paySplit`, `money.ticketSeller`, `money.compensation` (structured financial data)
- `supplier.rawInput` (parsed into ingredientLines array)
- `supplier.sourceLinks` textarea (pipe-delimited format)
- `layout.chefNotes` (internal chef notes, not public-facing)
- `farm.animals` textarea (pipe-delimited structured data)
- `social.posts` textarea (pipe-delimited structured data)
- `publicPage.pastLinks` textarea (pipe-delimited structured data)
- `adaptive.pricingAdjustmentPolicy` (internal policy, not shown to public)
- `adaptive.substitutionValidationNotes` (internal validation, not shown to public)
- `adaptive.finalValidationNotes` (internal, input not textarea)
- `adaptive.availabilityItems` textarea (structured matrix)

---

## Phase 4: Update Public Event Renderer

**File to modify:** `app/(public)/e/[shareToken]/public-event-view.tsx`

### Step 4a: Add import

```tsx
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
```

### Step 4b: Replace plain text renders

Find each `<p>` tag that renders circle config text and replace with `<RichTextRenderer>`.

**Before pattern:**

```tsx
<p className="whitespace-pre-line text-sm leading-6 text-stone-300">{config.publicPage.story}</p>
```

**After pattern:**

```tsx
<RichTextRenderer html={config.publicPage.story} />
```

Replace for these fields (search for the field name in JSX):

1. `config.publicPage.story` (or `config.publicPage?.story`)
2. `config.menu?.fixedElements`
3. `config.menu?.flexibleElements`
4. `config.adaptive?.clientExpectationNote`
5. `config.adaptive?.changeWindowNote`

Leave all other text renders as plain `<p>` tags.

---

## Phase 5: Update Hub Group Settings

**File to modify:** `components/hub/hub-group-settings.tsx`

### Step 5a: Add import

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

### Step 5b: Replace description textarea

Find the `<textarea>` for the group `description` field (look for "What's this circle about?" or similar placeholder). Replace with:

```tsx
<RichTextEditor
  value={description}
  onChange={setDescription}
  placeholder="What's this circle about?"
  minHeight={100}
/>
```

Adjust the `onChange` handler to match whatever state setter the existing textarea uses.

---

## DO NOT (Critical for Codex)

- **DO NOT** modify `lib/dinner-circles/types.ts` - string fields stay as strings
- **DO NOT** modify `lib/dinner-circles/actions.ts` - server actions stay unchanged
- **DO NOT** modify `lib/dinner-circles/event-circle.ts` - snapshot builder stays unchanged
- **DO NOT** create database migrations - no schema changes needed
- **DO NOT** modify `database/` anything
- **DO NOT** add new routes or pages
- **DO NOT** delete `components/ui/rich-note-editor.tsx` (orphaned but leave it)
- **DO NOT** touch financial fields, supplier fields, or pipe-delimited data fields
- **DO NOT** import from `isomorphic-dompurify` - use `dompurify` with dynamic import as shown
- **DO NOT** add any `@ts-nocheck` or `@ts-ignore` directives
- **DO NOT** modify the existing `DinnerCircleTheme` type or theme picker
- **DO NOT** change how the `updateDinnerCircleConfig` server action works
- **DO NOT** modify any test files
- **DO NOT** run `drizzle-kit push` or any migration commands

## Verification Checklist

After building, verify:

- [ ] `npx tsc --noEmit --skipLibCheck` passes (no type errors introduced)
- [ ] `npx next build --no-lint` succeeds
- [ ] The RichTextEditor component renders with a toolbar
- [ ] The toolbar has: Bold, Italic, Underline, Strikethrough, H2, H3, Bullet List, Ordered List, Align Left/Center/Right, Text Color, Highlight Color, Link, Undo, Redo
- [ ] Typing in the editor produces HTML output
- [ ] The DinnerCircleCommandCenter shows the editor for `publicPage.story`
- [ ] Existing plain text content displays correctly in the editor (backward compatible)
- [ ] The RichTextRenderer handles both plain text and HTML
