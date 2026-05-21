// Client Gift Card Actions - View gift cards received or purchased

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClientGiftCard = {
  id: string
  code: string
  initialValueCents: number
  currentBalanceCents: number
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  message: string | null
  purchaserName: string | null
  expiresAt: string | null
  issuedAt: string
}

export async function getMyGiftCards(): Promise<ClientGiftCard[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Find gift cards where recipient email matches client email
  const { data: client } = await db
    .from('clients')
    .select('email, tenant_id')
    .eq('id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client?.email) return []

  const { data, error } = await db
    .from('gift_cards')
    .select(
      'id, code, initial_value_cents, current_balance_cents, status, message, purchaser_name, expires_at, issued_at'
    )
    .eq('tenant_id', client.tenant_id)
    .eq('recipient_email', client.email)
    .order('issued_at', { ascending: false })

  if (error) {
    console.error('[getMyGiftCards] Query failed:', error)
    return []
  }

  return (data ?? []).map((g: any) => ({
    id: g.id,
    code: g.code,
    initialValueCents: g.initial_value_cents,
    currentBalanceCents: g.current_balance_cents,
    status: g.status,
    message: g.message,
    purchaserName: g.purchaser_name,
    expiresAt: g.expires_at,
    issuedAt: g.issued_at,
  }))
}
