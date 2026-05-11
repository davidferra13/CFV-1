'use client'

import { cn } from '@/lib/utils'

interface RecipeStatusBadgeProps {
  status: 'stub' | 'draft' | 'active' | 'archived'
  size?: 'sm' | 'md'
}

const statusConfig = {
  stub: {
    label: 'Stub',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border border-dashed border-amber-500/40',
  },
  draft: {
    label: 'Draft',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: '',
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: '',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-stone-500/20',
    text: 'text-stone-400',
    border: '',
  },
} as const

export function RecipeStatusBadge({ status, size = 'md' }: RecipeStatusBadgeProps) {
  const c = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        c.bg,
        c.text,
        c.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
    >
      {c.label}
    </span>
  )
}
