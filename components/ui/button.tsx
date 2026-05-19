// Button Component - Consistent styling across the app
// Button Component - Consistent styling across the app
'use client'

import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from 'react'
import { clampTooltipText } from '@/lib/ui/tooltip'
import { LoadingSpinner } from '@/components/ui/loading-state'
import { CTA_CONTRAST_CLASSES } from '@/lib/ui/contrast-contract'

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  tooltip?: string
}

type NativeButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type AnchorButtonProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

// Support rendering as either a <button> or an <a> when `href` is provided.
export type ButtonProps = NativeButtonProps | AnchorButtonProps

export const Button = forwardRef<any, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading,
      className = '',
      disabled,
      href,
      title,
      tooltip,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 disabled:pointer-events-none disabled:opacity-50'

    const variants = CTA_CONTRAST_CLASSES

    const sizes = {
      sm: 'min-h-[44px] px-3.5 text-sm rounded-lg gap-1.5 touch-manipulation',
      md: 'min-h-[44px] px-5 py-2.5 text-sm rounded-lg gap-2 touch-manipulation',
      lg: 'h-12 px-6 py-3 text-base rounded-lg gap-2 touch-manipulation',
    }

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
    const tooltipText = clampTooltipText(tooltip ?? title)
    const tooltipProps = tooltipText ? ({ 'data-tooltip': tooltipText } as const) : undefined
    const loadingIndicator = loading ? <LoadingSpinner size="sm" className="-ml-1 mr-1.5" /> : null

    // If href provided, render an anchor so we can use it for in-page anchors and links.
    if (href) {
      return (
        // cast props to any to avoid passing button-only props to <a>
        <a ref={ref} className={classes} href={href} {...tooltipProps} {...(props as any)}>
          {loadingIndicator}
          {children}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...tooltipProps}
        {...(props as any)}
      >
        {loadingIndicator}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
