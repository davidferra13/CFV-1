'use server'

// Marketplace Inquiry Submission
// Public form submission for the marketplace chef inquiry page.
// Creates a client record (or reuses existing), creates the inquiry,
// and optionally links the marketplace profile if the user is authenticated.

import { headers } from 'next/headers'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { findExistingClientByEmail } from '@/lib/clients/find-existing'
import { getCurrentUser } from '@/lib/auth/get-user'
import { recordInquiryStateTransition } from '@/lib/inquiries/transition-log'

const MarketplaceInquirySchema = z.object({
  chefId: z.string().uuid('Invalid chef ID'),
  // Contact info
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().or(z.literal('')),
  // Event details
  eventDate: z.string().min(1, 'Event date is required'),
  guestCount: z.number().int().positive('Guest count must be at least 1'),
  eventType: z.string().min(1, 'Event type is required'),
  // Preferences
  cuisinePreferences: z.string().optional().or(z.literal('')),
  dietaryRestrictions: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
  // Honeypot
  websiteUrl: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
})

export type MarketplaceInquiryInput = z.infer<typeof MarketplaceInquirySchema>

/**
 * Submit a marketplace inquiry for a specific chef.
 * Public (no auth required). Creates the inquiry and optionally
 * links the authenticated user's marketplace profile.
 */
export async function submitMarketplaceInquiry(
  input: MarketplaceInquiryInput
): Promise<{ success: true; inquiryId: string } | { success: false; error: string }> {
  try {
    const validated = MarketplaceInquirySchema.parse(input)

    // Honeypot check
    if (validated.websiteUrl?.trim()) {
      // Bot filled the honeypot; return fake success to avoid retries
      return { success: true, inquiryId: 'none' }
    }

    // Rate limiting by IP and email
    const hdrs = await headers()
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await checkRateLimit(`marketplace-inquiry:ip:${ip}`, 8, 5 * 60_000)
    await checkRateLimit(
      `marketplace-inquiry:email:${validated.email.toLowerCase().trim()}`,
      4,
      60 * 60_000
    )

    const supabase: any = createServerClient({ admin: true })
    const tenantId = validated.chefId

    // Verify chef exists and is accepting marketplace inquiries
    const { data: chef } = await supabase
      .from('chefs')
      .select('id, business_name, directory_approved, is_deleted')
      .eq('id', tenantId)
      .single()

    if (!chef || !chef.directory_approved || chef.is_deleted) {
      return { success: false, error: 'This chef is not currently accepting inquiries.' }
    }

    const { data: marketplaceProfile } = await supabase
      .from('chef_marketplace_profiles')
      .select('accepting_inquiries')
      .eq('chef_id', tenantId)
      .single()

    if (!marketplaceProfile?.accepting_inquiries) {
      return { success: false, error: 'This chef is not currently accepting inquiries.' }
    }

    const contactName = validated.fullName.trim()
    const contactEmail = validated.email.toLowerCase().trim()
    const contactPhone = validated.phone?.trim() || null

    // Find or create client record for this chef's tenant
    let clientId = await findExistingClientByEmail(supabase, tenantId, contactEmail)

    if (!clientId) {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          full_name: contactName,
          email: contactEmail,
          phone: contactPhone,
        })
        .select('id')
        .single()

      if (clientErr) {
        console.error('[submitMarketplaceInquiry] Client creation error:', clientErr)
        return { success: false, error: 'Failed to process your inquiry. Please try again.' }
      }
      clientId = newClient.id
    }

    // Build source message from form fields
    const dietaryList = validated.dietaryRestrictions
      ? validated.dietaryRestrictions
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : null

    const sourceParts = [
      `Event Type: ${validated.eventType.trim()}`,
      validated.cuisinePreferences?.trim()
        ? `Cuisine Preferences: ${validated.cuisinePreferences.trim()}`
        : null,
      validated.dietaryRestrictions?.trim()
        ? `Dietary Restrictions: ${validated.dietaryRestrictions.trim()}`
        : null,
      validated.message?.trim() ? `Message: ${validated.message.trim()}` : null,
    ].filter(Boolean)
    const sourceMessage = sourceParts.join('\n')

    // Create the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'website',
        client_id: clientId,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        first_contact_at: new Date().toISOString(),
        confirmed_date: validated.eventDate || null,
        confirmed_guest_count: validated.guestCount,
        confirmed_occasion: validated.eventType.trim(),
        confirmed_dietary_restrictions: dietaryList,
        source_message: sourceMessage || null,
        unknown_fields: {
          campaign_source: 'marketplace',
          cuisine_preferences: validated.cuisinePreferences?.trim() || null,
          additional_notes: validated.message?.trim() || null,
        },
        status: 'new',
      })
      .select('id')
      .single()

    if (inquiryError) {
      console.error('[submitMarketplaceInquiry] Inquiry creation error:', inquiryError)
      return { success: false, error: 'Failed to create inquiry. Please try again.' }
    }

    // Record state transition (non-blocking)
    try {
      await recordInquiryStateTransition({
        supabase,
        tenantId,
        inquiryId: inquiry.id,
        fromStatus: null,
        toStatus: 'new',
        transitionedBy: null,
        reason: 'marketplace_inquiry_submitted',
        metadata: {
          source: 'marketplace',
        },
      })
    } catch (transitionErr) {
      console.error(
        '[submitMarketplaceInquiry] Transition log failed (non-blocking):',
        transitionErr
      )
    }

    // If user is authenticated, upsert marketplace_client_links (non-blocking)
    try {
      const user = await getCurrentUser()
      if (user && user.role === 'client') {
        const adminClient = createAdminClient()

        // Find or create marketplace profile
        let { data: mktProfile } = await adminClient
          .from('marketplace_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!mktProfile) {
          const { data: newProfile } = await adminClient
            .from('marketplace_profiles')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              primary_client_id: user.entityId,
            })
            .select('id')
            .single()
          mktProfile = newProfile
        }

        if (mktProfile) {
          await adminClient.from('marketplace_client_links').upsert(
            {
              marketplace_profile_id: mktProfile.id,
              client_id: clientId,
              tenant_id: tenantId,
              first_inquiry_at: new Date().toISOString(),
            },
            {
              onConflict: 'marketplace_profile_id,tenant_id',
              ignoreDuplicates: true,
            }
          )
        }
      }
    } catch (linkErr) {
      console.error('[submitMarketplaceInquiry] Marketplace link failed (non-blocking):', linkErr)
    }

    // Push notification to chef (non-blocking)
    try {
      const { getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        const { notifyNewInquiry } = await import('@/lib/notifications/onesignal')
        await notifyNewInquiry(chefUserId, contactName, validated.eventDate || 'date TBD')
      }
    } catch (err) {
      console.error('[submitMarketplaceInquiry] Push notification failed (non-blocking):', err)
    }

    return { success: true, inquiryId: inquiry.id }
  } catch (err: any) {
    // Zod validation errors
    if (err?.issues) {
      const firstIssue = err.issues[0]
      return { success: false, error: firstIssue?.message || 'Invalid form data.' }
    }

    // Rate limit errors
    if (err?.message?.includes('Rate limit')) {
      return {
        success: false,
        error: 'Too many submissions. Please wait a few minutes and try again.',
      }
    }

    console.error('[submitMarketplaceInquiry] Unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
