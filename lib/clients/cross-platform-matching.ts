'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { namesMatch, normalizePhone } from '@/lib/utils/name-matching'
import { revalidatePath } from 'next/cache'

export interface ClientMatch {
  clientId: string
  fullName: string
  email: string
  phone: string | null
  matchReasons: string[]
  inquiryCount: number
  eventCount: number
}

export async function findPotentialClientMatches(clientId: string): Promise<ClientMatch[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch target client
  const { data: target } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!target) return []

  // Fetch all other active clients for this tenant
  const { data: candidates } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', tenantId)
    .neq('id', clientId)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: true })

  if (!candidates || candidates.length === 0) return []

  const targetEmail = (target.email || '').toLowerCase().trim()
  const targetPhone = target.phone ? normalizePhone(target.phone) : null
  const targetName = target.full_name || ''

  const matches: ClientMatch[] = []

  for (const candidate of candidates) {
    const reasons: string[] = []

    // Email match (case-insensitive)
    const candidateEmail = (candidate.email || '').toLowerCase().trim()
    if (targetEmail && candidateEmail && targetEmail === candidateEmail) {
      reasons.push('Same email')
    }

    // Phone match (normalized)
    if (targetPhone && candidate.phone) {
      const candidatePhone = normalizePhone(candidate.phone)
      if (targetPhone && candidatePhone && targetPhone === candidatePhone) {
        reasons.push('Same phone')
      }
    }

    // Name match
    if (targetName && candidate.full_name && namesMatch(targetName, candidate.full_name)) {
      reasons.push('Similar name')
    }

    if (reasons.length === 0) continue

    // Fetch inquiry and event counts for this candidate
    const [inquiryResult, eventResult] = await Promise.all([
      db
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', candidate.id)
        .eq('tenant_id', tenantId),
      db
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', candidate.id)
        .eq('tenant_id', tenantId),
    ])

    matches.push({
      clientId: candidate.id,
      fullName: candidate.full_name || '',
      email: candidate.email || '',
      phone: candidate.phone || null,
      matchReasons: reasons,
      inquiryCount: inquiryResult.count ?? 0,
      eventCount: eventResult.count ?? 0,
    })
  }

  // Sort by number of match reasons desc, then inquiry count desc
  matches.sort((a, b) => {
    const reasonDiff = b.matchReasons.length - a.matchReasons.length
    if (reasonDiff !== 0) return reasonDiff
    return b.inquiryCount - a.inquiryCount
  })

  return matches.slice(0, 10)
}

export async function mergeClients(
  keepClientId: string,
  mergeClientId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (keepClientId === mergeClientId) {
    return { success: false, error: 'Cannot merge a client into itself' }
  }

  // Verify both clients belong to this tenant
  const [{ data: keepClient }, { data: mergeClient }] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('id', keepClientId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('id', mergeClientId)
      .eq('tenant_id', tenantId)
      .single(),
  ])

  if (!keepClient || !mergeClient) {
    return { success: false, error: 'Client not found' }
  }

  // Reassign all client-linked tables to the kept client
  const tablesToReassign = [
    'inquiries',
    'events',
    'messages',
    'client_notes',
    'client_tags',
    'client_allergy_records',
    'client_preferences',
    'loyalty_transactions',
    'client_referrals',
    'quotes',
    'conversations',
    'follow_up_sends',
    'client_touchpoint_rules',
    'ledger_entries',
  ]

  for (const table of tablesToReassign) {
    try {
      await db
        .from(table as any)
        .update({ client_id: keepClientId })
        .eq('client_id', mergeClientId)
        .eq('tenant_id', tenantId)
    } catch (err) {
      // Some tables may not exist or may not have tenant_id; try without tenant filter
      try {
        await db
          .from(table as any)
          .update({ client_id: keepClientId })
          .eq('client_id', mergeClientId)
      } catch {
        console.error(`[mergeClients] Failed to reassign ${table} (non-blocking)`, err)
      }
    }
  }

  // Also reassign referrer references (where merged client was the referrer)
  try {
    await db
      .from('client_referrals' as any)
      .update({ referrer_client_id: keepClientId })
      .eq('referrer_client_id', mergeClientId)
      .eq('tenant_id', tenantId)
  } catch {
    /* non-blocking */
  }

  // Soft-delete the merged client
  await db
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', mergeClientId)
    .eq('tenant_id', tenantId)

  // Insert audit log (non-blocking)
  try {
    await db.from('client_merge_log').insert({
      chef_id: tenantId,
      kept_client_id: keepClientId,
      merged_client_id: mergeClientId,
      merge_details: {
        kept_name: keepClient.full_name,
        merged_name: mergeClient.full_name,
        merged_email: mergeClient.email,
        merged_phone: mergeClient.phone,
        merged_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[non-blocking] Failed to insert client merge audit log', err)
  }

  revalidatePath('/clients')
  revalidatePath('/clients/' + keepClientId)

  return { success: true }
}
