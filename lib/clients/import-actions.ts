'use server'

// Client Import Actions — Onboarding path
// Bypasses the invitation flow so chefs can directly migrate existing client records.
// auth_user_id is left null — the client has no account yet.
// An invitation can be sent later from the normal clients page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ImportClientSchema = z.object({
  full_name: z.string().min(1, 'Name required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  referral_source: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  // Historical financial data — used to compute loyalty tier
  lifetime_events_count: z.number().int().min(0).optional(),
  lifetime_value_cents: z.number().int().min(0).optional(),
})

export type ImportClientInput = z.infer<typeof ImportClientSchema>

export async function importClientDirect(input: ImportClientInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = ImportClientSchema.parse(input)

  const email = validated.email?.trim() || null
  const phone = validated.phone?.trim() || null
  const referralSource = validated.referral_source?.trim() || null

  // If email provided, check for duplicate within tenant
  if (email) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      throw new Error(`A client with email ${email} already exists`)
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: user.tenantId!,
      full_name: validated.full_name,
      email,
      phone,
      preferred_contact_method: validated.preferred_contact_method ?? 'text',
      referral_source: referralSource,
      dietary_restrictions: validated.dietary_restrictions ?? [],
      allergies: validated.allergies ?? [],
      total_events_count: validated.lifetime_events_count ?? 0,
      lifetime_value_cents: validated.lifetime_value_cents ?? 0,
      status: 'active',
      // auth_user_id intentionally omitted — client has no account yet
    })
    .select('id, full_name, total_events_count')
    .single()

  if (error) {
    console.error('[importClientDirect] Error:', error)
    throw new Error('Failed to import client')
  }

  revalidatePath('/onboarding/clients')
  revalidatePath('/clients')

  return {
    success: true as const,
    client: data as { id: string; full_name: string; total_events_count: number | null },
  }
}

// Lightweight client list for the loyalty seeding page
export async function getImportedClients() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, loyalty_points, loyalty_tier, total_events_count')
    .eq('tenant_id', user.tenantId!)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[getImportedClients] Error:', error)
    return []
  }

  return data ?? []
}
