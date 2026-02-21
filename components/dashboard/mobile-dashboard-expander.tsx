'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface MobileDashboardExpanderProps {
  children: React.ReactNode
}

/**
 * On phones (< md / 768px): shows a "Show more" button that reveals analytics sections.
 * On tablet/desktop (md+): renders children normally — transparent passthrough.
 */
export function MobileDashboardExpander({ children }: MobileDashboardExpanderProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      {/* Mobile toggle button — hidden on tablet+ */}
      <div className="md:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 text-sm font-medium hover:bg-stone-100 active:bg-stone-200 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Analytics & more
            </>
          )}
        </button>
      </div>

      {/* Content: shown when expanded on mobile, always shown on md+ */}
      <div className={expanded ? '' : 'hidden md:contents'}>{children}</div>
    </>
  )
}
