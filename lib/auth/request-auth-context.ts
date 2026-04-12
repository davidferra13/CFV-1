export const PATHNAME_HEADER = 'x-pathname'
export const AUTHENTICATED_HEADER = 'x-cf-authenticated'
export const USER_ID_HEADER = 'x-cf-user-id'
export const EMAIL_HEADER = 'x-cf-email'
export const ROLE_HEADER = 'x-cf-role'
export const ENTITY_ID_HEADER = 'x-cf-entity-id'
export const TENANT_ID_HEADER = 'x-cf-tenant-id'
export const REQUEST_ID_HEADER = 'x-request-id'

const INTERNAL_REQUEST_HEADERS = [
  AUTHENTICATED_HEADER,
  USER_ID_HEADER,
  EMAIL_HEADER,
  ROLE_HEADER,
  ENTITY_ID_HEADER,
  TENANT_ID_HEADER,
  // Strip inbound x-request-id to prevent client spoofing; middleware re-sets it
  REQUEST_ID_HEADER,
  // Defense-in-depth: strip Next.js internal header to prevent middleware bypass
  // (CVE-2025-29927 is patched in our version, but belt-and-suspenders)
  'x-middleware-subrequest',
] as const

export type RequestPortalAuthContext = {
  userId: string
  email: string
  role: 'chef' | 'client'
  entityId: string
  tenantId: string | null
}

type HeaderReader = {
  get(name: string): string | null
}

export function stripInternalRequestHeaders(headers: Headers): void {
  headers.delete(PATHNAME_HEADER)
  for (const name of INTERNAL_REQUEST_HEADERS) {
    headers.delete(name)
  }
}

export function setPathnameHeader(headers: Headers, pathname: string): void {
  headers.set(PATHNAME_HEADER, pathname)
}

export function setRequestAuthContext(
  headers: Headers,
  context: RequestPortalAuthContext | null
): void {
  if (!context) {
    headers.set(AUTHENTICATED_HEADER, '0')
    headers.delete(USER_ID_HEADER)
    headers.delete(EMAIL_HEADER)
    headers.delete(ROLE_HEADER)
    headers.delete(ENTITY_ID_HEADER)
    headers.delete(TENANT_ID_HEADER)
    return
  }

  headers.set(AUTHENTICATED_HEADER, '1')
  headers.set(USER_ID_HEADER, context.userId)
  headers.set(EMAIL_HEADER, context.email)
  headers.set(ROLE_HEADER, context.role)
  headers.set(ENTITY_ID_HEADER, context.entityId)

  if (context.tenantId) {
    headers.set(TENANT_ID_HEADER, context.tenantId)
  } else {
    headers.delete(TENANT_ID_HEADER)
  }
}

export function readRequestAuthContext(headers: HeaderReader): RequestPortalAuthContext | null {
  if (headers.get(AUTHENTICATED_HEADER) !== '1') {
    return null
  }

  const userId = headers.get(USER_ID_HEADER)
  const role = headers.get(ROLE_HEADER)
  const entityId = headers.get(ENTITY_ID_HEADER)

  if (!userId || !entityId || (role !== 'chef' && role !== 'client')) {
    return null
  }

  return {
    userId,
    email: headers.get(EMAIL_HEADER) ?? '',
    role,
    entityId,
    tenantId: headers.get(TENANT_ID_HEADER),
  }
}
