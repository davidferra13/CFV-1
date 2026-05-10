import type { WorkflowDefinition, StepResolverMap, StepResolverResult } from '../types'

// ============================================
// DEFINITION
// ============================================

export const eventPrepCountdownDefinition: WorkflowDefinition = {
  type: 'event_prep_countdown',
  label: 'Event Prep Countdown',
  description: 'Countdown milestones from booking confirmation to service day and beyond.',
  entityType: 'event',
  icon: 'Timer',
  steps: [
    {
      id: 'finalize_menu',
      label: 'Finalize menu and check prices',
      description: 'Lock in the menu and verify ingredient pricing before shopping.',
      href: (entityId) => `/events/${entityId}/menu`,
      actionLabel: 'Finalize Menu',
      dependsOn: [],
      skippable: false,
      timeEstimateMinutes: 30,
      icon: 'UtensilsCrossed',
      triggerDaysRelative: -14,
    },
    {
      id: 'shopping_list',
      label: 'Generate shopping list',
      description: 'Build the consolidated shopping list from the finalized menu.',
      href: (entityId) => `/events/${entityId}/prep`,
      actionLabel: 'Generate List',
      dependsOn: ['finalize_menu'],
      skippable: false,
      timeEstimateMinutes: 20,
      icon: 'ShoppingCart',
      triggerDaysRelative: -7,
    },
    {
      id: 'begin_prep',
      label: 'Begin prep (reverse timeline)',
      description: 'Start working through prep tasks on the reverse timeline.',
      href: (entityId) => `/events/${entityId}/prep`,
      actionLabel: 'Start Prep',
      dependsOn: ['shopping_list'],
      skippable: true,
      timeEstimateMinutes: 60,
      icon: 'ChefHat',
      triggerDaysRelative: -3,
    },
    {
      id: 'equipment_check',
      label: 'Equipment check and staff confirm',
      description: 'Verify gear is packed and any staff are confirmed for service.',
      href: (entityId) => `/events/${entityId}/checklist`,
      actionLabel: 'Run Checklist',
      dependsOn: [],
      skippable: true,
      timeEstimateMinutes: 15,
      icon: 'PackageCheck',
      triggerDaysRelative: -1,
    },
    {
      id: 'service_day',
      label: 'Service day ops',
      description: 'Execute the event. Cook, plate, serve, delight.',
      href: (entityId) => `/events/${entityId}`,
      actionLabel: 'Go Time',
      dependsOn: ['finalize_menu'],
      skippable: false,
      timeEstimateMinutes: 0,
      icon: 'Flame',
      triggerDaysRelative: 0,
    },
    {
      id: 'post_event_trigger',
      label: 'Post-event workflow triggers',
      description: 'Kick off follow-up tasks after service is complete.',
      href: (entityId) => `/events/${entityId}/follow-up`,
      actionLabel: 'Start Follow-Up',
      dependsOn: ['service_day'],
      skippable: false,
      timeEstimateMinutes: 5,
      icon: 'ListChecks',
      triggerDaysRelative: 1,
    },
  ],
}

// ============================================
// STEP RESOLVERS
// ============================================

const pending: StepResolverResult = { status: 'pending', completedAt: null }

export const eventPrepCountdownResolvers: StepResolverMap = {
  async finalize_menu(entityId, db, tenantId) {
    const { data } = await db
      .from('menus')
      .select('id, finalized_at, status')
      .eq('event_id', entityId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()

    if (!data) return pending
    if (data.status === 'finalized' || data.status === 'locked' || data.finalized_at) {
      return { status: 'completed', completedAt: data.finalized_at ?? null }
    }
    return pending
  },

  async shopping_list(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('grocery_list_ready, updated_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.grocery_list_ready) return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },

  async begin_prep(entityId, db, tenantId) {
    const { data } = await db
      .from('dop_task_completions')
      .select('id')
      .eq('event_id', entityId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!data || data.length === 0) return pending
    return { status: 'completed', completedAt: null }
  },

  async equipment_check(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('car_packed, updated_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data?.car_packed) return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },

  async service_day(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('status, updated_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return pending
    if (data.status === 'in_progress' || data.status === 'completed') {
      return { status: 'completed', completedAt: data.updated_at ?? null }
    }
    return pending
  },

  async post_event_trigger(entityId, db, tenantId) {
    const { data } = await db
      .from('events')
      .select('status, updated_at')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data || data.status !== 'completed') return pending
    return { status: 'completed', completedAt: data.updated_at ?? null }
  },
}
