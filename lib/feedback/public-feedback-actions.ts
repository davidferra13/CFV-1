// Public Feedback Submission - No auth required
// Uses token-based lookup for public access

'use server'

import { createServerClient } from '@/lib/supabase/server'

/**
 * Look up a feedback request by its public token
 * Returns request details for the feedback form (no auth required)
 */
export async function getFeedbackRequestByToken(token: string): Promise<{
  found: boolean
  request?: {
    id: string
    entityType: string
    clientName: string
    status: string
    chefName: string
  }
}> {
  if (!token || token.length < 10) {
    return { found: false }
  }

  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('feedback_requests')
    .select('id, entity_type, client_name, status, tenant_id')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { found: false }
  }

  if (data.status === 'completed') {
    return { found: true, request: { ...mapRequest(data), chefName: '' } }
  }

  // Get chef name for display
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', data.tenant_id)
    .single()

  const chefName = chef?.business_name || chef?.full_name || 'Your Chef'

  return {
    found: true,
    request: {
      id: data.id,
      entityType: data.entity_type,
      clientName: data.client_name,
      status: data.status,
      chefName,
    },
  }
}

/**
 * Submit feedback (public, no auth)
 * Uses admin client to bypass RLS for the insert
 */
export async function submitPublicFeedback(input: {
  token: string
  rating: number
  comment?: string
  tags?: string[]
  wouldRecommend?: boolean
}): Promise<{ success: boolean; error?: string }> {
  if (!input.token || input.token.length < 10) {
    return { success: false, error: 'Invalid feedback link' }
  }

  if (!input.rating || input.rating < 1 || input.rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  const supabase: any = createServerClient({ admin: true })

  // Look up the request
  const { data: request, error: lookupError } = await supabase
    .from('feedback_requests')
    .select('id, tenant_id, status')
    .eq('token', input.token)
    .single()

  if (lookupError || !request) {
    return { success: false, error: 'Feedback link not found or expired' }
  }

  if (request.status === 'completed') {
    return { success: false, error: 'Feedback has already been submitted for this request' }
  }

  // Insert the response
  const { error: insertError } = await supabase.from('feedback_responses').insert({
    tenant_id: request.tenant_id,
    request_id: request.id,
    rating: input.rating,
    comment: input.comment?.trim() || null,
    tags: input.tags && input.tags.length > 0 ? input.tags : null,
    would_recommend: input.wouldRecommend ?? null,
  })

  if (insertError) {
    console.error('[submitPublicFeedback] Insert error:', insertError)
    return { success: false, error: 'Failed to save feedback. Please try again.' }
  }

  // Mark request as completed
  const { error: updateError } = await supabase
    .from('feedback_requests')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', request.id)

  if (updateError) {
    console.error('[submitPublicFeedback] Update error:', updateError)
    // Non-blocking: feedback was saved even if status update fails
  }

  return { success: true }
}

function mapRequest(data: any) {
  return {
    id: data.id,
    entityType: data.entity_type,
    clientName: data.client_name,
    status: data.status,
  }
}
