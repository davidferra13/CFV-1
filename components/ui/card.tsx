// Card Component - Container with consistent styling

import { HTMLAttributes, KeyboardEventHandler, forwardRef } from 'react'

export type CardVariant = 'default' | 'elevated' | 'glass' | 'highlight'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant controlling surface depth, shadow, and border treatment */
  variant?: CardVariant
  /** Adds hover lift + shadow for clickable cards */
  interactive?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-[var(--surface-2)] border-stone-700/40 shadow-[var(--shadow-card)] bg-[image:var(--card-gradient)]',
  elevated:
    'bg-[var(--surface-3)] border-stone-600/50 shadow-[var(--shadow-card-hover)] bg-[image:var(--card-gradient)]',
  glass: 'bg-[var(--glass-bg)] border-stone-600/30 shadow-[var(--shadow-card)] backdrop-blur-xl',
  highlight:
    'bg-[var(--surface-2)] border-brand-600/30 shadow-[var(--shadow-card)] bg-[image:var(--card-gradient)]',
}

const interactiveStyles =
  'hover:border-stone-600 hover:bg-stone-800/80 hover:shadow-[var(--shadow-card-hover)] cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2'

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = '',
      variant = 'default',
      interactive,
      children,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...props
    },
    ref
  ) => {
    // An interactive card was previously a cursor-pointer div with no focus ring
    // and no keyboard path. When it is given an onClick it now behaves like a
    // button: reachable by Tab, activated by Enter or Space, and visibly focused.
    // A caller that already supplies its own role keeps it, and an interactive
    // card that merely wraps a real link or button still gets the focus ring.
    const isButtonLike = Boolean(interactive && onClick && !role)

    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
      onKeyDown?.(event)
      if (!isButtonLike || event.defaultPrevented) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.currentTarget.click()
      }
    }

    return (
      <div
        ref={ref}
        {...props}
        onClick={onClick}
        onKeyDown={onKeyDown || isButtonLike ? handleKeyDown : undefined}
        role={isButtonLike ? 'button' : role}
        tabIndex={isButtonLike ? (tabIndex ?? 0) : tabIndex}
        className={`rounded-xl border card-transition ${variantStyles[variant]} ${interactive ? interactiveStyles : ''} ${className}`}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`px-6 py-4 border-b border-stone-800 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level - defaults to h2 for correct heading hierarchy under page h1 */
  as?: 'h2' | 'h3' | 'h4'
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', as: Tag = 'h2', children, ...props }, ref) => {
    return (
      <Tag ref={ref} className={`text-lg font-semibold text-stone-50 ${className}`} {...props}>
        {children}
      </Tag>
    )
  }
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <p ref={ref} className={`text-sm text-stone-300 ${className}`} {...props}>
      {children}
    </p>
  )
})

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`px-6 py-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-stone-800 bg-stone-800/40 rounded-b-xl ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'
