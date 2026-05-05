// Card Component - Container with consistent styling

import { HTMLAttributes, forwardRef } from 'react'

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
    'bg-[var(--surface-2)] border-brand-600/30 shadow-[var(--shadow-card),0_0_20px_rgb(var(--brand-500)/0.08)] bg-[image:var(--card-gradient)]',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl border card-transition ${variantStyles[variant]} ${interactive ? 'card-lift hover:border-[rgba(232,143,71,0.25)] hover:bg-stone-800/80 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(232,143,71,0.08),0_0_20px_rgba(232,143,71,0.06)] cursor-pointer' : ''} ${className}`}
        {...props}
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
