// Button Component - Consistent styling across the app
// Button Component - Consistent styling across the app
'use client'

import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from 'react'
import { clampTooltipText } from '@/lib/ui/tooltip'

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
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 active:shadow-[0_0_0_2px_rgba(232,143,71,0.3)] focus-visible:ring-brand-500 shadow-sm hover:shadow-md',
      secondary:
        'bg-stone-800/80 text-stone-300 border border-stone-600/80 hover:bg-stone-700/80 hover:text-stone-100 hover:border-stone-500 active:bg-stone-600 focus-visible:ring-stone-400 shadow-sm',
      danger:
        'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm',
      ghost:
        'bg-transparent hover:bg-stone-800 hover:text-stone-100 active:bg-stone-700 text-stone-300 focus-visible:ring-stone-400',
    }

    const sizes = {
      sm: 'min-h-[44px] px-3 text-sm rounded-lg gap-1.5 touch-manipulation',
      md: 'min-h-[44px] px-4 py-2 text-sm rounded-lg gap-2 touch-manipulation',
      lg: 'h-12 px-6 text-base rounded-lg gap-2 touch-manipulation',
    }

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
    const tooltipText = clampTooltipText(tooltip ?? title)
    const tooltipProps = tooltipText ? ({ 'data-tooltip': tooltipText } as const) : undefined

    // If href provided, render an anchor so we can use it for in-page anchors and links.
    if (href) {
      return (
        // cast props to any to avoid passing button-only props to <a>
        <a ref={ref} className={classes} href={href} {...tooltipProps} {...(props as any)}>
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
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
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-1.5 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
