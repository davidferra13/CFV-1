// Badge Component - For status labels
'use client'

import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-stone-800/80 text-stone-400 ring-1 ring-inset ring-stone-700',
    success: 'bg-emerald-950 text-emerald-400 ring-1 ring-inset ring-emerald-800',
    warning: 'bg-amber-950 text-amber-400 ring-1 ring-inset ring-amber-800',
    error: 'bg-red-950 text-red-400 ring-1 ring-inset ring-red-800',
    info: 'bg-sky-950 text-sky-400 ring-1 ring-inset ring-sky-800',
  }

  return (
    <span
      className={`ui-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium animate-scale-in ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
