export type ComponentCategory =
  | 'card'
  | 'badge'
  | 'timeline'
  | 'action'
  | 'metric'
  | 'progress'
  | 'alert'

export type MagicComponent = {
  id: string
  tenantId: string
  name: string
  category: ComponentCategory
  variant: string | null
  props: Record<string, unknown>
  previewRoute: string | null
  score: number | null
  createdAt: string
}

export type ComponentVariant = {
  id: string
  tenantId: string
  componentId: string
  name: string
  propsOverrides: Record<string, unknown>
  isDefault: boolean
  createdAt: string
}

export type ComponentUsage = {
  id: string
  tenantId: string
  componentName: string
  route: string
  usedAt: string
}

export type MagicComponentSummary = {
  totalComponents: number
  byCategory: Record<ComponentCategory, number>
  totalVariants: number
  mostUsed: string | null
  leastUsed: string | null
}
