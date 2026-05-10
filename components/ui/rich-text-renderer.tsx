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
