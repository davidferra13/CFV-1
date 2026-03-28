// EmptyState - reusable centered empty-content placeholder
// Used on list pages when there are no items to display.
// Shows Remy mascot by default for a branded, friendly feel.

import Image from 'next/image'
import { Button } from '@/components/ui/button'

export type RemyMood = 'pondering' | 'idle' | 'sleeping' | 'aha' | 'straight-face'

const remyImages: Record<RemyMood, string> = {
  pondering: '/images/remy/remy-pondering.png',
  idle: '/images/remy/remy-idle.png',
  sleeping: '/images/remy/remy-sleeping.png',
  aha: '/images/remy/remy-aha.png',
  'straight-face': '/images/remy/remy-straight-face.png',
}

export interface EmptyStateProps {
  icon?: React.ReactNode
  /** Branded SVG illustration - takes precedence over icon when provided */
  illustration?: React.ReactNode
  /** Show Remy mascot instead of a generic icon. Defaults to 'pondering'. */
  remy?: RemyMood | false
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
  remy,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  // Determine what visual to show: illustration > icon > remy (default: pondering)
  const showRemy = !illustration && !icon && remy !== false
  const remyMood: RemyMood = typeof remy === 'string' ? remy : 'pondering'

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-slide-up">
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
      ) : showRemy ? (
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-6 rounded-full bg-brand-500/8 blur-2xl" />
          <Image
            src={remyImages[remyMood]}
            alt="Remy"
            width={80}
            height={80}
            className="relative opacity-90 drop-shadow-[0_4px_12px_rgba(232,143,71,0.15)]"
            priority={false}
          />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-stone-100 mb-2">{title}</h3>
      <p className="text-sm text-stone-300 max-w-sm mb-8 leading-relaxed">{description}</p>
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
