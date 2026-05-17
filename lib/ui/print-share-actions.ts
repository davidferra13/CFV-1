'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  AssetType,
  AssetFormat,
  PrintShareConfig,
  GeneratedAsset,
  ShareLink,
  PrintShareSummary,
} from './print-share-types'

const CONFIG_TABLE = 'print_share_configs'
const ASSETS_TABLE = 'generated_assets'
const LINKS_TABLE = 'share_links'

const VALID_ASSET_TYPES: AssetType[] = [
  'menu',
  'quote',
  'invoice',
  'contract',
  'prep_sheet',
  'shopping_list',
  'timeline',
]

const VALID_FORMATS: AssetFormat[] = ['pdf', 'print', 'share_link', 'image']

function mapConfig(row: any): PrintShareConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assetType: row.asset_type as AssetType,
    format: row.format as AssetFormat,
    template: row.template ?? null,
    branding: row.branding ?? null,
    headerLogo: row.header_logo ?? null,
    footerText: row.footer_text ?? null,
    colorScheme: row.color_scheme ?? null,
    createdAt: row.created_at,
  }
}

function mapAsset(row: any): GeneratedAsset {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assetType: row.asset_type as AssetType,
    entityId: row.entity_id,
    format: row.format as AssetFormat,
    filePath: row.file_path,
    fileSize: row.file_size ?? null,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at ?? null,
  }
}

function mapLink(row: any): ShareLink {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assetType: row.asset_type as AssetType,
    entityId: row.entity_id,
    token: row.token,
    accessCount: row.access_count ?? 0,
    maxAccesses: row.max_accesses ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  }
}

/**
 * Get print/share config for an asset type.
 */
export async function getPrintShareConfig(
  assetType: AssetType
): Promise<{ success: boolean; config?: PrintShareConfig; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_ASSET_TYPES.includes(assetType)) {
    return { success: false, error: 'Invalid asset type' }
  }

  const { data, error } = await db
    .from(CONFIG_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('asset_type', assetType)
    .single()

  if (error && error.code !== 'PGRST116') return { success: false, error: error.message }
  return { success: true, config: data ? mapConfig(data) : undefined }
}

/**
 * Save print/share config for an asset type.
 */
export async function updatePrintShareConfig(
  assetType: AssetType,
  format: AssetFormat,
  template?: string,
  branding?: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_ASSET_TYPES.includes(assetType)) {
    return { success: false, error: 'Invalid asset type' }
  }
  if (!VALID_FORMATS.includes(format)) {
    return { success: false, error: 'Invalid format' }
  }

  const payload = {
    tenant_id: user.tenantId!,
    asset_type: assetType,
    format,
    template: template ?? null,
    branding: branding ?? null,
  }

  const { data: existing } = await db
    .from(CONFIG_TABLE)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('asset_type', assetType)
    .single()

  if (existing) {
    const { error } = await db
      .from(CONFIG_TABLE)
      .update({ format, template: template ?? null, branding: branding ?? null })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    return { success: true, id: existing.id }
  }

  const { data, error } = await db.from(CONFIG_TABLE).insert(payload).select('id').single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * Log a generated asset.
 */
export async function recordGeneratedAsset(
  assetType: AssetType,
  entityId: string,
  format: AssetFormat,
  filePath: string,
  fileSize?: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_ASSET_TYPES.includes(assetType)) {
    return { success: false, error: 'Invalid asset type' }
  }
  if (!VALID_FORMATS.includes(format)) {
    return { success: false, error: 'Invalid format' }
  }
  if (!entityId || !filePath) {
    return { success: false, error: 'entityId and filePath are required' }
  }

  const { data, error } = await db
    .from(ASSETS_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      asset_type: assetType,
      entity_id: entityId,
      format,
      file_path: filePath,
      file_size: fileSize ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * List generated assets with optional filters.
 */
export async function getGeneratedAssets(
  assetType?: AssetType,
  entityId?: string,
  limit?: number
): Promise<{ success: boolean; assets?: GeneratedAsset[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(ASSETS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('generated_at', { ascending: false })
    .limit(limit ?? 50)

  if (assetType && VALID_ASSET_TYPES.includes(assetType)) {
    query = query.eq('asset_type', assetType)
  }
  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query

  if (error) return { success: false, error: error.message }
  return { success: true, assets: (data ?? []).map(mapAsset) }
}

/**
 * Create a share link with a unique token.
 */
export async function createShareLink(
  assetType: AssetType,
  entityId: string,
  maxAccesses?: number,
  expiresInHours?: number
): Promise<{ success: boolean; link?: ShareLink; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_ASSET_TYPES.includes(assetType)) {
    return { success: false, error: 'Invalid asset type' }
  }
  if (!entityId) {
    return { success: false, error: 'entityId is required' }
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await db
    .from(LINKS_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      asset_type: assetType,
      entity_id: entityId,
      token,
      max_accesses: maxAccesses ?? null,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, link: data ? mapLink(data) : undefined }
}

/**
 * Increment access count for a share link by token.
 */
export async function recordShareAccess(
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: 'Token is required' }

  const db: any = createServerClient()

  const { data: link, error: fetchError } = await db
    .from(LINKS_TABLE)
    .select('id, access_count, max_accesses, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !link) {
    return { success: false, error: 'Share link not found' }
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, error: 'Share link has expired' }
  }

  if (link.max_accesses && (link.access_count ?? 0) >= link.max_accesses) {
    return { success: false, error: 'Share link access limit reached' }
  }

  const { error } = await db
    .from(LINKS_TABLE)
    .update({ access_count: (link.access_count ?? 0) + 1 })
    .eq('id', link.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Aggregate print/share stats for the current tenant.
 */
export async function getPrintShareSummary(): Promise<{
  success: boolean
  summary?: PrintShareSummary
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: assets, error: assetsError } = await db
    .from(ASSETS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('generated_at', { ascending: false })

  if (assetsError) return { success: false, error: assetsError.message }

  const { data: links, error: linksError } = await db
    .from(LINKS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (linksError) return { success: false, error: linksError.message }

  const allAssets: GeneratedAsset[] = (assets ?? []).map(mapAsset)
  const allLinks: ShareLink[] = (links ?? []).map(mapLink)

  const byType = {} as Record<AssetType, number>
  const byFormat = {} as Record<AssetFormat, number>

  for (const t of VALID_ASSET_TYPES) byType[t] = 0
  for (const f of VALID_FORMATS) byFormat[f] = 0

  for (const a of allAssets) {
    if (a.assetType in byType) byType[a.assetType]++
    if (a.format in byFormat) byFormat[a.format]++
  }

  const now = new Date()
  const activeLinks = allLinks.filter((l) => !l.expiresAt || new Date(l.expiresAt) > now)

  return {
    success: true,
    summary: {
      totalGenerated: allAssets.length,
      byType,
      byFormat,
      recentAssets: allAssets.slice(0, 10),
      activeShareLinks: activeLinks,
    },
  }
}
