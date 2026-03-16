'use client'

// SourceBadge - Color-coded channel badge with icon.
// Used everywhere: inbox cards, inquiry list, analytics, thread detail.
// All styling comes from lib/communication/channel-meta.ts.

import {
  ChefHat,
  Facebook,
  Flame,
  Footprints,
  Globe,
  Heart,
  HelpCircle,
  Instagram,
  Layout,
  Mail,
  MailOpen,
  MapPin,
  Megaphone,
  MessageCircle,
  Monitor,
  Music,
  PenLine,
  Phone,
  Pin,
  Send,
  Smartphone,
  StickyNote,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from '@/components/ui/icons'
import { getChannelMeta } from '@/lib/communication/channel-meta'

const ICON_MAP: Record<string, LucideIcon> = {
  ChefHat,
  Facebook,
  Flame,
  Footprints,
  Globe,
  Heart,
  HelpCircle,
  Instagram,
  Layout,
  Mail,
  MailOpen,
  MapPin,
  Megaphone,
  MessageCircle,
  Monitor,
  Music,
  PenLine,
  Phone,
  Pin,
  Send,
  Smartphone,
  StickyNote,
  Users,
  UtensilsCrossed,
}

type SourceBadgeProps = {
  /** The channel or source identifier (e.g. 'email', 'takeachef', 'instagram') */
  source: string
  /** 'sm' = icon-only dot, 'md' = icon + short label, 'lg' = icon + full label */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SourceBadge({ source, size = 'md', className = '' }: SourceBadgeProps) {
  const meta = getChannelMeta(source)
  const IconComponent = ICON_MAP[meta.iconName] ?? HelpCircle

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full ring-1 ${meta.bgColor} ${meta.ringColor} ${className}`}
        style={{ width: 22, height: 22 }}
        title={meta.label}
      >
        <IconComponent className={`h-3 w-3 ${meta.textColor}`} />
      </span>
    )
  }

  if (size === 'lg') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.bgColor} ${meta.textColor} ${meta.ringColor} ${className}`}
      >
        <IconComponent className="h-3.5 w-3.5" />
        {meta.label}
      </span>
    )
  }

  // Default: md
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.bgColor} ${meta.textColor} ${meta.ringColor} ${className}`}
    >
      <IconComponent className="h-3 w-3" />
      {meta.shortLabel}
    </span>
  )
}

/**
 * Renders a row of source badges for multi-channel threads.
 * Deduplicates sources and renders each as a small dot badge.
 */
export function SourceBadgeRow({
  sources,
  className = '',
}: {
  sources: string[]
  className?: string
}) {
  const unique = [...new Set(sources)]
  if (unique.length === 0) return null

  // Single source: show medium badge with label
  if (unique.length === 1) {
    return <SourceBadge source={unique[0]} size="md" className={className} />
  }

  // Multiple sources: show small icon-only dots
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {unique.map((s) => (
        <SourceBadge key={s} source={s} size="sm" />
      ))}
    </span>
  )
}
