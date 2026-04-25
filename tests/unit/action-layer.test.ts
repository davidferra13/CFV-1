import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasSchedulingRulesConfigured,
  resolveCollectBalanceTask,
  resolveCommitNextTask,
  resolveCloseOutNextTask,
  resolveDashboardNextTask,
  resolveExecutionNextTask,
  resolveFixMissingFactTask,
  resolveMenuDecisionTask,
  resolvePrepFlowTask,
  resolvePrepareNextTask,
  resolveProcurementNextTask,
  resolveReceiptCaptureTask,
  resolveRelationshipNextTask,
  resolveResetNextTask,
  resolveSafetyCheckTask,
  resolveServiceReadyTask,
  resolveSettingsFixTasks,
  resolveTeamReadyTask,
  resolveTravelConfirmTask,
  resolveTrustLoopNextTask,
} from '@/lib/interface/action-layer'
import { buildFirstWeekActivationProgress } from '@/lib/onboarding/first-week-activation'
import type { PriorityQueue } from '@/lib/queue/types'
import type { DashboardWorkSurface } from '@/lib/workflow/types'

const emptyQueue: PriorityQueue = {
  items: [],
  nextAction: null,
  summary: {
    totalItems: 0,
    byDomain: {
      inquiry: 0,
      message: 0,
      quote: 0,
      event: 0,
      financial: 0,
      post_event: 0,
      client: 0,
      culinary: 0,
      network: 0,
    },
    byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
    allCaughtUp: true,
  },
  computedAt: '2026-04-21T12:00:00.000Z',
}

const emptyWorkSurface: DashboardWorkSurface = {
  blocked: [],
  preparable: [],
  optionalEarly: [],
  fragile: [],
  byEvent: [],
  summary: {
    totalActiveEvents: 0,
    totalPreparableActions: 0,
    totalBlockedActions: 0,
    totalFragileActions: 0,
  },
}

function dateFromToday(offsetDays: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

describe('action layer', () => {
  it('resolves dashboard next task from the live queue before setup debt', () => {
    const queue: PriorityQueue = {
      ...emptyQueue,
      items: [
        {
          id: 'inquiry:123',
          domain: 'inquiry',
          urgency: 'critical',
          score: 950,
          title: 'Reply to anniversary dinner inquiry',
          description: 'The client is waiting on your response before they pick another chef.',
          href: '/inquiries/123',
          icon: 'Mail',
          context: { primaryLabel: 'Maya Chen', secondaryLabel: 'Anniversary dinner' },
          createdAt: '2026-04-20T12:00:00.000Z',
          dueAt: null,
          entityId: '123',
          entityType: 'inquiry',
          estimatedMinutes: 8,
        },
      ],
      nextAction: {
        id: 'inquiry:123',
        domain: 'inquiry',
        urgency: 'critical',
        score: 950,
        title: 'Reply to anniversary dinner inquiry',
        description: 'The client is waiting on your response before they pick another chef.',
        href: '/inquiries/123',
        icon: 'Mail',
        context: { primaryLabel: 'Maya Chen', secondaryLabel: 'Anniversary dinner' },
        createdAt: '2026-04-20T12:00:00.000Z',
        dueAt: null,
        entityId: '123',
        entityType: 'inquiry',
        estimatedMinutes: 8,
      },
      summary: {
        ...emptyQueue.summary,
        totalItems: 1,
        byDomain: { ...emptyQueue.summary.byDomain, inquiry: 1 },
        byUrgency: { ...emptyQueue.summary.byUrgency, critical: 1 },
        allCaughtUp: false,
      },
    }

    const task = resolveDashboardNextTask({
      priorityQueue: queue,
      onboardingProgress: buildFirstWeekActivationProgress({
        profileBasicsReady: false,
        serviceSetupReady: false,
        inquiriesCount: 0,
        clientsCount: 0,
        sentQuotesCount: 0,
        eventsCount: 0,
        prepEvidenceCount: 0,
        invoiceArtifactCount: 0,
        recipesCount: 0,
        loyaltyConfigured: false,
        staffCount: 0,
      }),
      profileGated: true,
    })

    assert.equal(task.source, 'queue')
    assert.equal(task.href, '/inquiries/123')
    assert.equal(task.ctaLabel, 'Resolve Next')
    assert.match(task.context.join(' '), /Maya Chen/)
  })

  it('falls back to onboarding when the live queue is clear', () => {
    const task = resolveDashboardNextTask({
      priorityQueue: emptyQueue,
      onboardingProgress: buildFirstWeekActivationProgress({
        profileBasicsReady: true,
        serviceSetupReady: true,
        inquiriesCount: 1,
        clientsCount: 1,
        sentQuotesCount: 0,
        eventsCount: 0,
        prepEvidenceCount: 0,
        invoiceArtifactCount: 0,
        recipesCount: 3,
        loyaltyConfigured: false,
        staffCount: 2,
      }),
      profileGated: false,
    })

    assert.equal(task.source, 'onboarding')
    assert.equal(task.href, '/quotes/new')
    assert.equal(task.ctaLabel, 'Resolve Next')
  })

  it('detects when scheduling rules are still effectively empty', () => {
    assert.equal(hasSchedulingRulesConfigured(null), false)
    assert.equal(
      hasSchedulingRulesConfigured({
        id: 'rules-1',
        tenant_id: 'tenant-1',
        blocked_days_of_week: [],
        max_events_per_week: null,
        max_events_per_month: null,
        min_buffer_days: 0,
        min_lead_days: 0,
        preferred_days_of_week: [],
        created_at: '2026-04-21T12:00:00.000Z',
        updated_at: '2026-04-21T12:00:00.000Z',
      }),
      false
    )
  })

  it('builds concrete settings fix tasks from missing state', () => {
    const tasks = resolveSettingsFixTasks({
      profile: {
        slug: null,
        tagline: null,
        bio: null,
        profileImageUrl: null,
        publicProfileHidden: false,
      },
      googleConnection: {
        gmail: { connected: false, email: null, lastSync: null, errorCount: 0 },
        calendar: {
          connected: false,
          email: null,
          lastSync: null,
          checkedAt: null,
          health: 'unknown',
          healthDetail: null,
          busyRangeCount: 0,
          conflictCount: 0,
          calendarCount: 0,
        },
      },
      schedulingRules: null,
      bookingSettings: {
        booking_enabled: true,
        booking_slug: null,
        booking_headline: null,
        booking_bio_short: null,
        booking_min_notice_days: 7,
        booking_model: 'inquiry_first',
        booking_base_price_cents: null,
        booking_pricing_type: 'flat_rate',
        booking_deposit_type: 'percent',
        booking_deposit_percent: null,
        booking_deposit_fixed_cents: null,
      },
      googleReviewUrl: null,
      wixConnection: null,
    })

    assert.equal(tasks[0]?.id, 'profile-url')
    assert.equal(tasks[0]?.href, '/settings/my-profile')
    assert.ok(tasks.some((task) => task.id === 'gmail-connect'))
    assert.ok(tasks.some((task) => task.id === 'availability-rules'))
    assert.ok(tasks.some((task) => task.id === 'booking-page'))
    assert.ok(tasks.every((task) => task.ctaLabel === 'Fix This Setting'))
  })

  it('keeps prepare next focused on non-procurement planning work', () => {
    const workSurface: DashboardWorkSurface = {
      ...emptyWorkSurface,
      fragile: [
        {
          id: 'event-1:packing:pack_and_load',
          eventId: 'event-1',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2026-04-24',
          clientName: 'Maya Chen',
          stage: 'packing',
          stageNumber: 9,
          stageLabel: 'Packing',
          category: 'preparable',
          urgency: 'fragile',
          title: 'Pack and load',
          description: 'Event is imminent. Pack everything and verify against packing list.',
        },
      ],
      preparable: [
        {
          id: 'event-1:packing:pack_and_load',
          eventId: 'event-1',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2026-04-24',
          clientName: 'Maya Chen',
          stage: 'packing',
          stageNumber: 9,
          stageLabel: 'Packing',
          category: 'preparable',
          urgency: 'fragile',
          title: 'Pack and load',
          description: 'Event is imminent. Pack everything and verify against packing list.',
        },
      ],
      byEvent: [
        {
          eventId: 'event-1',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2026-04-24',
          clientName: 'Maya Chen',
          status: 'confirmed',
          facts: {} as any,
          items: [],
        },
      ],
      summary: {
        totalActiveEvents: 1,
        totalPreparableActions: 1,
        totalBlockedActions: 0,
        totalFragileActions: 1,
      },
    }

    const task = resolvePrepareNextTask({
      workSurface,
      prepPrompts: [
        {
          eventId: 'event-1',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2026-04-24',
          clientName: 'Maya Chen',
          urgency: 'actionable',
          message: 'Packing review is due tomorrow for Anniversary Dinner.',
          action: 'Review Packing',
          actionUrl: '/events/event-1/pack',
          daysUntilEvent: 1,
          category: 'packing',
        },
      ],
    })

    assert.ok(task)
    assert.equal(task?.source, 'work_surface')
    assert.equal(task?.href, '/events/event-1/pack')
    assert.equal(task?.ctaLabel, 'Open Pack List')
    assert.match(task?.context.join(' ') ?? '', /Tomorrow/)
  })

  it('promotes procurement next from the live grocery truth without duplicating prepare next', () => {
    const task = resolveProcurementNextTask([
      {
        id: 'event-procurement-live',
        occasion: 'Anniversary Dinner',
        event_date: '2099-06-02',
        client: { full_name: 'Maya Chen' },
        needs_finalized_list: true,
        latest_quote_created_at: null,
        actual_grocery_cost_cents: null,
        accuracy_delta_pct: null,
      },
      {
        id: 'event-procurement-variance',
        occasion: 'Garden Dinner',
        event_date: '2026-04-18',
        client: { full_name: 'Avery Stone' },
        needs_finalized_list: false,
        latest_quote_created_at: '2026-04-18T09:00:00.000Z',
        actual_grocery_cost_cents: 38250,
        accuracy_delta_pct: 11.2,
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'get_quote')
    assert.equal(task?.href, '/events/event-procurement-live/procurement')
    assert.equal(task?.ctaLabel, 'Get Grocery Quote')
  })

  it('surfaces prep flow from event prep blocks instead of the broad prep shell', () => {
    const task = resolvePrepFlowTask([
      {
        id: 'event-prep-flow-1',
        occasion: 'Chef Table',
        event_date: '2099-06-03',
        client: { full_name: 'Jordan Patel' },
        incomplete_block_count: 0,
        due_incomplete_block_count: 0,
        next_incomplete_block_title: null,
        next_incomplete_block_date: null,
        suggestion_count: 3,
        has_any_blocks: false,
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'confirm_suggestions')
    assert.equal(task?.href, '/events/event-prep-flow-1/prep-plan')
    assert.equal(task?.ctaLabel, 'Confirm Suggested Blocks')
  })

  it('uses the focused travel route for the live next travel move', () => {
    const task = resolveTravelConfirmTask([
      {
        id: 'event-travel-build',
        occasion: 'Birthday Dinner',
        event_date: '2099-06-04',
        client: { full_name: 'Alex Rivera' },
        leg_count: 0,
        has_in_progress_leg: false,
        next_planned_leg_date: null,
        printable_route_ready: false,
      },
      {
        id: 'event-travel-live',
        occasion: 'Chef Table',
        event_date: '2099-06-03',
        client: { full_name: 'Jordan Patel' },
        leg_count: 2,
        has_in_progress_leg: true,
        next_planned_leg_date: '2099-06-03',
        printable_route_ready: true,
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'mark_trip_complete')
    assert.equal(task?.href, '/events/event-travel-live/travel')
    assert.equal(task?.ctaLabel, 'Mark Trip Complete')
  })

  it('turns the top blocked work item into an unblock action with the exact missing fact', () => {
    const workSurface: DashboardWorkSurface = {
      ...emptyWorkSurface,
      blocked: [
        {
          id: 'event-2:inquiry_intake:set_location',
          eventId: 'event-2',
          eventOccasion: 'Birthday Dinner',
          eventDate: '2026-04-28',
          clientName: 'Alex Rivera',
          stage: 'inquiry_intake',
          stageNumber: 1,
          stageLabel: 'Inquiry Intake',
          category: 'blocked',
          urgency: 'fragile',
          title: 'Set event location',
          description: 'Location unlocks travel planning and equipment decisions.',
          blockedBy: 'Event location',
        },
      ],
      byEvent: [
        {
          eventId: 'event-2',
          eventOccasion: 'Birthday Dinner',
          eventDate: '2026-04-28',
          clientName: 'Alex Rivera',
          status: 'draft',
          facts: {} as any,
          items: [],
        },
      ],
      summary: {
        totalActiveEvents: 1,
        totalPreparableActions: 0,
        totalBlockedActions: 1,
        totalFragileActions: 0,
      },
    }

    const task = resolveFixMissingFactTask(workSurface)

    assert.ok(task)
    assert.equal(task?.href, '/events/event-2/edit')
    assert.equal(task?.ctaLabel, 'Fix Missing Fact')
    assert.match(task?.context.join(' ') ?? '', /Missing: Event location/)
  })

  it('routes quote-stage commitment work into commit next instead of prepare next', () => {
    const workSurface: DashboardWorkSurface = {
      ...emptyWorkSurface,
      preparable: [
        {
          id: 'event-3:quote:set_deposit',
          eventId: 'event-3',
          eventOccasion: 'Tasting Dinner',
          eventDate: '2099-06-01',
          clientName: 'Nina Lopez',
          stage: 'quote',
          stageNumber: 4,
          stageLabel: 'Quote',
          category: 'preparable',
          urgency: 'normal',
          title: 'Define deposit amount',
          description: 'Deposit amount determines the financial commitment threshold.',
        },
      ],
      byEvent: [
        {
          eventId: 'event-3',
          eventOccasion: 'Tasting Dinner',
          eventDate: '2099-06-01',
          clientName: 'Nina Lopez',
          status: 'draft',
          facts: {} as any,
          items: [],
        },
      ],
      summary: {
        totalActiveEvents: 1,
        totalPreparableActions: 1,
        totalBlockedActions: 0,
        totalFragileActions: 0,
      },
    }

    assert.equal(
      resolvePrepareNextTask({
        workSurface,
        prepPrompts: [],
      }),
      null
    )

    const task = resolveCommitNextTask(workSurface)

    assert.ok(task)
    assert.equal(task?.source, 'quote')
    assert.equal(task?.href, '/events/event-3/edit')
    assert.equal(task?.ctaLabel, 'Define Deposit')
  })

  it('keeps payment blockers out of fix missing fact and assigns them to commit next', () => {
    const workSurface: DashboardWorkSurface = {
      ...emptyWorkSurface,
      blocked: [
        {
          id: 'event-4:financial_commitment:await_deposit',
          eventId: 'event-4',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2099-06-02',
          clientName: 'Maya Chen',
          stage: 'financial_commitment',
          stageNumber: 5,
          stageLabel: 'Financial Commitment',
          category: 'blocked',
          urgency: 'fragile',
          title: 'Awaiting deposit payment',
          description:
            'Client accepted. Deposit unlocks calendar lock, prep eligibility, and grocery phases.',
          blockedBy: 'Deposit payment',
        },
      ],
      byEvent: [
        {
          eventId: 'event-4',
          eventOccasion: 'Anniversary Dinner',
          eventDate: '2099-06-02',
          clientName: 'Maya Chen',
          status: 'accepted',
          facts: {} as any,
          items: [],
        },
      ],
      summary: {
        totalActiveEvents: 1,
        totalPreparableActions: 0,
        totalBlockedActions: 1,
        totalFragileActions: 1,
      },
    }

    assert.equal(resolveFixMissingFactTask(workSurface), null)

    const task = resolveCommitNextTask(workSurface)

    assert.ok(task)
    assert.equal(task?.source, 'financial_commitment')
    assert.equal(task?.href, '/events/event-4?tab=money')
    assert.equal(task?.ctaLabel, 'Record Payment')
  })

  it('promotes the next service-readiness blocker into an exact ops action', () => {
    const task = resolveServiceReadyTask([
      {
        id: 'event-5',
        occasion: 'Chef Table',
        event_date: '2099-06-03',
        guest_count: 10,
        status: 'confirmed',
        prep_sheet_ready: true,
        prep_sheet_generated: true,
        packing_list_generated: true,
        car_packed: false,
        client: { full_name: 'Jordan Patel' },
        dop_progress: { completed: 4, total: 9 },
        readiness: {
          ready: false,
          hardBlocked: false,
          blockers: [{ gate: 'packing_reviewed', label: 'Packing List Reviewed' }],
        },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'packing')
    assert.equal(task?.href, '/events/event-5/pack')
    assert.equal(task?.ctaLabel, 'Review Packing')
  })

  it('hands the ready-to-start service transition to execution next instead of service ready', () => {
    const today = dateFromToday(0)

    const serviceReadyTask = resolveServiceReadyTask([
      {
        id: 'event-execution-1',
        occasion: 'Chef Table',
        event_date: today,
        guest_count: 10,
        status: 'confirmed',
        prep_sheet_ready: true,
        prep_sheet_generated: true,
        packing_list_generated: true,
        car_packed: true,
        client: { full_name: 'Jordan Patel' },
        dop_progress: { completed: 9, total: 9 },
        readiness: {
          ready: true,
          hardBlocked: false,
          blockers: [],
        },
      },
    ])

    assert.equal(serviceReadyTask, null)

    const executionTask = resolveExecutionNextTask([
      {
        id: 'event-execution-1',
        occasion: 'Chef Table',
        event_date: today,
        guest_count: 10,
        status: 'confirmed',
        service_started_at: null,
        service_completed_at: null,
        time_service_minutes: null,
        client: { full_name: 'Jordan Patel' },
        readiness: {
          ready: true,
          hardBlocked: false,
          blockers: [],
        },
      },
    ])

    assert.ok(executionTask)
    assert.equal(executionTask?.source, 'mark_in_progress')
    assert.equal(executionTask?.href, '/events/event-execution-1/execution')
    assert.equal(executionTask?.ctaLabel, 'Mark In Progress')
  })

  it('prioritizes active menu approval loops over unsent menus', () => {
    const task = resolveMenuDecisionTask([
      {
        id: 'event-menu-1',
        occasion: 'Anniversary Dinner',
        event_date: '2099-06-04',
        guest_count: 8,
        menu_approval_status: 'not_sent',
        menu_modified_after_approval: false,
        client: { full_name: 'Maya Chen' },
      },
      {
        id: 'event-menu-2',
        occasion: 'Chef Table',
        event_date: '2099-06-07',
        guest_count: 10,
        menu_approval_status: 'revision_requested',
        menu_modified_after_approval: false,
        client: { full_name: 'Jordan Patel' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'revise')
    assert.equal(task?.href, '/events/event-menu-2/menu-approval')
    assert.equal(task?.ctaLabel, 'Revise Menu')
  })

  it('keeps allergy verification ahead of downstream safety steps', () => {
    const task = resolveSafetyCheckTask([
      {
        id: 'event-safety-1',
        occasion: 'Tasting Dinner',
        event_date: '2099-06-05',
        guest_count: 6,
        unconfirmed_allergy_count: 2,
        allergen_conflict_count: 1,
        dietary_conflict_count: 0,
        allergen_count: 2,
        cross_contamination_completed_count: 0,
        cross_contamination_total_count: 8,
        has_allergy_card_data: true,
        client: { full_name: 'Alex Rivera' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'confirm_allergies')
    assert.equal(task?.href, '/events/event-safety-1/safety')
    assert.equal(task?.ctaLabel, 'Confirm Allergies')
  })

  it('promotes balance recovery before financial closure', () => {
    const task = resolveCollectBalanceTask([
      {
        id: 'event-balance-1',
        occasion: 'Wine Dinner',
        event_date: '2099-06-06',
        guest_count: 12,
        status: 'completed',
        financially_closed: false,
        outstanding_balance_cents: 42500,
        unpaid_installment_count: 1,
        next_installment_label: 'Final balance',
        client: { full_name: 'Jordan Patel' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'record_payment')
    assert.equal(task?.href, '/events/event-balance-1/billing')
    assert.equal(task?.ctaLabel, 'Record Payment')
  })

  it('prioritizes receipt extraction review over approval and upload gaps', () => {
    const task = resolveReceiptCaptureTask([
      {
        id: 'event-receipt-upload',
        occasion: 'Garden Dinner',
        event_date: '2026-04-18',
        guest_count: 10,
        status: 'completed',
        needs_upload: true,
        needs_review_count: 0,
        approvable_count: 0,
        client: { full_name: 'Avery Stone' },
      },
      {
        id: 'event-receipt-review',
        occasion: 'Wine Dinner',
        event_date: '2026-04-20',
        guest_count: 12,
        status: 'completed',
        needs_upload: false,
        needs_review_count: 1,
        approvable_count: 0,
        client: { full_name: 'Jordan Patel' },
      },
      {
        id: 'event-receipt-approve',
        occasion: 'Chef Table',
        event_date: '2026-04-21',
        guest_count: 8,
        status: 'confirmed',
        needs_upload: false,
        needs_review_count: 0,
        approvable_count: 2,
        client: { full_name: 'Maya Chen' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'review_extraction')
    assert.equal(task?.href, '/events/event-receipt-review/receipts')
    assert.equal(task?.ctaLabel, 'Review Receipt Extraction')
  })

  it('surfaces receipt approval when extraction is ready on the focused receipts route', () => {
    const task = resolveReceiptCaptureTask([
      {
        id: 'event-receipt-approve',
        occasion: 'Chef Table',
        event_date: '2026-04-21',
        guest_count: 8,
        status: 'confirmed',
        needs_upload: false,
        needs_review_count: 0,
        approvable_count: 1,
        client: { full_name: 'Maya Chen' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'approve')
    assert.equal(task?.href, '/events/event-receipt-approve/receipts')
    assert.equal(task?.ctaLabel, 'Approve Receipt')
  })

  it('surfaces receipt upload only when the gap is explicit', () => {
    const task = resolveReceiptCaptureTask([
      {
        id: 'event-receipt-upload',
        occasion: 'Garden Dinner',
        event_date: '2026-04-18',
        guest_count: 10,
        status: 'completed',
        needs_upload: true,
        needs_review_count: 0,
        approvable_count: 0,
        client: { full_name: 'Avery Stone' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'upload')
    assert.equal(task?.href, '/events/event-receipt-upload/receipts')
    assert.equal(task?.ctaLabel, 'Upload Receipt')
  })

  it('routes financial-only close-out work into collect balance instead of close out next', () => {
    const closeOutTask = resolveCloseOutNextTask([
      {
        id: 'event-financial-only',
        occasion: 'Garden Dinner',
        event_date: '2026-04-18',
        guest_count: 10,
        aar_filed: true,
        reset_complete: true,
        follow_up_sent: true,
        financially_closed: false,
        client: { id: 'client-financial-only', full_name: 'Avery Stone' },
      },
    ])

    assert.equal(closeOutTask, null)

    const balanceTask = resolveCollectBalanceTask([
      {
        id: 'event-financial-only',
        occasion: 'Garden Dinner',
        event_date: '2026-04-18',
        guest_count: 10,
        status: 'completed',
        financially_closed: false,
        outstanding_balance_cents: 0,
        unpaid_installment_count: 0,
        next_installment_label: null,
        client: { full_name: 'Avery Stone' },
      },
    ])

    assert.ok(balanceTask)
    assert.equal(balanceTask?.source, 'close_financials')
    assert.equal(balanceTask?.href, '/events/event-financial-only/financial')
    assert.equal(balanceTask?.ctaLabel, 'Close Financials')
  })

  it('gives reset-only work to reset next instead of close out next', () => {
    const resetTask = resolveResetNextTask([
      {
        id: 'event-reset-only',
        occasion: 'Garden Dinner',
        event_date: '2026-04-20',
        guest_count: 10,
        reset_complete: false,
        client: { full_name: 'Avery Stone' },
      },
    ])

    assert.ok(resetTask)
    assert.equal(resetTask?.source, 'checklist')
    assert.equal(resetTask?.href, '/events/event-reset-only/reset')
    assert.equal(resetTask?.ctaLabel, 'Open Reset Checklist')

    const closeOutTask = resolveCloseOutNextTask([
      {
        id: 'event-reset-only',
        occasion: 'Garden Dinner',
        event_date: '2026-04-20',
        guest_count: 10,
        aar_filed: true,
        reset_complete: false,
        follow_up_sent: true,
        financially_closed: true,
        client: { id: 'client-reset-only', full_name: 'Avery Stone' },
      },
    ])

    assert.equal(closeOutTask, null)
  })

  it('surfaces staffing conflicts as a dedicated team-ready action', () => {
    const task = resolveTeamReadyTask([
      {
        id: 'event-staff-1',
        occasion: 'Chef Table',
        event_date: '2099-06-08',
        guest_count: 10,
        staff_count: 2,
        has_staff_conflict: true,
        conflict_summary: 'Jordan overlaps with Wine Dinner',
        has_staff_task: false,
        can_generate_staff_briefing: true,
        client: { full_name: 'Jordan Patel' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'resolve_staff_conflict')
    assert.equal(task?.href, '/events/event-staff-1/staff')
    assert.equal(task?.ctaLabel, 'Resolve Staff Conflict')
  })

  it('promotes the next incomplete post-event step into a close-out action', () => {
    const task = resolveCloseOutNextTask([
      {
        id: 'event-9',
        occasion: 'Wine Dinner',
        event_date: '2026-04-20',
        guest_count: 12,
        aar_filed: false,
        reset_complete: false,
        follow_up_sent: false,
        financially_closed: false,
        client: { id: 'client-9', full_name: 'Jordan Patel' },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'wizard')
    assert.equal(task?.href, '/events/event-9/close-out')
    assert.equal(task?.ctaLabel, 'Open Close-Out')
    assert.match(task?.context.join(' ') ?? '', /Financial close pending/)
    assert.match(task?.context.join(' ') ?? '', /Event review pending/)
  })

  it('promotes the next external trust-loop action after follow-up is complete', () => {
    const task = resolveTrustLoopNextTask([
      {
        id: 'event-10',
        occasion: 'Birthday Dinner',
        event_date: '2024-05-01',
        guest_count: 8,
        follow_up_sent_at: '2024-05-02T12:00:00.000Z',
        client: { full_name: 'Avery Stone' },
        survey: null,
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'survey')
    assert.equal(task?.href, '/events/event-10?tab=wrap')
    assert.equal(task?.ctaLabel, 'Send Survey')
  })

  it('requests a public review only after the survey makes that ask truthful', () => {
    const task = resolveTrustLoopNextTask([
      {
        id: 'event-11',
        occasion: 'Garden Dinner',
        event_date: '2024-05-03',
        guest_count: 14,
        follow_up_sent_at: '2024-05-04T12:00:00.000Z',
        client: { full_name: 'Cameron Lee' },
        survey: {
          id: 'survey-11',
          token: 'token-11',
          sent_at: '2024-05-04T13:00:00.000Z',
          completed_at: '2024-05-05T10:00:00.000Z',
          overall: 5,
          what_they_loved: 'Exceptional pacing and food.',
          review_request_eligible: true,
          review_request_sent_at: null,
          public_review_shared: false,
        },
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'review_request')
    assert.equal(task?.href, '/events/event-11?tab=wrap')
    assert.equal(task?.ctaLabel, 'Request Public Review')
  })

  it('skips inquiry-owned client actions and promotes the next relationship move', () => {
    const task = resolveRelationshipNextTask([
      {
        clientId: 'client-1',
        clientName: 'Maya Chen',
        href: '/inquiries/inquiry-1',
        actionType: 'reply_inquiry',
        label: 'Reply to inquiry',
        description: 'Inquiry still waiting on you.',
        urgency: 'critical',
        tier: 'new',
        primarySignal: 'awaiting_chef_reply',
        interventionLabel: 'Approval required',
      },
      {
        clientId: 'client-2',
        clientName: 'Jordan Patel',
        href: '/clients/client-2/relationship',
        actionType: 'follow_up_quote',
        label: 'Follow up on quote',
        description: 'A sent quote is expiring in the next 7 days.',
        urgency: 'high',
        tier: 'loyal',
        primarySignal: 'quote_expiring_soon',
        interventionLabel: 'Approval required',
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'follow_up_quote')
    assert.equal(task?.href, '/clients/client-2/relationship')
    assert.equal(task?.ctaLabel, 'Follow Up on Quote')
  })

  it('surfaces prepared quote revisions through the relationship action layer', () => {
    const task = resolveRelationshipNextTask([
      {
        clientId: 'client-3',
        clientName: 'Avery Stone',
        href: '/quotes/new?source=quote_revision&quote_name=Birthday+Dinner+Quote+Revised',
        actionType: 'quote_revision',
        label: 'Prepare revised quote for Birthday Dinner Quote',
        description: 'Open a revised draft before following up with the client.',
        urgency: 'high',
        tier: 'loyal',
        primarySignal: 'quote_revision_ready',
        interventionLabel: 'Prepared draft',
      },
    ])

    assert.ok(task)
    assert.equal(task?.source, 'quote_revision')
    assert.equal(
      task?.href,
      '/quotes/new?source=quote_revision&quote_name=Birthday+Dinner+Quote+Revised'
    )
    assert.equal(task?.ctaLabel, 'Open Revised Draft')
    assert.ok(task?.context.includes('Prepared draft'))
  })
})
