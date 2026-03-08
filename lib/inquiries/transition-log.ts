import type { InquiryStatus } from '@/lib/inquiries/fsm'

export async function recordInquiryStateTransition(params: {
  supabase: any
  tenantId: string
  inquiryId: string
  fromStatus: InquiryStatus | null
  toStatus: InquiryStatus
  transitionedBy?: string | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const {
    supabase,
    tenantId,
    inquiryId,
    fromStatus,
    toStatus,
    transitionedBy = null,
    reason = null,
    metadata = null,
  } = params

  const { error } = await supabase.from('inquiry_state_transitions').insert({
    tenant_id: tenantId,
    inquiry_id: inquiryId,
    from_status: fromStatus,
    to_status: toStatus,
    transitioned_by: transitionedBy,
    reason,
    metadata,
  })

  if (error) {
    throw error
  }
}
