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
      'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-800',
    warning:
      'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800',
    error:
      'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800',
    info: 'bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-200 dark:bg-brand-950 dark:text-brand-400 dark:ring-brand-800',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium animate-scale-in ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
