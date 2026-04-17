// API v2: Convert Inquiry to Event
// POST /api/v2/inquiries/:id/convert

import { withApiAuth, apiCreated, apiNotFound, apiError } from '@/lib/api/v2'

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

    // Create a draft event from inquiry data
    const { data: event, error } = await ctx.db
      .from('events')
      .insert({
        tenant_id: ctx.tenantId,
        client_id: inq.client_id,
        event_date:
          inq.preferred_date ||
          inq.event_date ||
          ((_cvd) =>
            `${_cvd.getFullYear()}-${String(_cvd.getMonth() + 1).padStart(2, '0')}-${String(_cvd.getDate()).padStart(2, '0')}`)(
            new Date()
          ),
        serve_time: inq.preferred_time || inq.serve_time || '18:00',
        guest_count: inq.guest_count || inq.estimated_guest_count || 10,
        occasion: inq.confirmed_occasion || inq.occasion || 'Dinner',
        location_address: inq.location_address || '',
        location_city: inq.location_city || '',
        location_state: inq.location_state || '',
        location_zip: inq.location_zip || '',
        dietary_restrictions: inq.dietary_restrictions || [],
        allergies: inq.allergies || [],
        special_requests: inq.special_requests || '',
        status: 'draft',
        inquiry_id: inq.id,
      } as any)
      .select()
      .single()

    // Seed ambiance from client taste profile (non-blocking)
    if (event && inq.client_id) {
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
    }

    if (error) {
      console.error('[api/v2/inquiries/convert] Error:', error)
      return apiError('convert_failed', 'Failed to convert inquiry to event', 500)
    }

    // Mark inquiry as converted
    await ctx.db
      .from('inquiries')
      .update({
        status: 'converted',
        converted_event_id: (event as any).id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    return apiCreated(event)
  },
  { scopes: ['events:write', 'inquiries:write'] as any }
)
