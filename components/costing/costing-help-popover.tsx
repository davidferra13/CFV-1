'use client'

// Contextual help popover for food costing concepts.
// Renders a small "?" icon that opens an inline explanation panel.
// All content is static (from knowledge.ts). No server calls, no loading state.

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from '@/components/ui/icons'
import {
  HELP_CONTENT,
  getContextualGuidance,
  type HelpTopic,
  type OperatorType,
} from '@/lib/costing/knowledge'

interface CostingHelpPopoverProps {
  topic: HelpTopic
  currentValue?: number
  targetValue?: number
  operationType?: OperatorType
}

export function CostingHelpPopover({
  topic,
  currentValue,
  targetValue,
  operationType,
}: CostingHelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const content = HELP_CONTENT[topic]
  if (!content) return null

  const contextual = getContextualGuidance(topic, currentValue, targetValue, operationType)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-stone-500 hover:text-stone-300 transition-colors p-0.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
        aria-label={`Help: ${content.title}`}
        aria-expanded={open}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-6 top-0 z-50 w-72 rounded-lg border border-stone-700 bg-stone-800 p-3 shadow-lg text-sm"
        >
          <h4 className="font-semibold text-stone-100 mb-1">{content.title}</h4>

          <p className="text-stone-400 mb-2">{content.summary}</p>

          {content.formula && (
            <p className="text-xs font-mono text-stone-500 bg-stone-900 rounded px-2 py-1 mb-2">
              {content.formula}
            </p>
          )}

          {content.targetRange && (
            <p className="text-xs text-stone-400 mb-2">
              <span className="text-stone-500">Target:</span> {content.targetRange}
            </p>
          )}

          {contextual && <p className="text-xs text-amber-400/90 mb-2">{contextual}</p>}

          <p className="text-xs text-stone-500">{content.guidance}</p>

          {content.industryContext && (
            <p className="text-xs text-stone-500/80 mt-2 border-t border-stone-700/50 pt-2 italic">
              {content.industryContext}
            </p>
          )}

          <a
            href={`/help/food-costing#${content.guideSection}`}
            className="block mt-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Read full guide section &rarr;
          </a>
        </div>
      )}
    </div>
  )
}
