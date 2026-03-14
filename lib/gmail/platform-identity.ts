export interface StoredPlatformIdentityRecord {
  external_inquiry_id?: string | null
  external_link?: string | null
  unknown_fields?: unknown
}

export function dedupeIdentityKeys(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    seen.add(trimmed)
  }
  return Array.from(seen)
}

export function extractIdentityKeysFromUnknownFields(unknownFields: unknown): string[] {
  const fields =
    unknownFields && typeof unknownFields === 'object'
      ? (unknownFields as Record<string, unknown>)
      : null

  if (!fields) return []

  const platformIdentityKeys = Array.isArray(fields.platform_identity_keys)
    ? fields.platform_identity_keys.filter((value): value is string => typeof value === 'string')
    : []

  const legacyKeys = [
    typeof fields.tac_cta_uri_token === 'string' ? fields.tac_cta_uri_token : null,
    typeof fields.tac_link === 'string' ? fields.tac_link : null,
    typeof fields.tac_order_id === 'string' ? fields.tac_order_id : null,
    typeof fields.quote_id === 'string' ? fields.quote_id : null,
    typeof fields.quote_url === 'string' ? fields.quote_url : null,
  ]

  return dedupeIdentityKeys([...platformIdentityKeys, ...legacyKeys])
}

export function collectStoredPlatformIdentityKeys(
  record: StoredPlatformIdentityRecord | null | undefined
): string[] {
  if (!record) return []

  return dedupeIdentityKeys([
    record.external_inquiry_id ?? null,
    record.external_link ?? null,
    ...extractIdentityKeysFromUnknownFields(record.unknown_fields),
  ])
}

export function mergePlatformIdentityKeys(
  unknownFields: Record<string, unknown> | null | undefined,
  identityKeys: Array<string | null | undefined>,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  const existing = unknownFields ?? {}
  const mergedIdentityKeys = dedupeIdentityKeys([
    ...extractIdentityKeysFromUnknownFields(existing),
    ...identityKeys,
  ])

  return {
    ...existing,
    ...extras,
    platform_identity_keys: mergedIdentityKeys,
  }
}
