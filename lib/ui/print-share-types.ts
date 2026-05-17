// Print/PDF/Share Asset Visual Consistency - Types

export type AssetType =
  | 'menu'
  | 'quote'
  | 'invoice'
  | 'contract'
  | 'prep_sheet'
  | 'shopping_list'
  | 'timeline'

export type AssetFormat = 'pdf' | 'print' | 'share_link' | 'image'

export interface PrintShareConfig {
  id: string
  tenantId: string
  assetType: AssetType
  format: AssetFormat
  template: string | null
  branding: Record<string, unknown> | null
  headerLogo: string | null
  footerText: string | null
  colorScheme: string | null
  createdAt: string
}

export interface GeneratedAsset {
  id: string
  tenantId: string
  assetType: AssetType
  entityId: string
  format: AssetFormat
  filePath: string
  fileSize: number | null
  generatedAt: string
  expiresAt: string | null
}

export interface ShareLink {
  id: string
  tenantId: string
  assetType: AssetType
  entityId: string
  token: string
  accessCount: number
  maxAccesses: number | null
  expiresAt: string | null
  createdAt: string
}

export interface PrintShareSummary {
  totalGenerated: number
  byType: Record<AssetType, number>
  byFormat: Record<AssetFormat, number>
  recentAssets: GeneratedAsset[]
  activeShareLinks: ShareLink[]
}
