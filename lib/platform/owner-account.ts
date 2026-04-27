// Platform owner account. Resolved from env vars with hardcoded fallbacks.
export const FOUNDER_EMAIL = (process.env.FOUNDER_EMAIL || 'davidferra13@gmail.com').trim().toLowerCase()
export const DEFAULT_ADMIN_NOTIFICATION_EMAIL = (process.env.ADMIN_NOTIFICATION_EMAIL || 'info@cheflowhq.com').trim().toLowerCase()
export const DEFAULT_DEVELOPER_NOTIFICATION_EMAIL = (process.env.DEVELOPER_NOTIFICATION_EMAIL || 'DFPrivateChef@gmail.com').trim().toLowerCase()
const OWNER_CACHE_TTL_MS = 60_000

export type OwnerIdentity = {
  founderEmail: string
  ownerChefId: string | null
  ownerAuthUserId: string | null
  adminEmails: string[]
  warnings: string[]
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeId(value: string | undefined): string | null {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function parseEmailList(value: string | undefined): string[] {
  return (value ?? '').split(',').map(normalizeEmail).filter(Boolean)
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

/**
 * Legacy admin email list for notifications and founder metadata.
 * Not used for security gates.
 */
export function getAdminEmails(): string[] {
  return uniqueStrings([...parseEmailList(process.env.ADMIN_EMAILS), FOUNDER_EMAIL])
}

/**
 * Platform notification recipients for owner/admin events.
 * Combines notification-specific env vars with admin allowlist and hard fallbacks.
 */
export function getAdminNotificationRecipients(): string[] {
  return uniqueStrings([
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...getAdminEmails(),
    DEFAULT_ADMIN_NOTIFICATION_EMAIL,
  ])
}

/**
 * Developer-only notification recipients for operational alerts and digests.
 * Keeps observability mail out of broader business/admin channels.
 */
export function getDeveloperNotificationRecipients(): string[] {
  return uniqueStrings([
    ...parseEmailList(process.env.DEVELOPER_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.DEVELOPER_NOTIFICATION_EMAIL),
    DEFAULT_DEVELOPER_NOTIFICATION_EMAIL,
    FOUNDER_EMAIL,
  ])
}

let ownerIdentityCache: { value: OwnerIdentity; expiresAt: number } | null = null

export function __resetOwnerIdentityCacheForTests() {
  ownerIdentityCache = null
}

export async function resolveOwnerIdentity(db: any): Promise<OwnerIdentity> {
  const now = Date.now()
  if (ownerIdentityCache && now < ownerIdentityCache.expiresAt) {
    return ownerIdentityCache.value
  }

  const warnings: string[] = []
  const adminEmails = getAdminEmails()

  const { data: founderChef, error: founderError } = await db
    .from('chefs')
    .select('id')
    .ilike('email', FOUNDER_EMAIL)
    .maybeSingle()

  if (founderError) {
    warnings.push(`owner_lookup_failed:${founderError.message}`)
  }

  const founderChefId = founderChef?.id ?? null
  const envOwnerChefId = normalizeId(process.env.PLATFORM_OWNER_CHEF_ID)

  let ownerChefId: string | null = founderChefId
  if (founderChefId && envOwnerChefId && envOwnerChefId !== founderChefId) {
    warnings.push('owner_env_mismatch_ignored')
  } else if (!founderChefId && envOwnerChefId) {
    // Legacy fallback only when founder row is missing.
    ownerChefId = envOwnerChefId
    warnings.push('owner_fallback_to_env_id')
  } else if (!founderChefId) {
    warnings.push('owner_not_found_by_founder_email')
  }

  let ownerAuthUserId: string | null = null
  if (ownerChefId) {
    const { data: ownerRole, error: roleError } = await db
      .from('user_roles')
      .select('auth_user_id')
      .eq('role', 'chef')
      .eq('entity_id', ownerChefId)
      .maybeSingle()

    if (roleError) {
      warnings.push(`owner_role_lookup_failed:${roleError.message}`)
    }

    ownerAuthUserId = ownerRole?.auth_user_id ?? null
    if (!ownerAuthUserId) {
      warnings.push('owner_auth_user_missing')
    }
  }

  const identity: OwnerIdentity = {
    founderEmail: FOUNDER_EMAIL,
    ownerChefId,
    ownerAuthUserId,
    adminEmails,
    warnings: uniqueStrings(warnings),
  }

  ownerIdentityCache = {
    value: identity,
    expiresAt: now + OWNER_CACHE_TTL_MS,
  }

  return identity
}

export async function resolveOwnerChefId(db: any): Promise<string | null> {
  const identity = await resolveOwnerIdentity(db)
  return identity.ownerChefId
}

export async function resolveOwnerAuthUserId(db: any): Promise<string | null> {
  const identity = await resolveOwnerIdentity(db)
  return identity.ownerAuthUserId
}
