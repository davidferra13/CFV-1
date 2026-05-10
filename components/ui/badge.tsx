// Badge Component - For status labels
'use client'

import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants = {
    default:
      'bg-stone-200 text-stone-700 ring-1 ring-inset ring-stone-300 dark:bg-stone-800/80 dark:text-stone-400 dark:ring-stone-700',
    success:
      'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-stone-800/80 dark:text-emerald-400 dark:ring-stone-700',
    warning:
      'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-stone-800/80 dark:text-amber-400 dark:ring-stone-700',
    error:
      'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-stone-800/80 dark:text-red-400 dark:ring-stone-700',
    info: 'bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-200 dark:bg-stone-800/80 dark:text-brand-400 dark:ring-stone-700',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
