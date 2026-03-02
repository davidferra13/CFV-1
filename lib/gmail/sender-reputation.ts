// Sender Reputation — self-improving email filter
// Tracks how the chef interacts with emails from each sender domain.
// Domains that are consistently dismissed get auto-classified as marketing.
//
// NOT a 'use server' file — imported by classify.ts (which IS 'use server').

import { createServerClient } from '@/lib/supabase/server'
import type { EmailClassification } from './types'

/** Minimum mark_done count before auto-classifying a domain as marketing */
const AUTO_MARKETING_THRESHOLD = 3

type ReputationAction = 'mark_done' | 'mark_spam' | 'replied' | 'inquiry_created'

/**
 * Record a triage action for a sender domain. Called as a non-blocking
 * side effect when the chef performs inbox triage actions.
 */
export async function recordSenderAction(
  tenantId: string,
  senderIdentity: string,
  action: ReputationAction
): Promise<void> {
  const domain = extractDomainFromIdentity(senderIdentity)
  if (!domain) return

  const supabase: any = createServerClient({ admin: true })

  const columnMap: Record<ReputationAction, string> = {
    mark_done: 'mark_done_count',
    mark_spam: 'mark_spam_count',
    replied: 'replied_count',
    inquiry_created: 'inquiry_created_count',
  }
  const column = columnMap[action]

  // Upsert: increment the relevant counter, update last_seen_at
  // Also auto-compute reputation based on the updated counts
  const { error } = await supabase.rpc('upsert_sender_reputation', {
    p_tenant_id: tenantId,
    p_sender_domain: domain,
    p_column: column,
    p_threshold: AUTO_MARKETING_THRESHOLD,
  })

  if (error) {
    // Fallback: try simple upsert without RPC (in case RPC doesn't exist yet)
    const { data: existing } = await supabase
      .from('email_sender_reputation' as any)
      .select('id, mark_done_count, mark_spam_count, replied_count, inquiry_created_count')
      .eq('tenant_id', tenantId)
      .eq('sender_domain', domain)
      .single()

    if (existing) {
      const updates: Record<string, unknown> = {
        [column]: (existing as any)[column] + 1,
        last_seen_at: new Date().toISOString(),
      }

      // Auto-compute reputation
      const newCounts = { ...existing, [column]: (existing as any)[column] + 1 } as any
      if (
        newCounts.mark_done_count >= AUTO_MARKETING_THRESHOLD &&
        newCounts.replied_count === 0 &&
        newCounts.inquiry_created_count === 0
      ) {
        updates.reputation = 'marketing'
      } else if (newCounts.mark_spam_count >= 1) {
        updates.reputation = 'spam'
      } else if (newCounts.replied_count >= 1 || newCounts.inquiry_created_count >= 1) {
        updates.reputation = 'trusted'
      }

      await supabase
        .from('email_sender_reputation' as any)
        .update(updates)
        .eq('id', existing.id)
    } else {
      await supabase.from('email_sender_reputation' as any).insert({
        tenant_id: tenantId,
        sender_domain: domain,
        [column]: 1,
        last_seen_at: new Date().toISOString(),
      })
    }
  }
}

/**
 * Check if a sender domain has a known reputation. Used as Layer 5
 * in the classification pipeline — runs after heuristics, before Ollama.
 */
export async function checkSenderReputation(
  tenantId: string,
  senderDomain: string
): Promise<EmailClassification | null> {
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('email_sender_reputation' as any)
    .select('reputation, mark_done_count, replied_count, inquiry_created_count')
    .eq('tenant_id', tenantId)
    .eq('sender_domain', senderDomain)
    .single()

  if (!data) return null

  const rep = data as any

  if (rep.reputation === 'spam') {
    return {
      category: 'spam',
      confidence: 'high',
      reasoning: `Sender domain ${senderDomain} marked as spam by chef`,
      is_food_related: false,
    }
  }

  if (rep.reputation === 'marketing') {
    return {
      category: 'marketing',
      confidence: 'high',
      reasoning: `Sender domain ${senderDomain} auto-classified as marketing (${rep.mark_done_count} dismissed, 0 replies/inquiries)`,
      is_food_related: false,
    }
  }

  // 'trusted' and 'unknown' — let later layers handle it
  return null
}

/**
 * Extract the email domain from a sender_identity string.
 * Handles formats like "John Doe <john@example.com>" and "john@example.com".
 */
function extractDomainFromIdentity(senderIdentity: string): string | null {
  const emailMatch = senderIdentity.match(/<([^>]+)>/) || senderIdentity.match(/([^\s]+@[^\s]+)/)
  if (!emailMatch) return null

  const email = emailMatch[1].toLowerCase()
  const atIndex = email.lastIndexOf('@')
  if (atIndex === -1) return null

  return email.slice(atIndex + 1)
}
