/**
 * Menu Provenance System - Types
 *
 * Tracks how each menu was created (its "birth certificate").
 * origin_type is immutable after creation. origin_metadata is append-only.
 */

export const MENU_ORIGIN_TYPES = [
  'chef_created',
  'client_provided',
  'forked',
  'templated',
  'uploaded',
  'suggested',
  'collaborative',
] as const

export type MenuOriginType = (typeof MENU_ORIGIN_TYPES)[number]

// Discriminated union for origin-specific metadata
export type MenuOriginMetadata =
  | { type: 'chef_created' }
  | { type: 'forked'; forked_from_id: string; fork_reason?: string; fork_generation: number }
  | { type: 'templated'; template_id: string; template_name: string; seasonal_context?: string }
  | { type: 'uploaded'; source_filename: string; upload_format: string; parse_confidence?: number }
  | {
      type: 'suggested'
      suggestion_engine: string
      suggestion_reason: string
      suggestion_score?: number
    }
  | {
      type: 'client_provided'
      submission_method: string
      original_text?: string
      client_id?: string
    }
  | { type: 'collaborative'; initiator: string; participant_ids: string[]; turn_count: number }

/**
 * Helper to build provenance fields for menu inserts.
 * Returns { origin_type, origin_metadata } ready to spread into an insert object.
 */
export function buildProvenance(
  originType: MenuOriginType,
  metadata: MenuOriginMetadata
): { origin_type: MenuOriginType; origin_metadata: MenuOriginMetadata } {
  return { origin_type: originType, origin_metadata: metadata }
}

/**
 * Set provenance on an existing menu (for code paths that create the menu
 * first and need to stamp provenance afterward).
 * Caller must supply an authenticated Supabase client.
 */
export async function setMenuProvenance(
  db: any,
  menuId: string,
  tenantId: string,
  originType: MenuOriginType,
  originMetadata: MenuOriginMetadata
): Promise<void> {
  const { error } = await db
    .from('menus')
    .update({
      origin_type: originType,
      origin_metadata: originMetadata,
    })
    .eq('id', menuId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[setMenuProvenance] Failed:', error)
  }
}

/**
 * Read fork_generation from existing origin_metadata, defaulting to 0.
 * Safe to call on any menu regardless of origin_type.
 */
export function getForkGeneration(originMetadata: unknown): number {
  if (
    originMetadata &&
    typeof originMetadata === 'object' &&
    'fork_generation' in originMetadata &&
    typeof (originMetadata as any).fork_generation === 'number'
  ) {
    return (originMetadata as any).fork_generation
  }
  return 0
}
