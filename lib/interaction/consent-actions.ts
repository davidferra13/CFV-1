'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ConsentType,
  ConsentStatus,
  ConsentRecord,
  SharingPermission,
  ConsentSummary,
} from './consent-types'

// ---- 1. Record consent ----
export async function recordConsent(
  clientId: string,
  consentType: ConsentType,
  status: ConsentStatus,
  source: string
): Promise<{ success: boolean; error?: string; data?: ConsentRecord }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await db
    .from('consent_records')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      consent_type: consentType,
      status,
      source,
      granted_at: status === 'granted' ? new Date().toISOString() : null,
      withdrawn_at: status === 'withdrawn' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('[consent] record failed', error)
    return { success: false, error: 'Failed to record consent' }
  }

  return { success: true, data }
}

// ---- 2. Get client consents ----
export async function getClientConsents(clientId: string): Promise<ConsentRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('consent_records')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[consent] get client consents failed', error)
    return []
  }

  return data ?? []
}

// ---- 3. Withdraw consent ----
export async function withdrawConsent(
  clientId: string,
  consentType: ConsentType
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Insert a new withdrawal record (audit trail, not overwrite)
  const { error } = await db.from('consent_records').insert({
    tenant_id: tenantId,
    client_id: clientId,
    consent_type: consentType,
    status: 'withdrawn',
    source: 'portal',
    withdrawn_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[consent] withdraw failed', error)
    return { success: false, error: 'Failed to withdraw consent' }
  }

  return { success: true }
}

// ---- 4. Get consent summary ----
export async function getConsentSummary(clientId?: string): Promise<ConsentSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get all consent records, optionally filtered by client
  let query = db
    .from('consent_records')
    .select('client_id, consent_type, status, granted_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: records, error } = await query

  if (error) {
    console.error('[consent] get summary failed', error)
    return []
  }

  if (!records || records.length === 0) return []

  // Get client names
  const clientIds = [...new Set(records.map((r: any) => r.client_id))]
  const { data: clients } = await db
    .from('clients')
    .select('id, first_name, last_name')
    .in('id', clientIds)

  const clientMap = new Map<string, string>()
  for (const c of clients ?? []) {
    clientMap.set(c.id, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown')
  }

  // Group by client, take latest record per consent type
  const allConsentTypes: ConsentType[] = [
    'marketing',
    'photos',
    'testimonials',
    'data_sharing',
    'dietary_storage',
    'contact_reuse',
  ]
  const grouped = new Map<
    string,
    Map<string, { type: ConsentType; status: ConsentStatus; grantedAt: string | null }>
  >()

  for (const r of records) {
    if (!grouped.has(r.client_id)) {
      grouped.set(r.client_id, new Map())
    }
    const clientConsents = grouped.get(r.client_id)!
    // First record per type wins (already ordered by created_at desc)
    if (!clientConsents.has(r.consent_type)) {
      clientConsents.set(r.consent_type, {
        type: r.consent_type,
        status: r.status,
        grantedAt: r.granted_at,
      })
    }
  }

  const summaries: ConsentSummary[] = []
  for (const [cid, consentMap] of grouped) {
    const consents = allConsentTypes.map(
      (t) => consentMap.get(t) ?? { type: t, status: 'pending' as ConsentStatus, grantedAt: null }
    )
    const answered = consents.filter((c) => c.status !== 'pending').length
    summaries.push({
      clientId: cid,
      clientName: clientMap.get(cid) ?? 'Unknown',
      consents,
      completeness: Math.round((answered / allConsentTypes.length) * 100),
    })
  }

  return summaries
}

// ---- 5. Set sharing permission ----
export async function setSharingPermission(
  entityType: string,
  entityId: string,
  visibility: string,
  expiresAt?: string
): Promise<{ success: boolean; error?: string; data?: SharingPermission }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await db
    .from('sharing_permissions')
    .upsert(
      {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        visibility,
        expires_at: expiresAt ?? null,
      },
      { onConflict: 'tenant_id,entity_type,entity_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[sharing] set permission failed', error)
    return { success: false, error: 'Failed to set sharing permission' }
  }

  return { success: true, data }
}

// ---- 6. Get sharing permissions ----
export async function getSharingPermissions(
  entityType: string,
  entityId: string
): Promise<SharingPermission | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('sharing_permissions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    console.error('[sharing] get permissions failed', error)
    return null
  }

  return data
}

// ---- 7. Get expiring consents ----
export async function getExpiringConsents(daysAhead: number): Promise<ConsentRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  // Get granted consents where granted_at is older than (now - daysAhead)
  // This surfaces consents that may need renewal based on age
  const renewalCutoff = new Date()
  renewalCutoff.setFullYear(renewalCutoff.getFullYear() - 1)
  renewalCutoff.setDate(renewalCutoff.getDate() + daysAhead)

  const { data, error } = await db
    .from('consent_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'granted')
    .lte('granted_at', renewalCutoff.toISOString())
    .order('granted_at', { ascending: true })

  if (error) {
    console.error('[consent] get expiring failed', error)
    return []
  }

  return data ?? []
}
