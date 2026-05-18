'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export interface RawFeedItem {
  id: string
  fromAddress: string
  subject: string
  classification: string
  confidence: number
  platform: string
  syncedAt: string
  linkedInquiryId: string | null
}

const PLATFORM_DOMAINS = [
  'thumbtack.com',
  'takeachef.com',
  'privatechefmanager.com',
  'yhangry.com',
  'bark.com',
  'theknot.com',
  'weddingwire.com',
  'cozymeal.com',
  'gigsalad.com',
  'hireachef.com',
  'cuisineistchef.com',
  'cuisineist.com',
  'wix.com',
] as const

const DOMAIN_TO_PLATFORM: Record<string, string> = {
  'thumbtack.com': 'Thumbtack',
  'takeachef.com': 'TakeAChef',
  'yhangry.com': 'Yhangry',
  'bark.com': 'Bark',
  'theknot.com': 'The Knot',
  'weddingwire.com': 'The Knot',
  'cozymeal.com': 'Cozymeal',
  'gigsalad.com': 'GigSalad',
  'privatechefmanager.com': 'PrivateChefManager',
  'hireachef.com': 'HireAChef',
  'cuisineistchef.com': 'CuisineistChef',
  'cuisineist.com': 'CuisineistChef',
  'wix.com': 'Wix',
}

function detectPlatform(fromAddress: string): string | null {
  const lower = fromAddress.toLowerCase()
  for (const domain of PLATFORM_DOMAINS) {
    if (lower.includes(domain)) {
      return DOMAIN_TO_PLATFORM[domain] ?? null
    }
  }
  return null
}

export async function getPlatformRawFeed(limit = 50): Promise<RawFeedItem[]> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Fetch more rows than needed since we filter in JS
    const fetchLimit = limit * 3

    const { data, error } = await db
      .from('gmail_sync_log')
      .select('id, from_address, subject, classification, confidence, inquiry_id, synced_at')
      .eq('tenant_id', user.tenantId!)
      .order('synced_at', { ascending: false })
      .limit(fetchLimit)

    if (error) {
      console.error('[platform-raw-feed] Query failed:', error.message)
      return []
    }

    if (!data) return []

    const results: RawFeedItem[] = []

    for (const row of data) {
      if (results.length >= limit) break

      const platform = detectPlatform(row.from_address ?? '')
      if (!platform) continue

      results.push({
        id: row.id,
        fromAddress: row.from_address ?? '',
        subject: row.subject ?? '',
        classification: row.classification ?? '',
        confidence: row.confidence ?? 0,
        platform,
        syncedAt: row.synced_at ?? '',
        linkedInquiryId: row.inquiry_id ?? null,
      })
    }

    return results
  } catch (err) {
    console.error('[platform-raw-feed] Error:', err)
    return []
  }
}

/**
 * Create an inquiry record from a platform email in the raw feed.
 * Links the gmail_sync_log entry to the new inquiry. Extracts what it can
 * from the email subject/classification; chef fills in the rest.
 */
export async function createInquiryFromPlatformEmail(
  emailId: string
): Promise<{ success: boolean; inquiryId?: string; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Load the email record
    const { data: email, error: emailError } = await db
      .from('gmail_sync_log')
      .select('id, from_address, subject, body_preview, classification, synced_at, inquiry_id')
      .eq('id', emailId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (emailError || !email) {
      return { success: false, error: 'Email not found' }
    }

    if (email.inquiry_id) {
      return { success: false, error: 'Already linked to an inquiry' }
    }

    // Detect platform for source attribution
    const platform = detectPlatform(email.from_address ?? '')

    // Create inquiry with what we know
    const { data: inquiry, error: inquiryError } = await db
      .from('inquiries')
      .insert({
        tenant_id: user.tenantId!,
        channel: platform ? platform.toLowerCase().replace(/\s+/g, '_') : 'email',
        status: 'new',
        first_contact_at: email.synced_at || new Date().toISOString(),
        source_message: email.subject || null,
        source_type: 'platform_email',
        unknown_fields: {
          platform_source: platform,
          original_email_id: emailId,
          from_address: email.from_address,
          body_preview: email.body_preview || null,
        },
      })
      .select('id')
      .single()

    if (inquiryError || !inquiry) {
      return { success: false, error: 'Failed to create inquiry' }
    }

    // Link the email back to the inquiry
    await db.from('gmail_sync_log').update({ inquiry_id: inquiry.id }).eq('id', emailId)

    return { success: true, inquiryId: inquiry.id }
  } catch (err) {
    console.error('[platform-raw-feed] createInquiryFromPlatformEmail error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
