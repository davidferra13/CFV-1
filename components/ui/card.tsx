// Card Component - Container with consistent styling

import { HTMLAttributes, forwardRef } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + shadow for clickable cards */
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`surface-card rounded-xl border border-stone-200/80 bg-[var(--surface-2)] bg-[image:var(--card-gradient)] shadow-[var(--shadow-card)] transition-all duration-200 dark:border-stone-700/60 ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(232,143,71,0.25)] hover:bg-stone-50/80 hover:shadow-[var(--shadow-card-hover)] dark:hover:bg-stone-800/80' : ''} ${className}`}
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
      <div
        ref={ref}
        className={`border-b border-stone-200 px-6 py-4 dark:border-stone-800 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level — defaults to h2 for correct heading hierarchy under page h1 */
  as?: 'h2' | 'h3' | 'h4'
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', as: Tag = 'h2', children, ...props }, ref) => {
    return (
      <Tag
        ref={ref}
        className={`text-lg font-semibold text-stone-900 dark:text-stone-100 ${className}`}
        {...props}
      >
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
    <p ref={ref} className={`text-sm text-stone-600 dark:text-stone-400 ${className}`} {...props}>
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
        className={`rounded-b-xl border-t border-stone-200 bg-stone-100/60 px-6 py-4 dark:border-stone-800 dark:bg-stone-800/40 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'
