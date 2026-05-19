// Badge Component - For status labels
'use client'

import { HTMLAttributes } from 'react'
import { STATUS_BADGE_CONTRAST_CLASSES } from '@/lib/ui/contrast-contract'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants = {
    default: STATUS_BADGE_CONTRAST_CLASSES.neutral,
    success: STATUS_BADGE_CONTRAST_CLASSES.success,
    warning: STATUS_BADGE_CONTRAST_CLASSES.warning,
    error: STATUS_BADGE_CONTRAST_CLASSES.danger,
    info: STATUS_BADGE_CONTRAST_CLASSES.info,
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
