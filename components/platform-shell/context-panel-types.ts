import type { BadgeProps } from '@/components/ui/badge'
import type { ButtonProps } from '@/components/ui/button'
import type { ContextPanelRouteFamily } from '@/lib/platform-shell/context-panel-contract'

export type PlatformStatusTone = NonNullable<BadgeProps['variant']>
export type PlatformActionVariant = NonNullable<ButtonProps['variant']>

export type PlatformStatusChip = {
  label: string
  tone?: PlatformStatusTone
}

export type ContextPanelAction = {
  label: string
  href: string
  variant?: PlatformActionVariant
}

export type ContextPanelMetric = {
  label: string
  value: string | number
  tone?: PlatformStatusTone
}

export type ContextPanelSectionState = 'loading' | 'empty' | 'error' | 'populated'

export type ContextPanelSection = {
  id: string
  title: string
  description?: string
  state?: ContextPanelSectionState
  status?: PlatformStatusChip
  metrics?: ContextPanelMetric[]
  actions?: ContextPanelAction[]
}

export type ContextCommandPanelProps = {
  family: ContextPanelRouteFamily
  title: string
  subtitle?: string
  statusChips?: PlatformStatusChip[]
  sections: ContextPanelSection[]
  defaultOpen?: boolean
}
