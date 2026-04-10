// Internal (non-server-action) message helpers
// Used by background queue handlers that run without an authenticated chef session.
// These use createAdminClient() directly and must NOT be called from client components.

import { createAdminClient } from '@/lib/db/admin'

/**
 * Insert a draft outbound message for an inquiry.
 * Idempotent: if a draft already exists for this inquiry, returns the existing id.
 * Returns the message id, or null on failure.
 */
export async function insertDraftMessageInternal(params: {
  tenantId: string
  inquiryId: string
  clientId: string | null
  subject: string
  body: string
}): Promise<string | null> {
  const db: any = createAdminClient()

  // Guard: don't create a second draft if one already exists
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('inquiry_id', params.inquiryId)
    .eq('status', 'draft')
    .eq('direction', 'outbound')
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data, error } = await db
    .from('messages')
    .insert({
      tenant_id: params.tenantId,
      inquiry_id: params.inquiryId,
      client_id: params.clientId,
      channel: 'email',
      direction: 'outbound',
      status: 'draft',
      subject: params.subject,
      body: params.body,
      // sent_at is intentionally null for drafts
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[insertDraftMessageInternal] Failed:', error)
    return null
  }

  return data.id
}
