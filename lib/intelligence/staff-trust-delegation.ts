import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  deriveMostRestrictiveDelegationAccessState,
  type DelegationAccessState,
} from './staff-trust-delegation-contract'

type StaffRow = {
  id: string
  name: string | null
  role: string | null
  status: string | null
}

type EventSummaryRow = {
  id: string
  occasion: string | null
  event_date: string | null
  status: string | null
  guest_count: number | null
  serve_time?: string | null
}

type AssignmentRow = {
  id: string
  event_id: string
  staff_member_id: string
  role_override: string | null
  status: string | null
  scheduled_hours: number | null
  actual_hours: number | null
  pay_amount_cents?: number | null
  rating: number | null
  notes?: string | null
  events?: EventSummaryRow | EventSummaryRow[] | null
}

type OnboardingRow = {
  id: string
  staff_member_id: string
  item_key: string | null
  status: string | null
  completed_at: string | null
}

type PerformanceRow = {
  staff_member_id: string
  on_time_rate: number | null
  cancellation_count: number | null
  avg_rating: number | null
  total_events: number | null
}

type TaskRow = {
  id: string
  event_id: string | null
  assigned_to: string | null
  assignee_id?: string | null
  status: string | null
  title: string | null
  priority: string | null
}

export type StaffTrustDelegationSourceRows = {
  tenantId: string
  generatedAt: string
  staffMembers: StaffRow[]
  assignments: AssignmentRow[]
  onboardingItems: OnboardingRow[]
  performanceScores: PerformanceRow[]
  tasks: TaskRow[]
  events: EventSummaryRow[]
}

export type StaffTrustCollaboratorReadModel = {
  id: string
  name: string
  roleLabel: string
  status: string
  accessState: DelegationAccessState
  assignmentCount: number
  upcomingAssignmentCount: number
  activeTaskCount: number
  trainingComplete: number
  trainingTotal: number
  trainingCompletionPercent: number
  reliabilityLabel: string
  trustSignals: string[]
  riskPrompts: string[]
  nextAction: string
}

export type StaffTrustEventPlannerReadModel = {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number
  assignedCount: number
  recommendedMinimumStaff: number
  staffingGap: number
  assignmentRiskCount: number
  needsTrainingCount: number
  unknownTrustCount: number
  nextAction: string
  nextActionHref: string
}

export type StaffTrustDelegationReadModel = {
  tenantId: string
  generatedAt: string
  summary: {
    totalCollaborators: number
    trustedCount: number
    needsTrainingCount: number
    atRiskCount: number
    blockedCount: number
    unknownCount: number
    upcomingEventsWithGaps: number
  }
  collaborators: StaffTrustCollaboratorReadModel[]
  eventPlanner: StaffTrustEventPlannerReadModel[]
  privacyBoundary: {
    chefOnlyFacts: string[]
    safeBriefingFacts: string[]
  }
}

export type StaffTrustDecision = {
  eventId: string
  level: 'clear' | 'info' | 'warning'
  headline: string
  detail: string
  nextAction: string
  nextActionHref: string
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Unassigned Role'
  return ROLE_LABELS[role] ?? role.replaceAll('_', ' ')
}

function recommendedMinimumStaff(guestCount: number): number {
  if (guestCount >= 24) return 3
  if (guestCount >= 12) return 2
  if (guestCount > 0) return 1
  return 0
}

function assignmentIsUpcoming(assignment: AssignmentRow, generatedAt: string): boolean {
  const event = firstRelated(assignment.events)
  if (!event?.event_date) return false
  const today = generatedAt.slice(0, 10)
  return event.event_date >= today && !['cancelled', 'completed'].includes(event.status ?? '')
}

function deriveCollaboratorState(input: {
  staff: StaffRow
  assignments: AssignmentRow[]
  onboardingItems: OnboardingRow[]
  performance: PerformanceRow | undefined
}): DelegationAccessState {
  const states: DelegationAccessState[] = []

  if (input.staff.status && input.staff.status !== 'active') {
    states.push('blocked')
  }

  if (input.onboardingItems.some((item) => item.status !== 'complete')) {
    states.push('needs_training')
  }

  const performance = input.performance
  const totalEvents = Number(performance?.total_events ?? 0)
  const onTimeRate = Number(performance?.on_time_rate ?? 0)
  const avgRating = Number(performance?.avg_rating ?? 0)
  const cancellations = Number(performance?.cancellation_count ?? 0)

  if (totalEvents === 0 && input.assignments.length === 0) {
    states.push('unknown')
  }

  if (
    cancellations > 0 ||
    (totalEvents > 0 && onTimeRate < 80) ||
    (avgRating > 0 && avgRating < 3.5)
  ) {
    states.push('at_risk')
  }

  if (states.length === 0) states.push('trusted')
  return deriveMostRestrictiveDelegationAccessState(states)
}

function buildTrustSignals(performance: PerformanceRow | undefined): string[] {
  if (!performance || Number(performance.total_events ?? 0) === 0) {
    return ['No performance history yet']
  }

  const signals = [`${Number(performance.total_events ?? 0)} event history`]
  if (performance.on_time_rate !== null)
    signals.push(`${Math.round(performance.on_time_rate)}% on-time`)
  if (performance.avg_rating && performance.avg_rating > 0) {
    signals.push(`${Number(performance.avg_rating).toFixed(1)} average rating`)
  }
  if (performance.cancellation_count && performance.cancellation_count > 0) {
    signals.push(
      `${performance.cancellation_count} cancellation${performance.cancellation_count === 1 ? '' : 's'}`
    )
  }
  return signals
}

function buildRiskPrompts(input: {
  state: DelegationAccessState
  trainingTotal: number
  trainingComplete: number
  performance: PerformanceRow | undefined
  activeTaskCount: number
}): string[] {
  const prompts: string[] = []
  if (input.state === 'blocked') prompts.push('Review status before assigning sensitive work')
  if (input.trainingComplete < input.trainingTotal)
    prompts.push('Finish training checklist before broad delegation')
  if (input.performance && Number(input.performance.cancellation_count ?? 0) > 0) {
    prompts.push('Review reliability before client-facing assignment')
  }
  if (input.activeTaskCount === 0) prompts.push('Add assignment-scoped tasks before briefing staff')
  if (input.state === 'unknown') prompts.push('Capture first trust memory after the next event')
  return prompts
}

export function buildStaffTrustDelegationReadModel(
  source: StaffTrustDelegationSourceRows
): StaffTrustDelegationReadModel {
  const assignmentsByStaff = new Map<string, AssignmentRow[]>()
  const onboardingByStaff = new Map<string, OnboardingRow[]>()
  const performanceByStaff = new Map<string, PerformanceRow>()
  const tasksByStaff = new Map<string, TaskRow[]>()

  for (const assignment of asArray(source.assignments)) {
    const existing = assignmentsByStaff.get(assignment.staff_member_id) ?? []
    existing.push(assignment)
    assignmentsByStaff.set(assignment.staff_member_id, existing)
  }

  for (const item of asArray(source.onboardingItems)) {
    const existing = onboardingByStaff.get(item.staff_member_id) ?? []
    existing.push(item)
    onboardingByStaff.set(item.staff_member_id, existing)
  }

  for (const score of asArray(source.performanceScores)) {
    performanceByStaff.set(score.staff_member_id, score)
  }

  for (const task of asArray(source.tasks)) {
    const staffId = task.assigned_to ?? task.assignee_id
    if (!staffId) continue
    const existing = tasksByStaff.get(staffId) ?? []
    existing.push(task)
    tasksByStaff.set(staffId, existing)
  }

  const collaborators = asArray(source.staffMembers).map((staff) => {
    const assignments = assignmentsByStaff.get(staff.id) ?? []
    const onboardingItems = onboardingByStaff.get(staff.id) ?? []
    const performance = performanceByStaff.get(staff.id)
    const tasks = tasksByStaff.get(staff.id) ?? []
    const activeTasks = tasks.filter(
      (task) => !['done', 'completed', 'cancelled'].includes(task.status ?? '')
    )
    const trainingTotal = onboardingItems.length
    const trainingComplete = onboardingItems.filter((item) => item.status === 'complete').length
    const state = deriveCollaboratorState({ staff, assignments, onboardingItems, performance })
    const upcomingAssignmentCount = assignments.filter((assignment) =>
      assignmentIsUpcoming(assignment, source.generatedAt)
    ).length

    const riskPrompts = buildRiskPrompts({
      state,
      trainingTotal,
      trainingComplete,
      performance,
      activeTaskCount: activeTasks.length,
    })

    return {
      id: staff.id,
      name: staff.name ?? 'Unnamed collaborator',
      roleLabel: roleLabel(staff.role),
      status: staff.status ?? 'unknown',
      accessState: state,
      assignmentCount: assignments.length,
      upcomingAssignmentCount,
      activeTaskCount: activeTasks.length,
      trainingComplete,
      trainingTotal,
      trainingCompletionPercent:
        trainingTotal > 0 ? Math.round((trainingComplete / trainingTotal) * 100) : 0,
      reliabilityLabel:
        performance && Number(performance.total_events ?? 0) > 0
          ? `${Number(performance.total_events ?? 0)} events`
          : 'No history',
      trustSignals: buildTrustSignals(performance),
      riskPrompts,
      nextAction:
        riskPrompts[0] ??
        (upcomingAssignmentCount > 0
          ? 'Ready for assignment-scoped briefing'
          : 'Assign to an event when needed'),
    } satisfies StaffTrustCollaboratorReadModel
  })

  const stateCounts = collaborators.reduce(
    (counts, collaborator) => {
      counts[collaborator.accessState] += 1
      return counts
    },
    {
      trusted: 0,
      needs_training: 0,
      at_risk: 0,
      blocked: 0,
      unknown: 0,
    } satisfies Record<DelegationAccessState, number>
  )

  const collaboratorById = new Map(
    collaborators.map((collaborator) => [collaborator.id, collaborator])
  )

  const eventPlanner = asArray(source.events).map((event) => {
    const eventAssignments = source.assignments.filter(
      (assignment) => assignment.event_id === event.id
    )
    const assignedCollaborators = eventAssignments
      .map((assignment) => collaboratorById.get(assignment.staff_member_id))
      .filter(Boolean) as StaffTrustCollaboratorReadModel[]
    const recommended = recommendedMinimumStaff(Number(event.guest_count ?? 0))
    const staffingGap = Math.max(0, recommended - eventAssignments.length)
    const assignmentRiskCount = assignedCollaborators.filter((collaborator) =>
      ['at_risk', 'blocked'].includes(collaborator.accessState)
    ).length
    const needsTrainingCount = assignedCollaborators.filter(
      (collaborator) => collaborator.accessState === 'needs_training'
    ).length
    const unknownTrustCount = assignedCollaborators.filter(
      (collaborator) => collaborator.accessState === 'unknown'
    ).length

    return {
      eventId: event.id,
      eventName: event.occasion ?? 'Untitled event',
      eventDate: event.event_date,
      guestCount: Number(event.guest_count ?? 0),
      assignedCount: eventAssignments.length,
      recommendedMinimumStaff: recommended,
      staffingGap,
      assignmentRiskCount,
      needsTrainingCount,
      unknownTrustCount,
      nextAction:
        staffingGap > 0
          ? `Add ${staffingGap} staff assignment${staffingGap === 1 ? '' : 's'}`
          : assignmentRiskCount > 0
            ? 'Review trust risk before briefing'
            : needsTrainingCount > 0
              ? 'Complete training checklist before service'
              : 'Generate assignment-scoped staff briefing',
      nextActionHref: `/events/${event.id}/staff`,
    } satisfies StaffTrustEventPlannerReadModel
  })

  return {
    tenantId: source.tenantId,
    generatedAt: source.generatedAt,
    summary: {
      totalCollaborators: collaborators.length,
      trustedCount: stateCounts.trusted,
      needsTrainingCount: stateCounts.needs_training,
      atRiskCount: stateCounts.at_risk,
      blockedCount: stateCounts.blocked,
      unknownCount: stateCounts.unknown,
      upcomingEventsWithGaps: eventPlanner.filter((event) => event.staffingGap > 0).length,
    },
    collaborators: collaborators.sort((a, b) => {
      const rank: Record<DelegationAccessState, number> = {
        blocked: 0,
        at_risk: 1,
        needs_training: 2,
        unknown: 3,
        trusted: 4,
      }
      return rank[a.accessState] - rank[b.accessState] || a.name.localeCompare(b.name)
    }),
    eventPlanner,
    privacyBoundary: {
      chefOnlyFacts: [
        'pay',
        'private notes',
        'emergency contacts',
        'trust memories',
        'client household memory',
        'performance feedback',
      ],
      safeBriefingFacts: [
        'event timing',
        'role',
        'task scope',
        'arrival logistics',
        'dietary need-to-know',
      ],
    },
  }
}

export function buildStaffTrustDecisionForEvent(
  model: StaffTrustDelegationReadModel,
  eventId: string
): StaffTrustDecision | null {
  const event = model.eventPlanner.find((candidate) => candidate.eventId === eventId)
  if (!event) return null

  if (event.staffingGap > 0) {
    return {
      eventId,
      level: 'warning',
      headline: 'Staffing gap before delegation',
      detail: `${event.eventName} has ${event.assignedCount} assigned against a recommended minimum of ${event.recommendedMinimumStaff}.`,
      nextAction: event.nextAction,
      nextActionHref: event.nextActionHref,
    }
  }

  if (event.assignmentRiskCount > 0) {
    return {
      eventId,
      level: 'warning',
      headline: 'Trust risk needs chef review',
      detail: `${event.assignmentRiskCount} assigned collaborator${event.assignmentRiskCount === 1 ? '' : 's'} need review before staff briefing.`,
      nextAction: event.nextAction,
      nextActionHref: event.nextActionHref,
    }
  }

  if (event.needsTrainingCount > 0 || event.unknownTrustCount > 0) {
    return {
      eventId,
      level: 'info',
      headline: 'Delegation inputs need confirmation',
      detail: 'Training or trust history is incomplete. Confirm scope before sharing the briefing.',
      nextAction: event.nextAction,
      nextActionHref: event.nextActionHref,
    }
  }

  return {
    eventId,
    level: 'clear',
    headline: 'Staff delegation ready',
    detail: 'Assigned staff can receive an assignment-scoped briefing without private notes.',
    nextAction: event.nextAction,
    nextActionHref: event.nextActionHref,
  }
}

export async function getStaffTrustDelegationReadModel(): Promise<StaffTrustDelegationReadModel> {
  const user = await requireChef()
  const tenantId = user.entityId ?? user.tenantId!
  const db: any = createServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    staffResult,
    assignmentsResult,
    onboardingResult,
    performanceResult,
    tasksResult,
    eventsResult,
  ] = await Promise.all([
    db.from('staff_members').select('id, name, role, status').eq('chef_id', tenantId).order('name'),
    db
      .from('event_staff_assignments')
      .select(
        `
        id, event_id, staff_member_id, role_override, status, scheduled_hours,
        actual_hours, rating,
        events!event_staff_assignments_event_id_fkey(id, occasion, event_date, status, guest_count)
      `
      )
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('staff_onboarding_items')
      .select('id, staff_member_id, item_key, status, completed_at')
      .eq('tenant_id', tenantId)
      .limit(500),
    db
      .from('staff_performance_scores')
      .select('staff_member_id, on_time_rate, cancellation_count, avg_rating, total_events')
      .eq('chef_id', tenantId)
      .limit(500),
    db
      .from('tasks')
      .select('id, event_id, assigned_to, status, title, priority')
      .eq('chef_id', tenantId)
      .limit(500),
    db
      .from('events')
      .select('id, occasion, event_date, status, guest_count, serve_time')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true })
      .limit(12),
  ])

  for (const result of [
    staffResult,
    assignmentsResult,
    onboardingResult,
    performanceResult,
    tasksResult,
    eventsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to load staff trust delegation data')
    }
  }

  return buildStaffTrustDelegationReadModel({
    tenantId,
    generatedAt: new Date().toISOString(),
    staffMembers: staffResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    onboardingItems: onboardingResult.data ?? [],
    performanceScores: performanceResult.data ?? [],
    tasks: tasksResult.data ?? [],
    events: eventsResult.data ?? [],
  })
}
