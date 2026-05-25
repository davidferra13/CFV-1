'use client'

import { AnchorHTMLAttributes, forwardRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from '@/components/ui/icons'

export interface ReturnContext {
  entityType: 'client' | 'event' | 'ingredient' | 'recipe' | 'vendor'
  entityId: string
  entityName: string
  exitCategory: string
  suggestedActions: SuggestedAction[]
}

export interface SuggestedAction {
  label: string
  field?: string
  type: 'text' | 'number' | 'note'
}

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  exitType?: 'permanent' | 'bridgeable' | 'reducible'
  returnContext?: ReturnContext
}

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ children, exitType = 'permanent', returnContext, onClick, ...props }, ref) => {
    const pathname = usePathname()

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if ((exitType === 'bridgeable' || exitType === 'reducible') && returnContext) {
          try {
            sessionStorage.setItem(
              'cf-return-context',
              JSON.stringify({
                ...returnContext,
                originPath: pathname,
                timestamp: new Date().toISOString(),
                fired: false,
              })
            )
          } catch {}
        }
        onClick?.(e)
      },
      [exitType, returnContext, pathname, onClick]
    )

    return (
      <a ref={ref} target="_blank" rel="noopener noreferrer" onClick={handleClick} {...props}>
        {children}
        <ArrowUpRight className="inline-block ml-1 w-3 h-3 text-stone-500" aria-hidden="true" />
      </a>
    )
  }
)
ExternalLink.displayName = 'ExternalLink'

export { ExternalLink }
