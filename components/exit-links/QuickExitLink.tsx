'use client'

import { getExitLink } from '@/lib/exit-links/generate-link'
import { resolveIcon } from './icon-resolver'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickExitLinkProps {
  exitId: number
  context: Record<string, string>
  children?: React.ReactNode
  className?: string
}

export function QuickExitLink({ exitId, context, children, className }: QuickExitLinkProps) {
  const link = getExitLink(exitId, context)
  if (!link || !link.url || link.inApp) return null

  const Icon = resolveIcon(link.icon)
  const label = children ?? link.label

  return (
    <a
      href={link.url}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors',
        className
      )}
      title={link.label}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      <ExternalLink className="h-2 w-2 opacity-40" />
    </a>
  )
}
