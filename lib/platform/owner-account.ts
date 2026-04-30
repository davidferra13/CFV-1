// Platform owner account. Resolved from env vars with hardcoded fallbacks.
export const FOUNDER_EMAIL = (process.env.FOUNDER_EMAIL || 'davidferra13@gmail.com')
  .trim()
  .toLowerCase()
export const DEFAULT_ADMIN_NOTIFICATION_EMAIL = (
  process.env.ADMIN_NOTIFICATION_EMAIL || 'info@cheflowhq.com'
)
  .trim()
  .toLowerCase()
export const DEFAULT_DEVELOPER_NOTIFICATION_EMAIL = (
  process.env.DEVELOPER_NOTIFICATION_EMAIL || 'DFPrivateChef@gmail.com'
)
  .trim()
  .toLowerCase()
export const FOUNDER_AUTHORITY_LABEL = 'Founder Authority'
const OWNER_CACHE_TTL_MS = 60_000

export type FounderAuthorityAccess = {
  authUserId: string
  email: string
  accessLevel: 'owner'
  authority: typeof FOUNDER_AUTHORITY_LABEL
  match: 'auth_user_id' | 'founder_email'
}

export type FounderAuthorityHealth = {
  activeOwnerCount: number
  activeAdminCount: number
  activeVipCount: number
  founderPlatformAccessLevel: string | null
  founderPlatformAccessActive: boolean | null
  configuredFounderAuthUserId: string | null
  warnings: string[]
}

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

function normalizeId(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function parseEmailList(value: string | undefined): string[] {
  return (value ?? '').split(',').map(normalizeEmail).filter(Boolean)
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function getConfiguredFounderAuthUserId(): string | null {
  return normalizeId(process.env.FOUNDER_AUTH_USER_ID ?? process.env.PLATFORM_OWNER_AUTH_USER_ID)
}

function isLocalRuntime(): boolean {
  const appEnv = normalizeEmail(
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? ''
  )
  const appUrl = normalizeEmail(
    process.env.NEXTAUTH_URL ??
      process.env.AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      ''
  )

  return (
    appEnv === '' ||
    appEnv === 'development' ||
    appEnv === 'dev' ||
    appEnv === 'local' ||
    appEnv === 'test' ||
    appUrl.includes('localhost') ||
    appUrl.includes('127.0.0.1')
  )
}

export function isFounderEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email ?? '') === FOUNDER_EMAIL
}

export function getFounderAuthorityForSessionUser(user: {
  id?: string | null
  email?: string | null
}): FounderAuthorityAccess | null {
  const authUserId = normalizeId(user.id)
  const email = normalizeEmail(user.email ?? '')

  if (!authUserId || email !== FOUNDER_EMAIL) {
    return null
  }

  const configuredAuthUserId = getConfiguredFounderAuthUserId()

  if (configuredAuthUserId && configuredAuthUserId !== authUserId) {
    return null
  }

  return {
    authUserId,
    email,
    accessLevel: 'owner',
    authority: FOUNDER_AUTHORITY_LABEL,
    match: configuredAuthUserId ? 'auth_user_id' : 'founder_email',
  }
}

export async function resolveFounderAuthorityForAuthUser(
  db: any,
  authUserId: string | null | undefined
): Promise<FounderAuthorityAccess | null> {
  const normalizedAuthUserId = normalizeId(authUserId)
  if (!normalizedAuthUserId) {
    return null
  }

  const configuredAuthUserId = getConfiguredFounderAuthUserId()

  if (configuredAuthUserId) {
    return configuredAuthUserId === normalizedAuthUserId
      ? {
          authUserId: normalizedAuthUserId,
          email: FOUNDER_EMAIL,
          accessLevel: 'owner',
          authority: FOUNDER_AUTHORITY_LABEL,
          match: 'auth_user_id',
        }
      : null
  }

  const { data: ownerRole, error: roleError } = await db
    .from('user_roles')
    .select('entity_id')
    .eq('auth_user_id', normalizedAuthUserId)
    .eq('role', 'chef')
    .maybeSingle()

  if (roleError || !ownerRole?.entity_id) {
    return null
  }

  const { data: chef, error: chefError } = await db
    .from('chefs')
    .select('email')
    .eq('id', ownerRole.entity_id)
    .maybeSingle()

  if (chefError || !isFounderEmail(chef?.email)) {
    return null
  }

  return {
    authUserId: normalizedAuthUserId,
    email: FOUNDER_EMAIL,
    accessLevel: 'owner',
    authority: FOUNDER_AUTHORITY_LABEL,
    match: 'founder_email',
  }
}

/**
 * Legacy admin email list for notifications and founder metadata.
 * Not used for security gates.
 */
export function getAdminEmails(): string[] {
  return uniqueStrings([...parseEmailList(process.env.ADMIN_EMAILS), FOUNDER_EMAIL])
}

export async function getFounderAuthorityHealth(db: any): Promise<FounderAuthorityHealth> {
  const ownerIdentity = await resolveOwnerIdentity(db)
  const configuredFounderAuthUserId = getConfiguredFounderAuthUserId()
  const warnings = [...ownerIdentity.warnings]

  const { data: platformRows, error: platformRowsError } = await db
    .from('platform_admins')
    .select('auth_user_id, email, access_level, is_active')

  if (platformRowsError) {
    warnings.push(`founder_platform_access_lookup_failed:${platformRowsError.message}`)
  }

  const rows = (platformRows ?? []) as Array<{
    auth_user_id?: string | null
    email?: string | null
    access_level?: string | null
    is_active?: boolean | null
  }>

  const activeRows = rows.filter((row) => row.is_active === true)
  const activeOwnerRows = activeRows.filter((row) => row.access_level === 'owner')
  const activeAdminRows = activeRows.filter((row) => row.access_level === 'admin')
  const activeVipRows = activeRows.filter((row) => row.access_level === 'vip')
  const founderPlatformRow =
    rows.find((row) => isFounderEmail(row.email)) ??
    rows.find(
      (row) => ownerIdentity.ownerAuthUserId && row.auth_user_id === ownerIdentity.ownerAuthUserId
    ) ??
    null

  if (activeOwnerRows.length === 0) {
    warnings.push('founder_authority_no_active_owner')
  } else if (activeOwnerRows.length > 1) {
    warnings.push(`founder_authority_multiple_active_owners:${activeOwnerRows.length}`)
  }

  if (!configuredFounderAuthUserId) {
    warnings.push('founder_auth_user_id_env_missing')
  } else if (
    ownerIdentity.ownerAuthUserId &&
    configuredFounderAuthUserId !== ownerIdentity.ownerAuthUserId
  ) {
    warnings.push('founder_auth_user_id_env_mismatch')
  }

  if (!founderPlatformRow) {
    warnings.push('founder_platform_admin_row_missing')
  } else {
    if (founderPlatformRow.is_active !== true) {
      warnings.push('founder_platform_admin_row_inactive')
    }
    if (founderPlatformRow.access_level !== 'owner') {
      warnings.push('founder_platform_admin_row_not_owner')
    }
  }

  const agentAdminActive = activeRows.some(
    (row) => normalizeEmail(row.email ?? '') === 'agent@local.chefflow'
  )
  if (agentAdminActive && !isLocalRuntime()) {
    warnings.push('agent_platform_admin_active_outside_local')
  }

  return {
    activeOwnerCount: activeOwnerRows.length,
    activeAdminCount: activeAdminRows.length,
    activeVipCount: activeVipRows.length,
    founderPlatformAccessLevel: founderPlatformRow?.access_level ?? null,
    founderPlatformAccessActive: founderPlatformRow?.is_active ?? null,
    configuredFounderAuthUserId,
    warnings: uniqueStrings(warnings),
  }
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
