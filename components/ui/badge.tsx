// Badge Component - For status labels
'use client'

import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    error: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
