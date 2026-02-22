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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {illustration ? (
        <div className="mb-6 [&>svg]:h-24 [&>svg]:w-24">{illustration}</div>
      ) : icon ? (
        <div className="mb-4 text-stone-300 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
      ) : null}
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
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
