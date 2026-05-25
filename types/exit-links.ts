export type ExitCategory =
  | 'data-gaps'
  | 'missing-features'
  | 'channel-lock-in'
  | 'transaction'
  | 'external-platform'
  | 'government'
  | 'tax-financial'
  | 'creative'
  | 'marketing'
  | 'professional-growth'
  | 'kitchen-boundary'

export interface ExitLinkDefinition {
  id: number
  category: ExitCategory
  label: string
  urlTemplate: string | null
  contextKeys: string[]
  icon: string
  newTab: boolean
  inApp?: boolean
  subLinks?: SubLinkDefinition[]
}

export type SubLinkDefinition = Omit<ExitLinkDefinition, 'id' | 'category' | 'subLinks'>

export interface ExitLinkResult {
  url: string | null
  label: string
  icon: string
  newTab: boolean
  inApp?: boolean
  subLinks?: ExitLinkResult[]
}
