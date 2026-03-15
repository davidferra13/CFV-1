'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type NdaType = 'standard' | 'mutual' | 'custom'
export type NdaStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'voided'

export type NdaRow = {
  id: string
  tenant_id: string
  client_id: string
  nda_type: NdaType
  signed_date: string | null
  expiry_date: string | null
  status: NdaStatus
  notes: string | null
  document_url: string | null
  restrictions: string[] | null
  created_at: string
  updated_at: string
}

export type NdaCreateInput = {
  nda_type: NdaType
  signed_date?: string | null
  expiry_date?: string | null
  status?: NdaStatus
  notes?: string | null
  document_url?: string | null
  restrictions?: string[]
}

export type NdaUpdateInput = Partial<NdaCreateInput>

export type NdaDashboardSummary = {
  ndas: NdaRow[]
  counts: {
    total: number
    draft: number
    sent: number
    signed: number
    expired: number
    voided: number
    expiringSoon: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Auto-compute expired status for signed NDAs past their expiry date */
function computeStatus(nda: NdaRow): NdaRow {
  if (nda.status === 'signed' && nda.expiry_date && new Date(nda.expiry_date) < new Date()) {
    return { ...nda, status: 'expired' }
  }
  return nda
}

function computeStatuses(ndas: NdaRow[]): NdaRow[] {
  return ndas.map(computeStatus)
}

// ── Server Actions ─────────────────────────────────────────────────────────

export async function createNdaRecord(clientId: string, data: NdaCreateInput): Promise<NdaRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: nda, error } = await supabase
    .from('client_ndas' as any)
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      nda_type: data.nda_type,
      signed_date: data.signed_date ?? null,
      expiry_date: data.expiry_date ?? null,
      status: data.status ?? 'draft',
      notes: data.notes ?? null,
      document_url: data.document_url ?? null,
      restrictions: data.restrictions ?? [],
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createNdaRecord] Insert error:', error)
    throw new Error('Failed to create NDA')
  }

  revalidatePath('/clients')
  return computeStatus(nda as NdaRow)
}

export async function updateNdaRecord(id: string, data: NdaUpdateInput): Promise<NdaRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (data.nda_type !== undefined) updatePayload.nda_type = data.nda_type
  if (data.signed_date !== undefined) updatePayload.signed_date = data.signed_date
  if (data.expiry_date !== undefined) updatePayload.expiry_date = data.expiry_date
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.notes !== undefined) updatePayload.notes = data.notes
  if (data.document_url !== undefined) updatePayload.document_url = data.document_url
  if (data.restrictions !== undefined) updatePayload.restrictions = data.restrictions

  const { data: nda, error } = await supabase
    .from('client_ndas' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('[updateNdaRecord] Update error:', error)
    throw new Error('Failed to update NDA')
  }

  revalidatePath('/clients')
  return computeStatus(nda as NdaRow)
}

export async function deleteNdaRecord(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('client_ndas' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[deleteNdaRecord] Delete error:', error)
    throw new Error('Failed to delete NDA')
  }

  revalidatePath('/clients')
}

export async function getClientNdaRecords(clientId: string): Promise<NdaRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_ndas' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientNdaRecords] Error:', error)
    return []
  }

  return computeStatuses((data ?? []) as NdaRow[])
}

export async function getExpiringNdaRecords(daysAhead: number = 30): Promise<NdaRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('client_ndas' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'signed')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDateStr)
    .gte('expiry_date', today)
    .order('expiry_date', { ascending: true })

  if (error) {
    console.error('[getExpiringNdaRecords] Error:', error)
    return []
  }

  return (data ?? []) as NdaRow[]
}

export async function getNdaDashboard(): Promise<NdaDashboardSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_ndas' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getNdaDashboard] Error:', error)
    return {
      ndas: [],
      counts: { total: 0, draft: 0, sent: 0, signed: 0, expired: 0, voided: 0, expiringSoon: 0 },
    }
  }

  const ndas = computeStatuses((data ?? []) as NdaRow[])
  const now = new Date()
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(now.getDate() + 30)

  const expiringSoon = ndas.filter(
    (n) =>
      n.status === 'signed' &&
      n.expiry_date &&
      new Date(n.expiry_date) >= now &&
      new Date(n.expiry_date) <= thirtyDaysOut
  ).length

  return {
    ndas,
    counts: {
      total: ndas.length,
      draft: ndas.filter((n) => n.status === 'draft').length,
      sent: ndas.filter((n) => n.status === 'sent').length,
      signed: ndas.filter((n) => n.status === 'signed').length,
      expired: ndas.filter((n) => n.status === 'expired').length,
      voided: ndas.filter((n) => n.status === 'voided').length,
      expiringSoon,
    },
  }
}

export async function markNdaRecordSigned(id: string, signedDate?: string): Promise<NdaRow> {
  return updateNdaRecord(id, {
    status: 'signed',
    signed_date: signedDate ?? new Date().toISOString().split('T')[0],
  })
}
