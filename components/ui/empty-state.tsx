// EmptyState — reusable centered empty-content placeholder
// Used on list pages when there are no items to display.

import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  /** Branded SVG illustration — takes precedence over icon when provided */
  illustration?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
  }
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {illustration ? (
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/5 blur-xl" />
          <div className="relative [&>svg]:h-24 [&>svg]:w-24">{illustration}</div>
        </div>
      ) : icon ? (
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/5 blur-xl" />
          <div className="relative text-stone-400 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-stone-100 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mb-8 leading-relaxed">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <>
              {action.href ? (
                <Button variant="primary" href={action.href}>
                  {action.label}
                </Button>
              ) : (
                <Button variant="primary" onClick={action.onClick}>
                  {action.label}
                </Button>
              )}
            </>
          )}
          {secondaryAction && (
            <Button variant="secondary" href={secondaryAction.href}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
