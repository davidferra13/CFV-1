'use server'

// Compound Workflows - Server Actions
// Orchestrates workflow resolution by fetching domain state and running the engine.
// Every action is tenant-scoped via requireChef().

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { resolveWorkflow, computeWorkflowUrgency } from './engine'
import type {
  WorkflowType,
  WorkflowInstance,
  WorkflowDefinition,
  StepResolverMap,
  StepResolverResult,
  DailyWorkflowSummary,
} from './types'

// ============================================
// LAZY IMPORTS (definitions loaded on demand)
// ============================================

async function loadDefinition(type: WorkflowType): Promise<{
  definition: WorkflowDefinition
  resolvers: StepResolverMap
}> {
  switch (type) {
    case 'post_event_follow_up': {
      const mod = await import('./definitions/post-event-follow-up')
      return {
        definition: mod.postEventFollowUpDefinition,
        resolvers: mod.postEventFollowUpResolvers,
      }
    }
    case 'new_booking_pipeline': {
      const mod = await import('./definitions/new-booking-pipeline')
      return {
        definition: mod.newBookingPipelineDefinition,
        resolvers: mod.newBookingPipelineResolvers,
      }
    }
    case 'event_prep_countdown': {
      const mod = await import('./definitions/event-prep-countdown')
      return {
        definition: mod.eventPrepCountdownDefinition,
        resolvers: mod.eventPrepCountdownResolvers,
      }
    }
  }
}

// ============================================
// RESOLVE A SINGLE WORKFLOW
// ============================================

async function resolveWorkflowForEntity(
  type: WorkflowType,
  entityId: string,
  db: any,
  tenantId: string
): Promise<WorkflowInstance | null> {
  const { definition, resolvers } = await loadDefinition(type)

  // Resolve all steps in parallel
  const stepIds = definition.steps.map((s) => s.id)
  const resolverResults = await Promise.all(
    stepIds.map(async (stepId): Promise<[string, StepResolverResult]> => {
      const resolver = resolvers[stepId]
      if (!resolver) return [stepId, { status: 'pending', completedAt: null }]
      try {
        return [stepId, await resolver(entityId, db, tenantId)]
      } catch (err) {
        console.error(`[Workflows] Resolver failed for ${type}/${stepId}:`, err)
        return [stepId, { status: 'pending', completedAt: null }]
      }
    })
  )
  const resolvedSteps = Object.fromEntries(resolverResults)

  // Fetch skip overrides
  const { data: overrides } = await db
    .from('workflow_step_overrides')
    .select('step_id, created_at')
    .eq('tenant_id', tenantId)
    .eq('workflow_type', type)
    .eq('entity_id', entityId)
    .eq('action', 'skip')

  const skippedStepIds = new Set<string>((overrides ?? []).map((o: any) => o.step_id))

  // Build entity context
  const entityContext = await getEntityContext(definition.entityType, entityId, db, tenantId)
  if (!entityContext) return null

  return resolveWorkflow({
    definition,
    entityId,
    resolvedSteps,
    skippedStepIds,
    entityContext,
    activeSince: entityContext.activeSince,
  })
}

// ============================================
// ENTITY CONTEXT BUILDERS
// ============================================

interface EntityContextResult {
  title: string
  subtitle: string | null
  date: string | null
  clientName: string | null
  activeSince: string | null
}

async function getEntityContext(
  entityType: 'event' | 'inquiry',
  entityId: string,
  db: any,
  tenantId: string
): Promise<EntityContextResult | null> {
  if (entityType === 'event') {
    const { data: event } = await db
      .from('events')
      .select(
        'id, occasion, event_date, status, completed_at, confirmed_at, client:clients(full_name)'
      )
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!event) return null

    return {
      title: event.occasion || 'Event',
      subtitle: (event.client as any)?.full_name ?? null,
      date: event.event_date,
      clientName: (event.client as any)?.full_name ?? null,
      activeSince: event.completed_at ?? event.confirmed_at ?? null,
    }
  }

  if (entityType === 'inquiry') {
    const { data: inquiry } = await db
      .from('inquiries')
      .select(
        'id, confirmed_occasion, confirmed_date, status, created_at, client:clients(full_name)'
      )
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!inquiry) return null

    return {
      title: inquiry.confirmed_occasion || 'New Inquiry',
      subtitle: (inquiry.client as any)?.full_name ?? null,
      date: inquiry.confirmed_date,
      clientName: (inquiry.client as any)?.full_name ?? null,
      activeSince: inquiry.created_at,
    }
  }

  return null
}

// ============================================
// PUBLIC: GET WORKFLOW FOR ENTITY
// ============================================

export async function getWorkflowForEntity(
  type: WorkflowType,
  entityId: string
): Promise<WorkflowInstance | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const tenantId = user.tenantId ?? user.entityId

  return resolveWorkflowForEntity(type, entityId, db, tenantId)
}

// ============================================
// PUBLIC: GET ALL ACTIVE WORKFLOWS
// ============================================

export async function getActiveWorkflows(): Promise<WorkflowInstance[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const tenantId = user.tenantId ?? user.entityId
  const workflows: WorkflowInstance[] = []

  // 1. Post-Event Follow-Up: completed events with unfinished follow-up tasks
  const { data: completedEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .or(
      'aar_filed.eq.false,follow_up_sent.eq.false,review_link_sent.eq.false,reset_complete.eq.false'
    )
    .order('event_date', { ascending: false })
    .limit(5)

  // 2. New Booking Pipeline: active inquiries not yet converted
  const { data: activeInquiries } = await db
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
    .is('converted_to_event_id', null)
    .order('created_at', { ascending: false })
    .limit(5)

  // 3. Event Prep Countdown: confirmed/paid events in the future
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: upcomingEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['paid', 'confirmed', 'in_progress'])
    .gte('event_date', todayStr)
    .order('event_date', { ascending: true })
    .limit(5)

  // Resolve all in parallel
  const resolvePromises: Promise<WorkflowInstance | null>[] = []

  for (const event of completedEvents ?? []) {
    resolvePromises.push(resolveWorkflowForEntity('post_event_follow_up', event.id, db, tenantId))
  }
  for (const inquiry of activeInquiries ?? []) {
    resolvePromises.push(resolveWorkflowForEntity('new_booking_pipeline', inquiry.id, db, tenantId))
  }
  for (const event of upcomingEvents ?? []) {
    resolvePromises.push(resolveWorkflowForEntity('event_prep_countdown', event.id, db, tenantId))
  }

  const results = await Promise.all(resolvePromises)
  for (const result of results) {
    if (result && result.progressPercent < 100) {
      workflows.push(result)
    }
  }

  return workflows
}

// ============================================
// PUBLIC: GET WORKFLOW SUMMARIES FOR DAILY
// ============================================

export async function getActiveWorkflowSummaries(): Promise<DailyWorkflowSummary[]> {
  const workflows = await getActiveWorkflows()
  const now = new Date()

  return workflows.map((w) => {
    const currentStep = w.steps.find((s) => s.status === 'active')
    const urgency = computeWorkflowUrgency(w, now)

    // Choose the right deep link based on workflow type
    let href: string
    switch (w.type) {
      case 'post_event_follow_up':
        href = `/events/${w.entityId}/follow-up`
        break
      case 'new_booking_pipeline':
        href = `/inquiries/${w.entityId}`
        break
      case 'event_prep_countdown':
        href = `/events/${w.entityId}/prep`
        break
      default:
        href = '/daily'
    }

    return {
      type: w.type,
      label: w.label,
      icon: w.icon,
      entityId: w.entityId,
      entityTitle: w.entityContext.title,
      currentStep: currentStep?.label ?? null,
      completedCount: w.completedCount,
      totalCount: w.totalCount,
      progressPercent: w.progressPercent,
      href,
      urgency,
    }
  })
}

// ============================================
// PUBLIC: SKIP A WORKFLOW STEP
// ============================================

export async function skipWorkflowStep(
  workflowType: WorkflowType,
  entityId: string,
  stepId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId ?? user.entityId

  // Validate the step exists and is skippable
  const { definition } = await loadDefinition(workflowType)
  const stepDef = definition.steps.find((s) => s.id === stepId)
  if (!stepDef) return { ok: false, error: 'Step not found' }
  if (!stepDef.skippable) return { ok: false, error: 'This step cannot be skipped' }

  const { error } = await db.from('workflow_step_overrides').upsert(
    {
      tenant_id: tenantId,
      workflow_type: workflowType,
      entity_id: entityId,
      step_id: stepId,
      action: 'skip',
      reason: reason ?? null,
      created_by: user.id,
    },
    { onConflict: 'tenant_id,workflow_type,entity_id,step_id' }
  )

  if (error) {
    console.error('[Workflows] skipWorkflowStep failed:', error)
    return { ok: false, error: 'Failed to skip step' }
  }

  revalidatePath('/daily')
  revalidatePath(`/events/${entityId}`)
  revalidatePath(`/inquiries/${entityId}`)
  return { ok: true }
}

// ============================================
// PUBLIC: UNSKIP A WORKFLOW STEP
// ============================================

export async function unskipWorkflowStep(
  workflowType: WorkflowType,
  entityId: string,
  stepId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId ?? user.entityId

  const { error } = await db
    .from('workflow_step_overrides')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('workflow_type', workflowType)
    .eq('entity_id', entityId)
    .eq('step_id', stepId)

  if (error) {
    console.error('[Workflows] unskipWorkflowStep failed:', error)
    return { ok: false, error: 'Failed to unskip step' }
  }

  revalidatePath('/daily')
  revalidatePath(`/events/${entityId}`)
  revalidatePath(`/inquiries/${entityId}`)
  return { ok: true }
}
