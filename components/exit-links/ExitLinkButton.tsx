'use client'

import { getExitLink } from '@/lib/exit-links/generate-link'
import type { ExitLinkResult } from '@/types/exit-links'
import { resolveIcon } from './icon-resolver'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExitLinkButtonProps {
  exitId: number
  context: Record<string, string>
  variant?: 'default' | 'ghost' | 'outline' | 'compact'
  size?: 'sm' | 'md'
  className?: string
}

export function ExitLinkButton({
  exitId,
  context,
  variant = 'ghost',
  size = 'sm',
  className,
}: ExitLinkButtonProps) {
  const link = getExitLink(exitId, context)
  if (!link) return null

  if (link.inApp) {
    const Icon = resolveIcon(link.icon)
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50',
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {link.label}
      </span>
    )
  }

  if (link.subLinks?.length) {
    return <ExitLinkDropdown link={link} variant={variant} className={className} />
  }

  return <SingleExitLink link={link} variant={variant} className={className} />
}

function SingleExitLink({
  link,
  variant,
  className,
}: {
  link: ExitLinkResult
  variant: string
  className?: string
}) {
  const Icon = resolveIcon(link.icon)
  const isCompact = variant === 'compact'

  return (
    <a
      href={link.url!}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-primary',
        isCompact
          ? 'text-xs text-muted-foreground px-1.5 py-0.5'
          : 'text-sm text-muted-foreground px-2 py-1 hover:bg-muted/50',
        variant === 'outline' && 'border border-border',
        className
      )}
      title={link.label}
    >
      <Icon className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />
      <span className={isCompact ? 'max-w-[120px] truncate' : undefined}>{link.label}</span>
      <ExternalLinkIcon className="h-2.5 w-2.5 opacity-40" />
    </a>
  )
}

function ExitLinkDropdown({
  link,
  variant,
  className,
}: {
  link: ExitLinkResult
  variant: string
  className?: string
}) {
  const Icon = resolveIcon(link.icon)

  return (
    <div className={cn('inline-flex items-center', className)}>
      <a
        href={link.url!}
        target={link.newTab ? '_blank' : undefined}
        rel={link.newTab ? 'noopener noreferrer' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm text-muted-foreground px-2 py-1 rounded-l-md hover:text-primary hover:bg-muted/50 transition-colors',
          variant === 'outline' && 'border border-r-0 border-border'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{link.label}</span>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-6 rounded-l-none',
              variant === 'outline' && 'border border-border'
            )}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {link.subLinks!.map((sub, i) => {
            const SubIcon = resolveIcon(sub.icon)
            return (
              <DropdownMenuItem key={i} asChild>
                <a
                  href={sub.url!}
                  target={sub.newTab ? '_blank' : undefined}
                  rel={sub.newTab ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2"
                >
                  <SubIcon className="h-3.5 w-3.5" />
                  {sub.label}
                </a>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
