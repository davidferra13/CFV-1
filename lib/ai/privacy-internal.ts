// AI Privacy - Internal helpers (no 'use server')
// Functions here are NOT callable from the browser.
// Used by background processes (cron, scheduled jobs) that have a tenantId but no user session.

import { createServerClient } from '@/lib/db/server'
import { canDraftAiDocuments } from '@/lib/ai/private-runtime-policy'

/**
 * Check if Remy is enabled for a given tenant.
 * Returns false if Remy is disabled or preferences don't exist.
 * No auth check - intended for background processes with a known tenantId.
 */
export async function isAiEnabledForTenant(tenantId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data } = await db
    .from('ai_preferences')
    .select('remy_enabled')
    .eq('tenant_id', tenantId)
    .single()

  // No preferences row = not onboarded = not enabled
  if (!data) return false
  return data.remy_enabled === true
}

export async function areDocumentDraftsAllowedForTenant(tenantId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('ai_preferences')
    .select('allow_document_drafts')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load AI document draft preference: ${error.message}`)
  }

  return canDraftAiDocuments({
    allowDocumentDrafts: data?.allow_document_drafts !== false,
  })
}

export async function areAiSuggestionsAllowedForTenant(tenantId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('ai_preferences')
    .select('allow_suggestions')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load AI suggestion preference: ${error.message}`)
  }

  return data?.allow_suggestions !== false
}
