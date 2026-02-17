// 17-Stage Definitions with Unlock Conditions
// Each stage defines what work items it surfaces and under what conditions.
// Pure functions. No database calls. No side effects.

import type {
  ConfirmedFacts,
  WorkItem,
  WorkStage,
  WorkCategory,
  WorkUrgency,
  EventContext
} from './types'

// ============================================
// STAGE METADATA
// ============================================

export const STAGE_META: Record<WorkStage, { number: number; label: string }> = {
  inquiry_intake:       { number: 1,  label: 'Inquiry Intake' },
  qualification:        { number: 2,  label: 'Qualification' },
  menu_development:     { number: 3,  label: 'Menu Development' },
  quote:                { number: 4,  label: 'Quote' },
  financial_commitment: { number: 5,  label: 'Financial Commitment' },
  grocery_list:         { number: 6,  label: 'Grocery List' },
  prep_list:            { number: 7,  label: 'Prep List' },
  equipment_planning:   { number: 8,  label: 'Equipment Planning' },
  packing:              { number: 9,  label: 'Packing' },
  timeline:             { number: 10, label: 'Timeline' },
  travel_arrival:       { number: 11, label: 'Travel & Arrival' },
  execution:            { number: 12, label: 'Execution' },
  breakdown:            { number: 13, label: 'Breakdown' },
  post_event_capture:   { number: 14, label: 'Post-Event Capture' },
  follow_up:            { number: 15, label: 'Follow-Up' },
  financial_closure:    { number: 16, label: 'Financial Closure' },
  inquiry_closure:      { number: 17, label: 'Inquiry Closure' }
}

// ============================================
// WORK ITEM BUILDER
// ============================================

function item(
  ctx: EventContext,
  stage: WorkStage,
  key: string,
  category: WorkCategory,
  urgency: WorkUrgency,
  title: string,
  description: string,
  blockedBy?: string
): WorkItem {
  const meta = STAGE_META[stage]
  return {
    id: `${ctx.event.id}:${stage}:${key}`,
    eventId: ctx.event.id,
    eventOccasion: ctx.event.occasion ?? '',
    eventDate: ctx.event.event_date,
    clientName: ctx.event.client?.full_name ?? 'Unknown Client',
    stage,
    stageNumber: meta.number,
    stageLabel: meta.label,
    category,
    urgency,
    title,
    description,
    blockedBy
  }
}

// ============================================
// STAGE EVALUATORS
// Each returns work items based on confirmed facts.
// ============================================

function stage1_inquiryIntake(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (!f.hasClient) {
    items.push(item(ctx, 'inquiry_intake', 'assign_client', 'blocked', 'fragile',
      'Assign client to event',
      'Event cannot progress without a client assigned.',
      'Client assignment'))
  }

  if (!f.hasDate) {
    items.push(item(ctx, 'inquiry_intake', 'set_date', 'blocked', 'fragile',
      'Set event date',
      'Date unlocks timeline skeleton, travel buffers, and grocery timing.',
      'Event date'))
  }

  if (!f.hasLocation) {
    items.push(item(ctx, 'inquiry_intake', 'set_location', 'blocked', 'fragile',
      'Set event location',
      'Location unlocks travel planning and equipment decisions.',
      'Event location'))
  }

  if (!f.hasGuestCount) {
    items.push(item(ctx, 'inquiry_intake', 'set_guest_count', 'blocked', 'fragile',
      'Set guest count',
      'Guest count drives grocery quantities and equipment sizing.',
      'Guest count'))
  }

  return items
}

function stage2_qualification(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.hasDate && !f.hasServeTimeWindow) {
    items.push(item(ctx, 'qualification', 'set_serve_time', 'preparable', 'normal',
      'Set serve time',
      'Serve time anchors the entire timeline and travel buffer calculation.'))
  }

  if (!f.hasMenuDirection) {
    items.push(item(ctx, 'qualification', 'attach_menu', 'preparable', 'normal',
      'Attach a menu to this event',
      'Menu direction unlocks component breakdown, grocery skeleton, and equipment planning.'))
  }

  return items
}

function stage3_menuDevelopment(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.hasMenuAttached && !f.hasMenuWithDishes) {
    items.push(item(ctx, 'menu_development', 'add_dishes', 'preparable', 'normal',
      'Add dishes to the attached menu',
      'Dish list unlocks partial component breakdown and grocery skeleton.'))
  }

  if (f.hasMenuWithDishes && !f.menuGravityStable) {
    items.push(item(ctx, 'menu_development', 'stabilize_menu', 'optional_early', 'low',
      'Finalize menu direction',
      'Proposing to the client stabilizes menu gravity and unlocks deeper prep modeling.'))
  }

  return items
}

function stage4_quote(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (!f.hasPricing && f.hasClient && f.hasGuestCount) {
    items.push(item(ctx, 'quote', 'set_pricing', 'preparable', 'normal',
      'Set event pricing',
      'Pricing unlocks financial projection and revenue forecast.'))
  }

  if (f.hasPricing && !f.hasDepositDefined) {
    items.push(item(ctx, 'quote', 'set_deposit', 'preparable', 'normal',
      'Define deposit amount',
      'Deposit amount determines the financial commitment threshold.'))
  }

  // If event is still draft with complete info, surface the proposal action
  if (ctx.event.status === 'draft' && f.hasClient && f.hasDate && f.hasLocation &&
      f.hasGuestCount && f.hasPricing) {
    items.push(item(ctx, 'quote', 'propose_to_client', 'preparable', 'normal',
      'Propose event to client',
      'All details are ready. Send the proposal to get client commitment.'))
  }

  return items
}

function stage5_financialCommitment(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (ctx.event.status === 'accepted' && !f.depositReceived) {
    items.push(item(ctx, 'financial_commitment', 'await_deposit', 'blocked', 'fragile',
      'Awaiting deposit payment',
      'Client accepted. Deposit unlocks calendar lock, prep eligibility, and grocery phases.',
      'Deposit payment'))
  }

  if (ctx.event.status === 'paid' && !f.eventConfirmed) {
    items.push(item(ctx, 'financial_commitment', 'confirm_event', 'preparable', 'fragile',
      'Confirm the event',
      'Payment received. Confirm to lock the calendar and unlock full prep workflow.'))
  }

  return items
}

function stage6_groceryList(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []
  if (!f.hasMenuAttached) return items

  // Phase A — Structural (menu gravity stable)
  if (f.menuGravityStable && !f.guestCountStable) {
    items.push(item(ctx, 'grocery_list', 'grocery_phase_a', 'optional_early', 'low',
      'Draft grocery skeleton (Phase A)',
      'Menu shape is stable. Start a structural grocery list - categories and staples. Quantities come later.'))
  }

  // Phase B — Quantified (guest count stabilized)
  if (f.guestCountStable && f.hasMenuWithDishes && !f.eventConfirmed) {
    items.push(item(ctx, 'grocery_list', 'grocery_phase_b', 'preparable', 'normal',
      'Quantify grocery list (Phase B)',
      'Guest count is locked. Scale quantities to headcount.'))
  }

  // Phase C — Finalized (confirmed, within shopping window)
  if (f.eventConfirmed && f.dateWithin7Days) {
    const urgency: WorkUrgency = f.dateWithin3Days ? 'fragile' : 'normal'
    items.push(item(ctx, 'grocery_list', 'grocery_phase_c', 'preparable', urgency,
      'Finalize grocery list (Phase C)',
      'Event confirmed and within shopping window. Finalize for market timing.'))
  }

  return items
}

function stage7_prepList(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []
  if (!f.hasMenuWithDishes) return items

  // Prep modeling unlocks when menu gravity is stable
  if (f.menuGravityStable && !f.isLegallyActionable) {
    items.push(item(ctx, 'prep_list', 'draft_prep_plan', 'optional_early', 'low',
      'Draft prep plan',
      'Menu gravity is stable. Identify early prep vs texture-sensitive vs day-of tasks.'))
  }

  // Active prep planning when financially committed
  if (f.isLegallyActionable && !f.dateWithin24Hours) {
    items.push(item(ctx, 'prep_list', 'prep_early_items', 'preparable', 'normal',
      'Begin early prep items',
      'Event is financially committed. Start items that hold well - stocks, marinades, sauces.'))
  }

  // Day-of prep becomes fragile
  if (f.dateWithin24Hours && !f.dateInPast) {
    items.push(item(ctx, 'prep_list', 'prep_day_of', 'preparable', 'fragile',
      'Execute day-of prep',
      'Event is tomorrow or today. Handle texture-sensitive items and final preparations.'))
  }

  return items
}

function stage8_equipmentPlanning(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  // Level 1 — Menu-dependent tools (once menu exists)
  if (f.hasMenuAttached && !f.isLegallyActionable) {
    items.push(item(ctx, 'equipment_planning', 'equipment_level_1', 'optional_early', 'low',
      'Identify menu-dependent equipment',
      'Menu is attached. Identify tools and vessels needed for the dishes.'))
  }

  // Level 2 — Service-dependent tools (once guest count and location confirmed)
  if (f.guestCountStable && f.hasLocation) {
    items.push(item(ctx, 'equipment_planning', 'equipment_level_2', 'preparable', 'normal',
      'Plan service equipment',
      'Guest count and location are confirmed. Size serving equipment, seating, and service setup.'))
  }

  // Level 3 — Site confirmations (close to event)
  if (f.eventConfirmed && f.dateWithin7Days) {
    const urgency: WorkUrgency = f.dateWithin3Days ? 'fragile' : 'normal'
    items.push(item(ctx, 'equipment_planning', 'equipment_level_3', 'preparable', urgency,
      'Confirm site-specific equipment',
      'Verify power, water, counter space, and any rental pickups.'))
  }

  return items
}

function stage9_packing(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []
  if (!f.eventConfirmed) return items

  if (f.dateWithin3Days && !f.dateIsToday) {
    items.push(item(ctx, 'packing', 'build_packing_list', 'preparable', 'normal',
      'Build packing list',
      'Group items by category: cold, dry, tools, fragile, non-negotiables.'))
  }

  if (f.dateIsToday || f.dateWithin24Hours) {
    items.push(item(ctx, 'packing', 'pack_and_load', 'preparable', 'fragile',
      'Pack and load',
      'Event is imminent. Pack everything and verify against packing list.'))
  }

  return items
}

function stage10_timeline(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  // Timeline skeleton becomes buildable when serve time exists
  if (f.hasServeTimeWindow && f.hasMenuAttached && !f.eventConfirmed) {
    items.push(item(ctx, 'timeline', 'draft_timeline', 'optional_early', 'low',
      'Draft event timeline',
      'Serve time and menu are set. Anchor the timeline and sequence courses.'))
  }

  // Finalize timeline when confirmed and close
  if (f.eventConfirmed && f.dateWithin7Days) {
    const urgency: WorkUrgency = f.dateWithin3Days ? 'fragile' : 'normal'
    items.push(item(ctx, 'timeline', 'finalize_timeline', 'preparable', urgency,
      'Finalize event timeline',
      'Lock the sequence. Flag any compression. Insert slack where needed.'))
  }

  return items
}

function stage11_travelArrival(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.hasLocation && f.hasDate && !f.eventConfirmed) {
    items.push(item(ctx, 'travel_arrival', 'model_travel', 'optional_early', 'low',
      'Model travel buffer',
      'Location and date are set. Estimate drive time, access points, and weather risks.'))
  }

  if (f.eventConfirmed && f.dateWithin3Days) {
    items.push(item(ctx, 'travel_arrival', 'confirm_travel', 'preparable', f.dateWithin24Hours ? 'fragile' : 'normal',
      'Confirm travel plan',
      'Verify route, arrival time, parking, and access instructions.'))
  }

  return items
}

function stage12_execution(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (ctx.event.status === 'confirmed' && f.dateIsToday) {
    items.push(item(ctx, 'execution', 'start_event', 'preparable', 'fragile',
      'Mark event as in progress',
      'You are on-site. Start the event to track execution.'))
  }

  if (ctx.event.status === 'in_progress') {
    items.push(item(ctx, 'execution', 'complete_event', 'preparable', 'normal',
      'Mark event as completed',
      'Service is finished. Complete the event to trigger post-event workflow.'))
  }

  return items
}

function stage13_breakdown(_ctx: EventContext, _f: ConfirmedFacts): WorkItem[] {
  // No behavioral change per master doc. Breakdown is implicit in execution completion.
  return []
}

function stage14_postEventCapture(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.isCompleted) {
    items.push(item(ctx, 'post_event_capture', 'capture_notes', 'optional_early', 'low',
      'Capture post-event notes',
      'Optional. Record what went well, what to improve, and any client feedback while it is fresh.'))
  }

  return items
}

function stage15_followUp(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.isCompleted) {
    items.push(item(ctx, 'follow_up', 'send_follow_up', 'preparable', 'normal',
      'Send client follow-up',
      'Specific reference to their event. Include review link. Maintain tone consistency.'))
  }

  return items
}

function stage16_financialClosure(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.isCompleted && !f.fullyPaid) {
    items.push(item(ctx, 'financial_closure', 'collect_balance', 'preparable', 'fragile',
      'Collect remaining balance',
      'Event is completed but not fully paid. Resolve financial ambiguity.'))
  }

  if (f.isCompleted && f.fullyPaid) {
    items.push(item(ctx, 'financial_closure', 'close_financials', 'optional_early', 'low',
      'Review and close financials',
      'Verify ledger. Confirm no pending adjustments. Mark financially closed.'))
  }

  return items
}

function stage17_inquiryClosure(ctx: EventContext, f: ConfirmedFacts): WorkItem[] {
  const items: WorkItem[] = []

  if (f.isCompleted) {
    items.push(item(ctx, 'inquiry_closure', 'close_inquiry', 'optional_early', 'low',
      'Close inquiry',
      'Follow-up sent. No open loops. Tag client as repeat-ready if appropriate.'))
  }

  return items
}

// ============================================
// EXPORT: ALL STAGE EVALUATORS
// ============================================

export type StageEvaluator = (ctx: EventContext, f: ConfirmedFacts) => WorkItem[]

export const STAGE_EVALUATORS: StageEvaluator[] = [
  stage1_inquiryIntake,
  stage2_qualification,
  stage3_menuDevelopment,
  stage4_quote,
  stage5_financialCommitment,
  stage6_groceryList,
  stage7_prepList,
  stage8_equipmentPlanning,
  stage9_packing,
  stage10_timeline,
  stage11_travelArrival,
  stage12_execution,
  stage13_breakdown,
  stage14_postEventCapture,
  stage15_followUp,
  stage16_financialClosure,
  stage17_inquiryClosure
]
