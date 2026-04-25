'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'

type QueryResult<T = Record<string, unknown>> = {
  rows: T[]
}

const db = {
  async query<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<QueryResult<T>> {
    const rows = await pgClient.unsafe(sql, params as any[])
    return { rows: rows as unknown as T[] }
  },
}

export async function getClientPassport(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `SELECT * FROM client_passports WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  )
  return result.rows[0] ?? null
}

export async function upsertClientPassport(
  clientId: string,
  data: {
    communication_mode?: string
    preferred_contact_method?: string
    chef_autonomy_level?: string
    auto_approve_under_cents?: number | null
    max_interaction_rounds?: number | null
    standing_instructions?: string | null
    default_guest_count?: number | null
    budget_range_min_cents?: number | null
    budget_range_max_cents?: number | null
    service_style?: string | null
    default_locations?: Array<{ label: string; address?: string; city: string; state: string }>
    delegate_name?: string | null
    delegate_email?: string | null
    delegate_phone?: string | null
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `INSERT INTO client_passports (
      tenant_id, client_id,
      communication_mode, preferred_contact_method, chef_autonomy_level,
      auto_approve_under_cents, max_interaction_rounds, standing_instructions,
      default_guest_count, budget_range_min_cents, budget_range_max_cents,
      service_style, default_locations,
      delegate_name, delegate_email, delegate_phone
    ) VALUES (
      $1, $2,
      COALESCE($3, 'direct'), COALESCE($4, 'email'), COALESCE($5, 'moderate'),
      $6, $7, $8,
      COALESCE($9, 2), $10, $11,
      $12, COALESCE($13::jsonb, '[]'::jsonb),
      $14, $15, $16
    )
    ON CONFLICT (tenant_id, client_id)
    DO UPDATE SET
      communication_mode = COALESCE($3, client_passports.communication_mode),
      preferred_contact_method = COALESCE($4, client_passports.preferred_contact_method),
      chef_autonomy_level = COALESCE($5, client_passports.chef_autonomy_level),
      auto_approve_under_cents = $6,
      max_interaction_rounds = $7,
      standing_instructions = $8,
      default_guest_count = COALESCE($9, client_passports.default_guest_count),
      budget_range_min_cents = $10,
      budget_range_max_cents = $11,
      service_style = $12,
      default_locations = COALESCE($13::jsonb, client_passports.default_locations),
      delegate_name = $14,
      delegate_email = $15,
      delegate_phone = $16,
      updated_at = now()
    RETURNING *`,
    [
      tenantId,
      clientId,
      data.communication_mode,
      data.preferred_contact_method,
      data.chef_autonomy_level,
      data.auto_approve_under_cents,
      data.max_interaction_rounds,
      data.standing_instructions,
      data.default_guest_count,
      data.budget_range_min_cents,
      data.budget_range_max_cents,
      data.service_style,
      JSON.stringify(data.default_locations ?? []),
      data.delegate_name,
      data.delegate_email,
      data.delegate_phone,
    ]
  )

  revalidatePath(`/clients/${clientId}`)
  return { success: true, passport: result.rows[0] }
}

export async function deleteClientPassport(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  await db.query(`DELETE FROM client_passports WHERE tenant_id = $1 AND client_id = $2`, [
    tenantId,
    clientId,
  ])

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}
