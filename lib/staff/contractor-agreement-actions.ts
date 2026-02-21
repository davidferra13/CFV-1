'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addAgreement(input: {
  staff_member_id: string
  effective_date: string
  scope_of_work?: string
  rate_cents?: number
  payment_terms?: string
  has_ip_clause?: boolean
  has_confidentiality_clause?: boolean
  document_url?: string
  expires_at?: string
}) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { error } = await (supabase as any).from('contractor_service_agreements').insert({
    tenant_id: chef.tenantId!,
    staff_member_id: input.staff_member_id,
    effective_date: input.effective_date,
    scope_of_work: input.scope_of_work ?? null,
    rate_cents: input.rate_cents ?? null,
    payment_terms: input.payment_terms ?? null,
    has_ip_clause: input.has_ip_clause ?? false,
    has_confidentiality_clause: input.has_confidentiality_clause ?? false,
    document_url: input.document_url ?? null,
    expires_at: input.expires_at ?? null,
    status: 'active',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/staff')
}

export async function getAgreementsForStaff(staffMemberId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { data } = await (supabase as any)
    .from('contractor_service_agreements')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .order('effective_date', { ascending: false })
  return data ?? []
}

export async function hasActiveAgreement(staffMemberId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { count } = await (supabase as any)
    .from('contractor_service_agreements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .eq('status', 'active')
  return (count ?? 0) > 0
}
