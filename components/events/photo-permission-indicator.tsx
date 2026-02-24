'use client'

import { Lock, Unlock } from 'lucide-react'

type PermissionLevel = 'none' | 'portfolio_only' | 'public_with_approval' | 'public_freely'

const LABELS: Record<PermissionLevel, string> = {
  none: 'No permission',
  portfolio_only: 'Portfolio only',
  public_with_approval: 'Requires approval',
  public_freely: 'Public use OK',
}

export function PhotoPermissionIndicator({
  permission,
  size = 'sm',
}: {
  permission: PermissionLevel | null
  size?: 'sm' | 'md'
}) {
  const level = permission ?? 'none'
  const isRestricted = level === 'none'
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  if (level === 'public_freely') return null

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
        isRestricted
          ? 'bg-red-900 text-red-700'
          : level === 'portfolio_only'
            ? 'bg-amber-900 text-amber-700'
            : 'bg-blue-900 text-blue-700'
      }`}
      title={LABELS[level]}
    >
      {isRestricted ? <Lock className={iconSize} /> : <Unlock className={iconSize} />}
      <span>{LABELS[level]}</span>
    </div>
  )
}
