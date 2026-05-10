import type { WorkflowDefinition, StepResolverMap, StepResolverResult } from '../types'

// ============================================
// DEFINITION
// ============================================

export const postEventFollowUpDefinition: WorkflowDefinition = {
  type: 'post_event_follow_up',
  label: 'Post-Event Follow-Up',
  description:
    'Complete your after-service tasks: review, thank client, request feedback, rebook, close finances.',
  entityType: 'event',
  icon: 'ListChecks',
  steps: [
    {
      id: 'aar',
      label: 'Complete your event review',
      description: 'File an after-action review while the event is fresh.',
      href: (entityId) => `/events/${entityId}/aar`,
      actionLabel: 'Write Review',
      dependsOn: [],
      skippable: false,
      timeEstimateMinutes: 5,
      icon: 'ClipboardList',
      triggerDaysRelative: null,
    },
    {
      id: 'thank_you',
      label: 'Send thank-you to client',
      description: 'Send a personalized thank-you message to the client.',
      href: (entityId) => `/events/${entityId}`,
      actionLabel: 'Send Thank-You',
      dependsOn: [],
      skippable: false,
      timeEstimateMinutes: 3,
      icon: 'Heart',
      triggerDaysRelative: null,
    },
    {
      id: 'review_request',
      label: 'Request client review',
      description: 'Ask the client for a review or testimonial.',
      href: (entityId) => `/events/${entityId}`,
      actionLabel: 'Request Review',
      dependsOn: [],
      skippable: true,
      timeEstimateMinutes: 2,
      icon: 'Star',
      triggerDaysRelative: 3,
    },
    {
      id: 'rebook',
      label: 'Suggest next booking',
      description: 'Propose a follow-up event to keep the relationship active.',
      href: (entityId) => `/events/${entityId}/edit?clone=true`,
      actionLabel: 'Suggest Rebooking',
      dependsOn: ['thank_you'],
      skippable: true,
      timeEstimateMinutes: 5,
      icon: 'CalendarPlus',
      triggerDaysRelative: null,
    },
    {
      id: 'financial_close',
      label: 'Close out finances',
      description: 'Reconcile payments, expenses, and finalize the ledger.',
      href: (entityId) => `/events/${entityId}/money`,
      actionLabel: 'Close Finances',
      dependsOn: [],
      skippable: false,
      timeEstimateMinutes: 10,
      icon: 'DollarSign',
      triggerDaysRelative: null,
    },
  ],
}

// ============================================
// STEP RESOLVERS
// ============================================

const pending: StepResolverResult = { status: 'pending', completedAt: null }

export const postEventFollowUpResolvers: StepResolverMap = {
  async aar(entityId, db, tenantId) {
    const { data } = await db
      .from('after_action_reviews')
      .select('id, created_at')
      .eq('event_id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return pending
    return { status: 'completed', completedAt: data.created_at }
  },

  async thank_you(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('follow_up_sent, follow_up_sent_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.follow_up_sent) return pending
    return { status: 'completed', completedAt: data.follow_up_sent_at ?? null }
  },

  async review_request(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('review_link_sent, review_link_sent_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.review_link_sent) return pending
    return { status: 'completed', completedAt: data.review_link_sent_at ?? null }
  },

  async rebook(entityId, db, tenantId) {
    const { data } = await db
      .from('rebook_tokens')
      .select('id, created_at')
      .eq('event_id', entityId)
      .eq('tenant_id', tenantId)
      .is('used_at', null)
      .maybeSingle()

    if (!data) return pending
    return { status: 'completed', completedAt: data.created_at }
  },

  async financial_close(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('reset_complete, updated_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.reset_complete) return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },
}
