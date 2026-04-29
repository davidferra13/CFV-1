// API v2: Convert Inquiry to Event
// POST /api/v2/inquiries/:id/convert
//
// NOTE: This is a simplified conversion pipeline. The full server action
// (convertInquiryToEvent in lib/inquiries/actions.ts) also scaffolds menus,
// courses, dishes, Dinner Circle links, automations, and lifecycle detection.
// V2 API consumers get a clean draft event; additional scaffolding happens
// when the chef opens the event in the app UI.

import { withApiAuth, apiCreated, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

const VALID_CONVERT_FROM = ['confirmed'] as const

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inquiry')

    // Fetch the inquiry
    const { data: inquiry } = await ctx.db
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!inquiry) return apiNotFound('Inquiry')

    const inq = inquiry as Record<string, unknown>

    if (inq.converted_to_event_id) {
      const { data: existingEvent, error: existingEventError } = await ctx.db
        .from('events')
        .select('*')
        .eq('id', inq.converted_to_event_id as string)
        .eq('tenant_id', ctx.tenantId)
        .is('deleted_at', null)
        .single()

      if (existingEventError || !existingEvent) {
        console.error(
          '[api/v2/inquiries/convert] Converted event lookup failed:',
          existingEventError
        )
        return apiError('converted_event_missing', 'Converted event could not be loaded', 409)
      }

      return apiSuccess(existingEvent, { count: 1 })
    }

    // Validate: only confirmed inquiries can convert
    if (!VALID_CONVERT_FROM.includes(inq.status as (typeof VALID_CONVERT_FROM)[number])) {
      return apiError(
        'invalid_status',
        `Only confirmed inquiries can be converted. Current status: "${inq.status}"`,
        422
      )
    }

    // Validate: must have a client linked
    if (!inq.client_id) {
      return apiError(
        'missing_client',
        'Inquiry must be linked to a client before converting to an event',
        422
      )
    }

    // Create a draft event from inquiry data
    const { data: event, error } = await ctx.db
      .from('events')
      .insert({
        tenant_id: ctx.tenantId,
        client_id: inq.client_id,
        inquiry_id: inq.id,
        event_date:
          inq.confirmed_date ||
          inq.preferred_date ||
          inq.event_date ||
          new Date().toISOString().slice(0, 10),
        serve_time: inq.preferred_time || inq.serve_time || '18:00',
        guest_count:
          inq.confirmed_guest_count || inq.guest_count || inq.estimated_guest_count || 10,
        occasion: inq.confirmed_occasion || inq.occasion || 'Dinner',
        location_address: inq.confirmed_location || inq.location_address || '',
        location_city: inq.location_city || '',
        location_state: inq.location_state || '',
        location_zip: inq.location_zip || '',
        dietary_restrictions: inq.confirmed_dietary_restrictions || inq.dietary_restrictions || [],
        allergies: inq.allergies || [],
        special_requests: inq.confirmed_service_expectations || inq.special_requests || '',
        status: 'draft',
        created_by: ctx.keyId,
        updated_by: ctx.keyId,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inquiries/convert] Error:', error)
      return apiError('convert_failed', 'Failed to convert inquiry to event', 500)
    }

    // Log event state transition (non-blocking)
    try {
      await ctx.db.from('event_state_transitions').insert({
        tenant_id: ctx.tenantId,
        event_id: (event as any).id,
        from_status: null,
        to_status: 'draft',
        actor_type: 'system',
        reason: 'Created from inquiry via API v2',
      })
    } catch {
      /* non-blocking */
    }

    // Seed ambiance from client taste profile (non-blocking)
    try {
      const { data: tp } = await ctx.db
        .from('client_taste_profiles')
        .select('ambiance_preferences')
        .eq('client_id', inq.client_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()
      const ambiance = (tp as any)?.ambiance_preferences
      if (ambiance) {
        await ctx.db
          .from('events')
          .update({ ambiance_notes: ambiance })
          .eq('id', (event as any).id)
          .eq('tenant_id', ctx.tenantId)
      }
    } catch {
      /* non-blocking */
    }

    // Mark inquiry as converted: keep status 'confirmed', set converted_event_id
    await ctx.db
      .from('inquiries')
      .update({
        converted_to_event_id: (event as any).id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    // Log inquiry state transition (non-blocking)
    try {
      await ctx.db.from('inquiry_state_transitions').insert({
        tenant_id: ctx.tenantId,
        inquiry_id: id,
        from_status: 'confirmed',
        to_status: 'confirmed',
        reason: 'Converted to event via API v2',
      })
    } catch {
      /* non-blocking */
    }

    return apiCreated(event)
  },
  { scopes: ['events:write', 'inquiries:write'] as any }
)
