// Page Info — Annotated Schematic Overlay
// A small info button in the bottom-left corner of every page.
// Click it to see what the page does and what every section is for.
// Two modes: schematic (labels pointing at real elements) and summary (text card).
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Info, X } from 'lucide-react'
import {
  PAGE_INFO_REGISTRY,
  type PageInfoEntry,
  type PageAnnotation,
} from '@/lib/help/page-info-registry'

// ─── Route Matching ──────────────────────────────────
function findPageInfo(pathname: string): PageInfoEntry | null {
  // 1. Exact match
  if (PAGE_INFO_REGISTRY[pathname]) return PAGE_INFO_REGISTRY[pathname]

  // 2. Dynamic route match — replace UUID/numeric segments with [id]
  const segments = pathname.split('/').filter(Boolean)
  for (let i = segments.length; i > 0; i--) {
    const pattern =
      '/' +
      segments
        .slice(0, i)
        .map((seg) => (/^[0-9a-f-]{8,}$/i.test(seg) || /^\d+$/.test(seg) ? '[id]' : seg))
        .join('/')
    if (PAGE_INFO_REGISTRY[pattern]) return PAGE_INFO_REGISTRY[pattern]
  }

  return null
}

// ─── Resolved annotation with screen position ───────
interface ResolvedAnnotation {
  annotation: PageAnnotation
  rect: DOMRect
}

function resolveAnnotations(annotations: PageAnnotation[]): ResolvedAnnotation[] {
  const resolved: ResolvedAnnotation[] = []
  for (const a of annotations) {
    const el = document.querySelector(a.selector)
    if (el) {
      resolved.push({ annotation: a, rect: el.getBoundingClientRect() })
    }
  }
  return resolved
}

// ─── Label position calculator ───────────────────────
function getLabelPosition(
  rect: DOMRect,
  scrollY: number,
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right'
): { top: number; left: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  const labelW = 260
  const labelH = 72
  const gap = 12
  const vw = window.innerWidth
  const docH = document.documentElement.scrollHeight

  const absTop = rect.top + scrollY
  const absBottom = rect.bottom + scrollY
  const centerX = rect.left + rect.width / 2
  const centerY = absTop + rect.height / 2

  // Determine best side
  const side =
    preferredPosition ||
    (absTop > labelH + gap + 60
      ? 'top'
      : absBottom + labelH + gap < docH
        ? 'bottom'
        : rect.left > labelW + gap
          ? 'left'
          : 'right')

  let top = 0
  let left = 0

  switch (side) {
    case 'top':
      top = absTop - labelH - gap
      left = Math.max(8, Math.min(centerX - labelW / 2, vw - labelW - 8))
      break
    case 'bottom':
      top = absBottom + gap
      left = Math.max(8, Math.min(centerX - labelW / 2, vw - labelW - 8))
      break
    case 'left':
      top = centerY - labelH / 2
      left = rect.left - labelW - gap
      break
    case 'right':
      top = centerY - labelH / 2
      left = rect.right + gap
      break
  }

  return { top, left, side }
}

// ─── SVG connector line between label and element ────
function ConnectorLine({
  labelPos,
  rect,
  scrollY,
}: {
  labelPos: { top: number; left: number; side: 'top' | 'bottom' | 'left' | 'right' }
  rect: DOMRect
  scrollY: number
}) {
  const absTop = rect.top + scrollY
  const centerX = rect.left + rect.width / 2
  const centerY = absTop + rect.height / 2
  const labelW = 260
  const labelH = 72

  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0

  switch (labelPos.side) {
    case 'top':
      x1 = labelPos.left + labelW / 2
      y1 = labelPos.top + labelH
      x2 = centerX
      y2 = absTop
      break
    case 'bottom':
      x1 = labelPos.left + labelW / 2
      y1 = labelPos.top
      x2 = centerX
      y2 = absTop + rect.height
      break
    case 'left':
      x1 = labelPos.left + labelW
      y1 = labelPos.top + labelH / 2
      x2 = rect.left
      y2 = centerY
      break
    case 'right':
      x1 = labelPos.left
      y1 = labelPos.top + labelH / 2
      x2 = rect.right
      y2 = centerY
      break
  }

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="rgba(120, 113, 108, 0.4)"
      strokeWidth={1.5}
      strokeDasharray="4 3"
    />
  )
}

// ─── Schematic Overlay ───────────────────────────────
function SchematicOverlay({ entry, onClose }: { entry: PageInfoEntry; onClose: () => void }) {
  const [resolved, setResolved] = useState<ResolvedAnnotation[]>([])
  const [scrollY, setScrollY] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setScrollY(window.scrollY)
    const annotations = entry.annotations || []
    setResolved(resolveAnnotations(annotations))
  }, [entry])

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const docH = typeof document !== 'undefined' ? document.documentElement.scrollHeight : 0

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current || (e.target as HTMLElement).dataset.backdrop) {
          onClose()
        }
      }}
    >
      {/* Transparent backdrop */}
      <div
        data-backdrop="true"
        className="absolute inset-0 bg-stone-900/80 dark:bg-stone-950/80 backdrop-blur-[1.5px]"
        style={{ minHeight: docH }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-stone-900 dark:bg-stone-900 text-white dark:text-stone-100 flex items-center justify-center shadow-lg hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
        aria-label="Close page info"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Page title banner */}
      <div className="fixed top-4 left-4 z-50 bg-stone-900 dark:bg-stone-900 text-white dark:text-stone-100 rounded-xl px-4 py-2.5 shadow-lg max-w-xs">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-300 dark:text-stone-500">
          Page Guide
        </p>
        <p className="text-sm font-semibold mt-0.5">{entry.title}</p>
        <p className="text-xs text-stone-300 dark:text-stone-500 mt-0.5">{entry.description}</p>
      </div>

      {/* SVG connector lines */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: docH }}>
        {resolved.map((r, i) => {
          const labelPos = getLabelPosition(r.rect, scrollY, r.annotation.position)
          return <ConnectorLine key={i} labelPos={labelPos} rect={r.rect} scrollY={scrollY} />
        })}
      </svg>

      {/* Highlight boxes + annotation labels */}
      {resolved.map((r, i) => {
        const labelPos = getLabelPosition(r.rect, scrollY, r.annotation.position)
        return (
          <div key={i}>
            {/* Highlight box around the element */}
            <div
              className="absolute rounded-lg border-2 border-brand-500/70 pointer-events-none"
              style={{
                top: r.rect.top + scrollY - 4,
                left: r.rect.left - 4,
                width: r.rect.width + 8,
                height: r.rect.height + 8,
                boxShadow:
                  '0 0 0 4px rgba(232, 143, 71, 0.15), inset 0 0 0 1px rgba(232, 143, 71, 0.1)',
              }}
            />

            {/* Annotation label card */}
            <div
              className="absolute bg-stone-900 dark:bg-stone-900 text-white dark:text-stone-100 rounded-lg px-3 py-2 shadow-lg pointer-events-none"
              style={{
                top: labelPos.top,
                left: labelPos.left,
                width: 260,
                zIndex: 2,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                <span className="text-xs font-semibold truncate">{r.annotation.label}</span>
              </div>
              <p className="text-xs text-stone-300 dark:text-stone-500 leading-relaxed">
                {r.annotation.description}
              </p>
            </div>
          </div>
        )
      })}

      {/* If annotations resolved but some are empty, show a note */}
      {entry.annotations && entry.annotations.length > 0 && resolved.length === 0 && (
        <FallbackSummary entry={entry} onClose={onClose} inline />
      )}
    </div>,
    document.body
  )
}

// ─── Fallback Summary Card ──────────────────────────
function FallbackSummary({
  entry,
  onClose,
  inline = false,
}: {
  entry: PageInfoEntry
  onClose: () => void
  inline?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Escape key (only if not inline — inline is inside SchematicOverlay which already handles it)
  useEffect(() => {
    if (inline) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, inline])

  // Click outside
  useEffect(() => {
    if (inline) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose, inline])

  const card = (
    <div
      ref={ref}
      className={`${
        inline ? 'fixed top-10 right-4 z-[60]' : 'fixed top-10 right-4 z-[60]'
      } w-80 max-w-[calc(100vw-2rem)] bg-stone-900 dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-700 dark:border-stone-700 overflow-hidden animate-scale-in`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-300">Page Guide</p>
          <h3 className="text-sm font-semibold text-stone-100 dark:text-stone-100 mt-0.5">
            {entry.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-stone-300 hover:text-stone-300 hover:bg-stone-700 dark:hover:bg-stone-800 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        <p className="text-sm text-stone-300 dark:text-stone-300 leading-relaxed">
          {entry.description}
        </p>
      </div>

      {/* Features list */}
      {entry.features.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-300 mb-2">
            Features
          </p>
          <ul className="space-y-1.5">
            {entry.features.map((f, i) => (
              <li
                key={i}
                className="text-sm text-stone-300 dark:text-stone-300 flex items-start gap-2"
              >
                <span className="text-brand-500 mt-0.5 flex-shrink-0">&#8226;</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  if (inline) return card
  return createPortal(card, document.body)
}

// ─── Main Component ─────────────────────────────────
export function PageInfoButton() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const entry = findPageInfo(pathname ?? '')

  // Close on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const handleClose = useCallback(() => setIsOpen(false), [])
  const handleToggle = useCallback(() => setIsOpen((v) => !v), [])

  // Don't render if no registry entry for this page
  if (!entry) return null

  const hasAnnotations = entry.annotations && entry.annotations.length > 0

  return (
    <>
      {/* The info button — top of page, small and transparent */}
      <button
        onClick={handleToggle}
        className={`fixed top-1.5 right-14 z-50 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
          isOpen
            ? 'bg-stone-700/60 text-stone-200'
            : 'bg-transparent text-stone-500/50 hover:text-stone-400 hover:bg-stone-700/30'
        }`}
        aria-label="Page info"
        title="What does this page do?"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {/* The overlay */}
      {isOpen &&
        (hasAnnotations ? (
          <SchematicOverlay entry={entry} onClose={handleClose} />
        ) : (
          <FallbackSummary entry={entry} onClose={handleClose} />
        ))}
    </>
  )
}
