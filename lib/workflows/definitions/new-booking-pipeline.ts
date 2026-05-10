import type { WorkflowDefinition, StepResolverMap, StepResolverResult } from '../types'

// ============================================
// DEFINITION
// ============================================

export const newBookingPipelineDefinition: WorkflowDefinition = {
  type: 'new_booking_pipeline',
  label: 'New Booking Pipeline',
  description: 'Guide a new inquiry from first contact through to confirmed event.',
  entityType: 'inquiry',
  icon: 'GitBranch',
  steps: [
    {
      id: 'lead_score',
      label: 'Score this lead',
      description: 'Assign a lead score so you know how to prioritize this inquiry.',
      href: () => '/pipeline',
      actionLabel: 'Score Lead',
      dependsOn: [],
      skippable: false,
      timeEstimateMinutes: 1,
      icon: 'BarChart3',
      triggerDaysRelative: null,
    },
    {
      id: 'chef_response',
      label: 'Review and respond',
      description: 'Read the inquiry details and send your first response.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Respond',
      dependsOn: ['lead_score'],
      skippable: false,
      timeEstimateMinutes: 10,
      icon: 'MessageSquare',
      triggerDaysRelative: null,
    },
    {
      id: 'create_proposal',
      label: 'Create proposal',
      description: 'Build a quote with pricing and menu details for the client.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Create Proposal',
      dependsOn: ['chef_response'],
      skippable: true,
      timeEstimateMinutes: 15,
      icon: 'FileText',
      triggerDaysRelative: null,
    },
    {
      id: 'send_contract',
      label: 'Send contract',
      description: 'Send a service contract for the client to review and sign.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Send Contract',
      dependsOn: ['create_proposal'],
      skippable: true,
      timeEstimateMinutes: 10,
      icon: 'ScrollText',
      triggerDaysRelative: null,
    },
    {
      id: 'collect_deposit',
      label: 'Collect deposit',
      description: 'Collect the deposit payment to secure the booking.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Collect Deposit',
      dependsOn: ['create_proposal'],
      skippable: false,
      timeEstimateMinutes: 5,
      icon: 'CreditCard',
      triggerDaysRelative: null,
    },
    {
      id: 'create_event',
      label: 'Create event from inquiry',
      description: 'Convert this inquiry into a confirmed event on your calendar.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Create Event',
      dependsOn: ['chef_response'],
      skippable: false,
      timeEstimateMinutes: 5,
      icon: 'Calendar',
      triggerDaysRelative: null,
    },
    {
      id: 'welcome_email',
      label: 'Send welcome email',
      description: 'Send a welcome email to confirm the booking with the client.',
      href: (entityId) => `/inquiries/${entityId}`,
      actionLabel: 'Send Welcome',
      dependsOn: ['create_event', 'collect_deposit'],
      skippable: true,
      timeEstimateMinutes: 3,
      icon: 'Mail',
      triggerDaysRelative: null,
    },
  ],
}

// ============================================
// STEP RESOLVERS
// ============================================

const pending: StepResolverResult = { status: 'pending', completedAt: null }

/** Helper: fetch the inquiry row with commonly needed fields */
async function getInquiry(entityId: string, db: any, tenantId: string) {
  const { data } = await db
    .from('inquiries')
    .select('id, status, lead_score, last_response_at, converted_to_event_id, updated_at')
    .eq('id', entityId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data
}

export const newBookingPipelineResolvers: StepResolverMap = {
  async lead_score(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry || inquiry.lead_score == null) return pending
    return {
      status: 'completed',
      completedAt: inquiry.updated_at ?? null,
      meta: { score: inquiry.lead_score },
    }
  },

  async chef_response(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry || inquiry.status === 'new') return pending
    return {
      status: 'completed',
      completedAt: inquiry.last_response_at ?? null,
    }
  },

  async create_proposal(entityId, db, tenantId) {
    const { data } = await db
      .from('quotes')
      .select('id, created_at')
      .eq('inquiry_id', entityId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()

    if (!data) return pending
    return { status: 'completed', completedAt: data.created_at }
  },

  async send_contract(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry?.converted_to_event_id) return pending

    const { data } = await db
      .from('event_contracts')
      .select('id, sent_at, status')
      .eq('event_id', inquiry.converted_to_event_id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return pending
    const sentStatuses = ['sent', 'viewed', 'signed']
    if (!sentStatuses.includes(data.status)) return pending
    return { status: 'completed', completedAt: data.sent_at ?? null }
  },

  async collect_deposit(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry?.converted_to_event_id) return pending

    const { data } = await db
      .from('events')
      .select('status, updated_at')
      .eq('id', inquiry.converted_to_event_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return pending
    const paidStatuses = ['paid', 'confirmed', 'in_progress', 'completed']
    if (!paidStatuses.includes(data.status)) return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },

  async create_event(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry?.converted_to_event_id) return pending

    const { data } = await db
      .from('events')
      .select('id, created_at')
      .eq('id', inquiry.converted_to_event_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return pending
    return { status: 'completed', completedAt: data.created_at }
  },

  async welcome_email(entityId, db, tenantId) {
    const inquiry = await getInquiry(entityId, db, tenantId)
    if (!inquiry?.converted_to_event_id) return pending

    const { data } = await db
      .from('events')
      .select('status, updated_at')
      .eq('id', inquiry.converted_to_event_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return pending
    const confirmedStatuses = ['confirmed', 'in_progress', 'completed']
    if (!confirmedStatuses.includes(data.status)) return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },
}
