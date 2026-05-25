'use client'

import { useState } from 'react'
import { getExitLinksForCategory } from '@/lib/exit-links/generate-link'
import type { ExitCategory, ExitLinkResult } from '@/types/exit-links'
import { resolveIcon } from './icon-resolver'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const categoryLabels: Record<ExitCategory, string> = {
  'data-gaps': 'Price & Data Lookup',
  'missing-features': 'Quick Access',
  'channel-lock-in': 'Contact',
  transaction: 'Shop & Order',
  'external-platform': 'External Resources',
  government: 'Compliance & Legal',
  'tax-financial': 'Financial',
  creative: 'Inspiration & Learning',
  marketing: 'Marketing & Social',
  'professional-growth': 'Professional',
  'kitchen-boundary': 'Kitchen Tools',
}

interface ExitLinkPanelProps {
  category: ExitCategory
  context: Record<string, string>
  title?: string
  maxVisible?: number
  className?: string
}

export function ExitLinkPanel({
  category,
  context,
  title,
  maxVisible = 5,
  className,
}: ExitLinkPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const links = getExitLinksForCategory(category, context)

  const externalLinks = links.filter((l) => !l.inApp && l.url)
  if (externalLinks.length === 0) return null

  const displayLabel = title ?? categoryLabels[category] ?? category
  const visible = expanded ? externalLinks : externalLinks.slice(0, maxVisible)
  const hiddenCount = externalLinks.length - maxVisible

  return (
    <div className={cn('rounded-lg border border-border/50 bg-card/50 p-3', className)}>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {displayLabel}
      </h4>
      <div className="flex flex-col gap-0.5">
        {visible.map((link, i) => (
          <PanelLink key={i} link={link} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show {hiddenCount} more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

function PanelLink({ link }: { link: ExitLinkResult }) {
  const Icon = resolveIcon(link.icon)
  return (
    <a
      href={link.url!}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary py-1 px-1.5 rounded hover:bg-muted/50 transition-colors group"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="flex-1 truncate">{link.label}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </a>
  )
}
