'use server'

// Take a Chef AI Import Action
// Parses a pasted TakeaChef booking notification email into structured ChefFlow records.
// Pipeline: rawText → parseInquiryFromText → createClientFromLead → insert inquiry → insert event → optional commission expense
// Follows the same pattern as lib/wix/process.ts

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'
import { getDefaultTakeAChefCommissionPercent } from '@/lib/integrations/take-a-chef-defaults'
import { syncMarketplaceInquiryProjection } from '@/lib/marketplace/platform-records'

// ─── Input Schema ──────────────────────────────────────────────────────────

const TakeAChefImportSchema = z.object({
  rawText: z.string().min(10, 'Paste the booking notification text — at least a few lines'),
  commissionPercent: z.number().min(0).max(50).default(getDefaultTakeAChefCommissionPercent()),
  logCommission: z.boolean().default(true),
})

export type TakeAChefImportInput = z.infer<typeof TakeAChefImportSchema>

export type TakeAChefImportResult = {
  success: boolean
  inquiryId?: string
  eventId?: string
  clientId?: string
  clientCreated?: boolean
  commissionExpenseId?: string
  error?: string
  warnings?: string[]
  confidence?: string
}

// ─── Server Action ────────────────────────────────────────────────────────

export async function importTakeAChefBooking(
  input: TakeAChefImportInput
): Promise<TakeAChefImportResult> {
  const user = await requireChef()
  const validated = TakeAChefImportSchema.parse(input)
  const supabase = createServerClient()
  const tenantId = user.tenantId!

  try {
    // 1. Parse the raw text with AI
    const parseResult = await parseInquiryFromText(validated.rawText)
    const parsed = parseResult.parsed

    // 2. Find or create client
    let clientId: string | null = null
    let clientCreated = false

    const clientName = parsed.client_name || 'Take a Chef Client'
    const clientEmail = parsed.client_email

    if (clientEmail) {
      try {
        const clientResult = await createClientFromLead(tenantId, {
          email: clientEmail,
          full_name: clientName,
          phone: parsed.client_phone || null,
          dietary_restrictions: parsed.confirmed_dietary_restrictions?.length
            ? parsed.confirmed_dietary_restrictions
            : null,
          source: 'take_a_chef',
        })
        clientId = clientResult.id
        clientCreated = clientResult.created
      } catch (clientErr) {
        console.error('[importTakeAChefBooking] Client creation failed (non-fatal):', clientErr)
      }
    }

    // 3. Build source context for audit trail
    const unknownFields: Record<string, string> = {
      submission_source: 'take_a_chef_email_import',
      ai_confidence: parseResult.confidence,
    }
    if (parsed.notes) unknownFields.ai_notes = parsed.notes
    if (parsed.referral_source) unknownFields.referral_source_raw = parsed.referral_source

    // 4. Create inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'take_a_chef' as const,
        external_platform: 'take_a_chef',
        client_id: clientId,
        first_contact_at: new Date().toISOString(),
        confirmed_date: parsed.confirmed_date || null,
        confirmed_guest_count: parsed.confirmed_guest_count ?? null,
        confirmed_location: parsed.confirmed_location || null,
        confirmed_occasion: parsed.confirmed_occasion || null,
        confirmed_budget_cents: parsed.confirmed_budget_cents ?? null,
        confirmed_dietary_restrictions: parsed.confirmed_dietary_restrictions?.length
          ? parsed.confirmed_dietary_restrictions
          : null,
        confirmed_service_expectations: parsed.confirmed_service_expectations || null,
        confirmed_cannabis_preference: parsed.confirmed_cannabis_preference || null,
        source_message: validated.rawText,
        unknown_fields: {
          ...unknownFields,
          take_a_chef_finance: {
            gross_booking_cents: parsed.confirmed_budget_cents ?? null,
            commission_percent: validated.commissionPercent,
          },
        } as unknown as Database['public']['Tables']['inquiries']['Insert']['unknown_fields'],
        status: 'new',
        next_action_required: 'Review Take a Chef booking import',
        next_action_by: 'chef',
      })
      .select('id')
      .single()

    if (inquiryError || !inquiry) {
      throw new Error(`Inquiry creation failed: ${inquiryError?.message}`)
    }

    // 5. Create draft event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        client_id: clientId!,
        inquiry_id: inquiry.id,
        event_date:
          parsed.confirmed_date ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guest_count: parsed.confirmed_guest_count ?? 4,
        location_address: parsed.confirmed_location || 'TBD',
        location_city: 'TBD',
        location_zip: 'TBD',
        occasion: parsed.confirmed_occasion || 'Private Dining',
        quoted_price_cents: parsed.confirmed_budget_cents ?? null,
        special_requests: parsed.notes || null,
        serve_time: 'TBD',
      })
      .select('id')
      .single()

    if (eventError || !event) {
      // Inquiry was saved — don't fail, just log
      console.error(
        '[importTakeAChefBooking] Event creation failed (non-fatal):',
        eventError?.message
      )
      try {
        await syncMarketplaceInquiryProjection({
          supabase,
          tenantId,
          inquiryId: inquiry.id,
          platform: 'take_a_chef',
          clientId,
          summary: validated.rawText.slice(0, 4000),
          statusOnPlatform: 'booking_confirmed',
          nextActionRequired: 'Review Take a Chef booking import',
          nextActionBy: 'chef',
          payout: {
            grossBookingCents: parsed.confirmed_budget_cents ?? null,
            commissionPercent: validated.commissionPercent,
          },
          payload: {
            submission_source: 'take_a_chef_email_import',
            ai_confidence: parseResult.confidence,
          },
          actedBy: user.id,
          actionType: 'ai_import_created',
          actionLabel: 'Imported Take a Chef booking email',
        })
      } catch (canonicalError) {
        console.error('[importTakeAChefBooking] Canonical marketplace sync skipped:', canonicalError)
      }
      revalidatePath('/inquiries')
      return {
        success: true,
        inquiryId: inquiry.id,
        clientId: clientId || undefined,
        clientCreated,
        warnings: parseResult.warnings,
        confidence: parseResult.confidence,
      }
    }

    // 6. Log event state transition (null → draft)
    await supabase.from('event_state_transitions').insert({
      tenant_id: tenantId,
      event_id: event.id,
      from_status: null,
      to_status: 'draft',
      metadata: { action: 'auto_created_from_take_a_chef_import', inquiry_id: inquiry.id },
    })

    // 7. Link inquiry to event
    await supabase
      .from('inquiries')
      .update({ converted_to_event_id: event.id })
      .eq('id', inquiry.id)

    try {
      await syncMarketplaceInquiryProjection({
        supabase,
        tenantId,
        inquiryId: inquiry.id,
        platform: 'take_a_chef',
        clientId,
        eventId: event.id,
        summary: validated.rawText.slice(0, 4000),
        statusOnPlatform: 'booking_confirmed',
        nextActionRequired: 'Review Take a Chef booking import',
        nextActionBy: 'chef',
        payout: {
          grossBookingCents: parsed.confirmed_budget_cents ?? null,
          commissionPercent: validated.commissionPercent,
        },
        payload: {
          submission_source: 'take_a_chef_email_import',
          ai_confidence: parseResult.confidence,
        },
        actedBy: user.id,
        actionType: 'ai_import_created',
        actionLabel: 'Imported Take a Chef booking email',
      })
    } catch (canonicalError) {
      console.error('[importTakeAChefBooking] Canonical marketplace sync skipped:', canonicalError)
    }

    // 8. Log commission as expense (if requested and price is known)
    let commissionExpenseId: string | undefined
    if (
      validated.logCommission &&
      validated.commissionPercent > 0 &&
      parsed.confirmed_budget_cents &&
      parsed.confirmed_budget_cents > 0
    ) {
      const commissionCents = Math.floor(
        (parsed.confirmed_budget_cents * validated.commissionPercent) / 100
      )
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          tenant_id: tenantId,
          event_id: event.id,
          description: `Take a Chef platform commission (${validated.commissionPercent}%)`,
          amount_cents: commissionCents,
          category: 'professional_services' as const,
          payment_method: 'other' as const,
          expense_date:
            parsed.confirmed_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          vendor_name: 'Take a Chef',
          notes:
            'Automatically logged from Take a Chef booking import. Represents the platform commission paid.',
          is_business: true,
        })
        .select('id')
        .single()

      commissionExpenseId = expense?.id
    }

    // 9. Log chef activity (non-blocking)
    try {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId,
        actorId: user.id,
        action: 'inquiry_created',
        domain: 'inquiry',
        entityType: 'inquiry',
        entityId: inquiry.id,
        summary: `Imported Take a Chef booking: ${clientName}${parsed.confirmed_date ? ` on ${parsed.confirmed_date}` : ''}`,
        context: {
          channel: 'take_a_chef',
          client_name: clientName,
          client_email: clientEmail,
          commission_percent: validated.commissionPercent,
        },
        clientId: clientId || undefined,
      })
    } catch (actErr) {
      console.error('[importTakeAChefBooking] Activity log failed (non-fatal):', actErr)
    }

    revalidatePath('/inquiries')
    revalidatePath('/events')
    revalidatePath('/clients')
    revalidatePath('/import')

    return {
      success: true,
      inquiryId: inquiry.id,
      eventId: event.id,
      clientId: clientId || undefined,
      clientCreated,
      commissionExpenseId,
      warnings: parseResult.warnings,
      confidence: parseResult.confidence,
    }
  } catch (err) {
    const error = err as Error
    console.error('[importTakeAChefBooking] Failed:', error.message)
    return { success: false, error: error.message }
  }
}

// ─── Get chef slug for sharing ─────────────────────────────────────────────

export async function getChefDirectBookingLink(): Promise<string | null> {
  try {
    const user = await requireChef()
    const supabase = createServerClient()

    const { data } = await supabase.from('chefs').select('slug').eq('id', user.tenantId!).single()

    if (!data?.slug) return null

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    return `${appUrl}/chef/${data.slug}/inquire`
  } catch {
    return null
  }
}
