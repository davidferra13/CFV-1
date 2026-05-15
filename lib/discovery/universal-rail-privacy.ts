// Unified privacy taxonomy for Universal Rail system
// Merges 4 legacy vocabularies: guest, client, chef, staff/partner

export type UniversalRailPrivacy =
  | 'public' // visible to anyone, no auth required
  | 'account_private' // visible only to the owning account
  | 'tenant_scoped' // visible to all members of a tenant (chef + their staff)
  | 'role_scoped' // visible only to users with a specific role relationship
  | 'system' // visible only to system/admin

export interface UniversalRailPrivacyDescriptor {
  level: UniversalRailPrivacy
  visibleTo: UniversalRailPrivacyAudience[]
  requiresAuth: boolean
  requiresTenantMatch: boolean
  forbiddenFields?: string[]
}

export type UniversalRailPrivacyAudience =
  | 'self' // only the user who owns this data
  | 'household' // user + household members
  | 'event_participants' // all participants of a specific event
  | 'chef' // the chef for this tenant
  | 'staff' // staff members of this tenant
  | 'partner' // partners associated with this tenant
  | 'circle_members' // members of a dinner circle
  | 'admin' // platform admins
  | 'anyone' // public, no restrictions

// Legacy privacy types from each role catalog

export type LegacyGuestPrivacy =
  | 'public'
  | 'account_private'
  | 'behavior_private'
  | 'preference_private'
  | 'aggregate_public'
export type LegacyClientPrivacy = 'private' | 'chef_visible' | 'household_visible' | 'event_visible'
export type LegacyChefPrivacy = 'tenant' | 'shared' | 'system'
export type LegacyStaffPrivacy = 'tenant-scoped'
export type LegacyPartnerPrivacy = 'partner-scoped'

// Staff members must NEVER see these fields (from staff catalog privacy contract)
export const STAFF_FORBIDDEN_FIELDS = [
  'quoted_price',
  'payments',
  'refunds',
  'revenue',
  'margin',
  'food_cost',
  'labor_cost',
  'payroll_amount',
  'tips',
  'booking_pipeline',
  'lead_value',
  'conversion_metrics',
  'utilization',
  'pricing_strategy',
  'market_intelligence',
] as const

// Partners must NEVER see these fields
export const PARTNER_FORBIDDEN_FIELDS = [
  'other_partner_data',
  'internal_margins',
  'chef_financials',
  'staff_payroll',
  'client_pii',
  'business_metrics',
] as const

// Adapter: map legacy guest privacy to unified system

export function mapGuestPrivacy(legacy: LegacyGuestPrivacy): UniversalRailPrivacyDescriptor {
  switch (legacy) {
    case 'public':
      return {
        level: 'public',
        visibleTo: ['anyone'],
        requiresAuth: false,
        requiresTenantMatch: false,
      }
    case 'account_private':
      return {
        level: 'account_private',
        visibleTo: ['self'],
        requiresAuth: true,
        requiresTenantMatch: false,
      }
    case 'behavior_private':
      return {
        level: 'account_private',
        visibleTo: ['self'],
        requiresAuth: true,
        requiresTenantMatch: false,
        forbiddenFields: ['browsing_history', 'click_patterns', 'scroll_depth'],
      }
    case 'preference_private':
      return {
        level: 'account_private',
        visibleTo: ['self'],
        requiresAuth: true,
        requiresTenantMatch: false,
        forbiddenFields: ['taste_profile_raw', 'preference_weights'],
      }
    case 'aggregate_public':
      return {
        level: 'public',
        visibleTo: ['anyone'],
        requiresAuth: false,
        requiresTenantMatch: false,
        forbiddenFields: ['individual_votes', 'user_ids'],
      }
  }
}

// Adapter: map legacy client privacy to unified system

export function mapClientPrivacy(legacy: LegacyClientPrivacy): UniversalRailPrivacyDescriptor {
  switch (legacy) {
    case 'private':
      return {
        level: 'account_private',
        visibleTo: ['self'],
        requiresAuth: true,
        requiresTenantMatch: false,
      }
    case 'chef_visible':
      return {
        level: 'role_scoped',
        visibleTo: ['self', 'chef'],
        requiresAuth: true,
        requiresTenantMatch: true,
      }
    case 'household_visible':
      return {
        level: 'role_scoped',
        visibleTo: ['self', 'household'],
        requiresAuth: true,
        requiresTenantMatch: false,
      }
    case 'event_visible':
      return {
        level: 'role_scoped',
        visibleTo: ['self', 'event_participants', 'chef'],
        requiresAuth: true,
        requiresTenantMatch: true,
      }
  }
}

// Adapter: map legacy chef privacy to unified system

export function mapChefPrivacy(legacy: LegacyChefPrivacy): UniversalRailPrivacyDescriptor {
  switch (legacy) {
    case 'tenant':
      return {
        level: 'tenant_scoped',
        visibleTo: ['chef', 'staff'],
        requiresAuth: true,
        requiresTenantMatch: true,
      }
    case 'shared':
      return {
        level: 'role_scoped',
        visibleTo: ['chef', 'staff', 'partner'],
        requiresAuth: true,
        requiresTenantMatch: true,
      }
    case 'system':
      return {
        level: 'system',
        visibleTo: ['admin'],
        requiresAuth: true,
        requiresTenantMatch: false,
      }
  }
}

// Adapter: map legacy staff privacy to unified system

export function mapStaffPrivacy(_legacy: LegacyStaffPrivacy): UniversalRailPrivacyDescriptor {
  return {
    level: 'tenant_scoped',
    visibleTo: ['self', 'chef', 'staff'],
    requiresAuth: true,
    requiresTenantMatch: true,
    forbiddenFields: [...STAFF_FORBIDDEN_FIELDS],
  }
}

// Adapter: map legacy partner privacy to unified system

export function mapPartnerPrivacy(_legacy: LegacyPartnerPrivacy): UniversalRailPrivacyDescriptor {
  return {
    level: 'role_scoped',
    visibleTo: ['self', 'chef'],
    requiresAuth: true,
    requiresTenantMatch: true,
    forbiddenFields: [...PARTNER_FORBIDDEN_FIELDS],
  }
}

// Check if a user can view a rail item based on privacy descriptor

export function canViewRailItem(
  privacy: UniversalRailPrivacyDescriptor,
  viewer: {
    role: string
    userId?: string
    tenantId?: string
    isAuthenticated: boolean
  },
  itemOwnerId?: string,
  itemTenantId?: string
): boolean {
  if (!privacy.requiresAuth && privacy.level === 'public') return true
  if (privacy.requiresAuth && !viewer.isAuthenticated) return false
  if (privacy.requiresTenantMatch && viewer.tenantId !== itemTenantId) return false
  if (privacy.level === 'account_private' && viewer.userId !== itemOwnerId) return false
  if (privacy.level === 'system' && viewer.role !== 'admin') return false

  if (privacy.level === 'role_scoped') {
    return privacy.visibleTo.some((audience) => {
      if (audience === 'anyone') return true
      if (audience === 'self') return viewer.userId === itemOwnerId
      if (audience === 'chef') return viewer.role === 'chef'
      if (audience === 'staff') return viewer.role === 'staff'
      if (audience === 'partner') return viewer.role === 'partner'
      if (audience === 'admin') return viewer.role === 'admin'
      // household, event_participants, circle_members need context-specific checks
      return false
    })
  }

  if (privacy.level === 'tenant_scoped') {
    return viewer.tenantId === itemTenantId
  }

  return true
}

// Strip forbidden fields from item metadata before rendering

export function stripForbiddenFields(
  metadata: Record<string, unknown>,
  forbiddenFields: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!forbiddenFields.includes(key)) {
      result[key] = value
    }
  }
  return result
}
