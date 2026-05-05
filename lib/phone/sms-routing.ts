/**
 * SMS routing utilities.
 * Resolves the best phone number to use for sending SMS to an entity.
 * Priority: routing_rules > phone_numbers (primary, verified, can_text) > env fallback.
 */

import { db } from '@/lib/db'
import { phoneNumbers } from '@/lib/db/schema/schema'
import { and, eq } from 'drizzle-orm'
import { createServerClient } from '@/lib/db/server'

/**
 * Resolve the SMS-capable phone number for a chef.
 * Priority:
 *   1. ai_call_routing_rules.chef_sms_number (legacy routing config)
 *   2. phone_numbers table: primary, verified, can_text
 *   3. chefs.phone (legacy single-column)
 *   4. CHEF_ALERT_SMS_NUMBER env var
 */
export async function resolveChefSmsNumber(tenantId: string): Promise<string | null> {
  // 1. Check routing rules (Supabase client for legacy table)
  try {
    const supabase: any = createServerClient()
    const { data: routingRule } = await supabase
      .from('ai_call_routing_rules')
      .select('chef_sms_number')
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (routingRule?.chef_sms_number) {
      return routingRule.chef_sms_number
    }
  } catch {
    // Routing rules table may not exist; continue
  }

  // 2. Check phone_numbers table (primary, verified, can_text)
  const bestPhone = await resolveSmsNumber('chef', tenantId)
  if (bestPhone) return bestPhone

  // 3. Legacy chefs.phone column
  try {
    const supabase: any = createServerClient()
    const { data: chef } = await supabase
      .from('chefs')
      .select('phone')
      .eq('id', tenantId)
      .maybeSingle()

    if (chef?.phone) return chef.phone
  } catch {
    // Continue to env fallback
  }

  // 4. Env fallback
  return process.env.CHEF_ALERT_SMS_NUMBER ?? null
}

/**
 * Generic SMS number resolution from the phone_numbers table.
 * Finds the best phone for an entity: primary + verified + can_text preferred.
 * Falls back to any verified + can_text, then any can_text.
 */
export async function resolveSmsNumber(
  entityType: string,
  entityId: string
): Promise<string | null> {
  const allPhones = await db
    .select({
      phoneE164: phoneNumbers.phoneE164,
      type: phoneNumbers.type,
      verified: phoneNumbers.verified,
      canText: phoneNumbers.canText,
    })
    .from(phoneNumbers)
    .where(and(eq(phoneNumbers.entityType, entityType), eq(phoneNumbers.entityId, entityId)))

  if (allPhones.length === 0) return null

  // Best: primary + verified + can_text
  const primaryVerifiedText = allPhones.find((p) => p.type === 'primary' && p.verified && p.canText)
  if (primaryVerifiedText) return primaryVerifiedText.phoneE164

  // Next: any verified + can_text
  const verifiedText = allPhones.find((p) => p.verified && p.canText)
  if (verifiedText) return verifiedText.phoneE164

  // Next: any can_text (even unverified)
  const anyText = allPhones.find((p) => p.canText)
  if (anyText) return anyText.phoneE164

  // Last resort: any phone
  return allPhones[0]?.phoneE164 ?? null
}
