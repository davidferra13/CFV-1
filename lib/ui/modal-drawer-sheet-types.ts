export type OverlayType = 'modal' | 'drawer' | 'sheet' | 'popover' | 'dialog'

export type SizePreset = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export type OverlayPosition = 'center' | 'left' | 'right' | 'bottom'

export type OverlayAnimation = 'fade' | 'slide' | 'scale' | 'none'

export type OverlayConfig = {
  id: string
  tenantId: string
  name: string
  overlayType: OverlayType
  sizePreset: SizePreset
  position: OverlayPosition
  animation: OverlayAnimation
  closeOnBackdrop: boolean
  closeOnEscape: boolean
  mobileOverride: OverlayType | null
  stackable: boolean
  maxStackDepth: number
  createdAt: Date
}

export type OverlayUsageRule = {
  id: string
  tenantId: string
  route: string
  component: string
  overlayConfigId: string
  purpose: string | null
  createdAt: Date
}

export type OverlaySummary = {
  totalConfigs: number
  totalUsageRules: number
  typeDistribution: Record<OverlayType, number>
  routesCovered: number
}
