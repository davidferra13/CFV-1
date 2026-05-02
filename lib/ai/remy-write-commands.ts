'use server'

// Remy Write Commands
// Wraps existing server actions so Remy can mutate data through conversation.
// Every write calls broadcast() for real-time UI updates.
// PRIVACY: Contains client PII operations - must stay local via Ollama.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { broadcastInsert, broadcastUpdate } from '@/lib/realtime/broadcast'
import { revalidatePath } from 'next/cache'
import type { ApprovalTier, AgentActionPreview } from '@/lib/ai/command-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RemyWriteResult {
  success: boolean
  action: string
  tier: ApprovalTier
  data?: Record<string, unknown>
  error?: string
  /** For Tier 2/3: preview card shown before execution */
  preview?: AgentActionPreview
  /** URL to navigate after success */
  redirectUrl?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function writeResult(
  action: string,
  tier: ApprovalTier,
  data: Record<string, unknown>,
  redirectUrl?: string
): RemyWriteResult {
  return { success: true, action, tier, data, redirectUrl }
}

function writeError(action: string, tier: ApprovalTier, error: string): RemyWriteResult {
  return { success: false, action, tier, error }
}

function previewResult(
  action: string,
  tier: ApprovalTier,
  preview: AgentActionPreview
): RemyWriteResult {
  return { success: true, action, tier, preview }
}

// ─── Event Writes ───────────────────────────────────────────────────────────

export async function remyCreateEvent(inputs: {
  clientId: string
  eventDate: string
  occasion?: string
  guestCount?: number
  location?: string
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const { createEvent } = await import('@/lib/events/actions')

    const event = await createEvent({
      client_id: inputs.clientId,
      event_date: inputs.eventDate,
      serve_time: '',
      occasion: inputs.occasion || 'Private Dinner',
      guest_count: inputs.guestCount || 2,
      special_requests: inputs.notes,
      location_address: inputs.location || '',
      location_city: '',
      location_zip: '',
    })

    broadcastInsert('events', tenantId, event)
    revalidatePath('/events')
    revalidatePath('/dashboard')

    return writeResult(
      'event.create',
      2,
      {
        eventId: (event as any).id,
        date: inputs.eventDate,
        occasion: inputs.occasion,
      },
      `/events/${(event as any).id}`
    )
  } catch (err) {
    return writeError(
      'event.create',
      2,
      err instanceof Error ? err.message : 'Failed to create event'
    )
  }
}

export async function remyUpdateEvent(inputs: {
  eventId: string
  updates: {
    event_date?: string
    guest_count?: number
    occasion?: string
    notes?: string
    location_address?: string
    location_city?: string
    location_state?: string
    serve_time?: string
    arrival_time?: string
  }
}): Promise<RemyWriteResult> {
  try {
    const { updateEvent } = await import('@/lib/events/actions')
    const user = await requireChef()

    await updateEvent(inputs.eventId, inputs.updates)

    broadcastUpdate('events', user.tenantId!, { id: inputs.eventId, ...inputs.updates })
    revalidatePath('/events')
    revalidatePath(`/events/${inputs.eventId}`)
    revalidatePath('/dashboard')

    return writeResult('event.update', 2, {
      eventId: inputs.eventId,
      updated: Object.keys(inputs.updates),
    })
  } catch (err) {
    return writeError(
      'event.update',
      2,
      err instanceof Error ? err.message : 'Failed to update event'
    )
  }
}

// ─── Client Writes ──────────────────────────────────────────────────────────

export async function remyCreateClient(inputs: {
  fullName: string
  email?: string
  phone?: string
  dietaryRestrictions?: string[]
  allergies?: string[]
  vibeNotes?: string
}): Promise<RemyWriteResult> {
  try {
    const { createClient } = await import('@/lib/clients/actions')

    const client = await createClient({
      full_name: inputs.fullName,
      ...(inputs.email ? { email: inputs.email } : {}),
      ...(inputs.phone ? { phone: inputs.phone } : {}),
      dietary_restrictions: inputs.dietaryRestrictions || [],
      allergies: inputs.allergies || [],
      ...(inputs.vibeNotes ? { vibe_notes: inputs.vibeNotes } : {}),
    })

    const user = await requireChef()
    broadcastInsert('clients', user.tenantId!, client)
    revalidatePath('/clients')
    revalidatePath('/dashboard')

    return writeResult(
      'client.create',
      2,
      {
        clientId: (client as any).id,
        name: inputs.fullName,
      },
      `/clients/${(client as any).id}`
    )
  } catch (err) {
    return writeError(
      'client.create',
      2,
      err instanceof Error ? err.message : 'Failed to create client'
    )
  }
}

export async function remyUpdateClient(inputs: {
  clientId: string
  updates: {
    dietary_restrictions?: string[]
    allergies?: string[]
    vibe_notes?: string
    phone?: string
    email?: string
    preferred_contact_method?: 'email' | 'phone' | 'text' | 'instagram'
  }
}): Promise<RemyWriteResult> {
  try {
    const { updateClient } = await import('@/lib/clients/actions')
    const user = await requireChef()

    await updateClient(inputs.clientId, inputs.updates)

    broadcastUpdate('clients', user.tenantId!, { id: inputs.clientId, ...inputs.updates })
    revalidatePath('/clients')
    revalidatePath(`/clients/${inputs.clientId}`)

    // Flag allergy updates prominently (safety-critical)
    const warnings: string[] = []
    if (inputs.updates.allergies && inputs.updates.allergies.length > 0) {
      warnings.push(`ALLERGY UPDATE: ${inputs.updates.allergies.join(', ')}`)
    }

    return writeResult('client.update', 2, {
      clientId: inputs.clientId,
      updated: Object.keys(inputs.updates),
      warnings,
    })
  } catch (err) {
    return writeError(
      'client.update',
      2,
      err instanceof Error ? err.message : 'Failed to update client'
    )
  }
}

// ─── Task/Todo Writes ───────────────────────────────────────────────────────

export async function remyCreateTask(inputs: {
  title: string
  description?: string
  dueDate?: string
  priority?: 'high' | 'medium' | 'low'
  eventId?: string
  clientId?: string
}): Promise<RemyWriteResult> {
  try {
    const { createTodo } = await import('@/lib/todos/actions')

    const result = await createTodo({
      text: inputs.title,
      due_date: inputs.dueDate,
      priority: inputs.priority || 'medium',
      notes: inputs.description,
      event_id: inputs.eventId,
      client_id: inputs.clientId,
    })

    if (!result.success) {
      return writeError('todo.create', 1, result.error || 'Failed to create task')
    }

    const user = await requireChef()
    broadcastInsert('chef_todos', user.tenantId!, { id: result.id })
    revalidatePath('/tasks')
    revalidatePath('/dashboard')

    return writeResult('todo.create', 1, {
      taskId: result.id,
      title: inputs.title,
    })
  } catch (err) {
    return writeError(
      'todo.create',
      1,
      err instanceof Error ? err.message : 'Failed to create task'
    )
  }
}

export async function remyCompleteTask(inputs: { taskId: string }): Promise<RemyWriteResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    await db
      .from('chef_todos')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', inputs.taskId)
      .eq('chef_id', user.tenantId!)

    broadcastUpdate('chef_todos', user.tenantId!, { id: inputs.taskId, completed: true })
    revalidatePath('/tasks')

    return writeResult('todo.complete', 1, { taskId: inputs.taskId })
  } catch (err) {
    return writeError(
      'todo.complete',
      1,
      err instanceof Error ? err.message : 'Failed to complete task'
    )
  }
}

// ─── Event Transition ───────────────────────────────────────────────────────

export async function remyTransitionEvent(inputs: {
  eventId: string
  toStatus: string
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const { transitionEvent } = await import('@/lib/events/transitions')

    await transitionEvent({
      eventId: inputs.eventId,
      toStatus: inputs.toStatus as any,
      metadata: inputs.notes ? { notes: inputs.notes } : {},
    })

    const user = await requireChef()
    broadcastUpdate('events', user.tenantId!, { id: inputs.eventId, status: inputs.toStatus })
    revalidatePath('/events')
    revalidatePath(`/events/${inputs.eventId}`)
    revalidatePath('/dashboard')

    return writeResult('event.transition', 3, {
      eventId: inputs.eventId,
      newStatus: inputs.toStatus,
    })
  } catch (err) {
    return writeError(
      'event.transition',
      3,
      err instanceof Error ? err.message : 'Failed to transition event'
    )
  }
}

// ─── Menu Writes ────────────────────────────────────────────────────────────

export async function remyCreateMenu(inputs: {
  eventId: string
  name?: string
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data: menu } = await db
      .from('menus')
      .insert({
        tenant_id: user.tenantId!,
        event_id: inputs.eventId,
        name: inputs.name || 'Menu',
        notes: inputs.notes || null,
        status: 'draft',
      })
      .select('id, name')
      .single()

    broadcastInsert('menus', user.tenantId!, menu)
    revalidatePath(`/events/${inputs.eventId}`)
    revalidatePath('/culinary/menus')

    return writeResult(
      'menu.create',
      2,
      {
        menuId: menu?.id,
        eventId: inputs.eventId,
        name: inputs.name || 'Menu',
      },
      `/events/${inputs.eventId}`
    )
  } catch (err) {
    return writeError(
      'menu.create',
      2,
      err instanceof Error ? err.message : 'Failed to create menu'
    )
  }
}

export async function remyAddDishToMenu(inputs: {
  menuId: string
  dishName: string
  course?: string
  recipeId?: string
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data: item } = await db
      .from('menu_items')
      .insert({
        menu_id: inputs.menuId,
        tenant_id: user.tenantId!,
        name: inputs.dishName,
        course: inputs.course || 'main',
        recipe_id: inputs.recipeId || null,
        notes: inputs.notes || null,
      })
      .select('id, name, course')
      .single()

    broadcastInsert('menu_items', user.tenantId!, item)
    revalidatePath('/culinary/menus')

    return writeResult('menu.add_dish', 2, {
      itemId: item?.id,
      dish: inputs.dishName,
      course: inputs.course || 'main',
    })
  } catch (err) {
    return writeError('menu.add_dish', 2, err instanceof Error ? err.message : 'Failed to add dish')
  }
}

// ─── Note/Memory Writes ────────────────────────────────────────────────────

export async function remySaveNote(inputs: {
  content: string
  category?: string
  eventId?: string
  clientId?: string
}): Promise<RemyWriteResult> {
  try {
    const { addRemyMemoryManual } = await import('@/lib/ai/remy-memory-actions')

    await addRemyMemoryManual({
      content: inputs.content,
      category: (inputs.category as any) || 'general',
    })

    return writeResult('memory.save', 1, {
      content: inputs.content.slice(0, 100),
      category: inputs.category || 'general',
    })
  } catch (err) {
    return writeError('memory.save', 1, err instanceof Error ? err.message : 'Failed to save note')
  }
}

// ─── Expense Writes ─────────────────────────────────────────────────────────

export async function remyCreateExpense(inputs: {
  description: string
  amountCents: number
  category?: string
  eventId?: string
  date?: string
  vendor?: string
}): Promise<RemyWriteResult> {
  try {
    const { createExpense } = await import('@/lib/expenses/actions')
    const { EXPENSE_CATEGORY_VALUES } = await import('@/lib/constants/expense-categories')

    const validCategory = EXPENSE_CATEGORY_VALUES.includes(inputs.category as any)
      ? (inputs.category as (typeof EXPENSE_CATEGORY_VALUES)[number])
      : ('supplies' as const)

    const expense = await createExpense({
      description: inputs.description,
      amount_cents: inputs.amountCents,
      category: validCategory,
      event_id: inputs.eventId,
      expense_date: inputs.date || new Date().toISOString().split('T')[0],
      vendor_name: inputs.vendor,
      payment_method: 'cash',
    })

    const user = await requireChef()
    broadcastInsert('expenses', user.tenantId!, expense)
    revalidatePath('/finance')

    return writeResult('expense.create', 2, {
      expenseId: (expense as any).id,
      amount: `$${(inputs.amountCents / 100).toFixed(2)}`,
      description: inputs.description,
    })
  } catch (err) {
    return writeError(
      'expense.create',
      2,
      err instanceof Error ? err.message : 'Failed to create expense'
    )
  }
}

// ─── Staff Writes ──────────────────────────────────────────────────────────

export async function remyCreateStaff(inputs: {
  name: string
  role:
    | 'sous_chef'
    | 'kitchen_assistant'
    | 'service_staff'
    | 'server'
    | 'bartender'
    | 'dishwasher'
    | 'other'
  phone?: string
  email?: string
  hourlyRateCents?: number
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const { createStaffMember } = await import('@/lib/staff/actions')
    const user = await requireChef()

    const staff = await createStaffMember({
      name: inputs.name,
      role: inputs.role,
      ...(inputs.phone ? { phone: inputs.phone } : {}),
      ...(inputs.email ? { email: inputs.email } : {}),
      hourly_rate_cents: inputs.hourlyRateCents || 0,
      ...(inputs.notes ? { notes: inputs.notes } : {}),
    })

    broadcastInsert('staff_members', user.tenantId!, staff)
    revalidatePath('/staff')

    return writeResult('staff.create', 2, {
      staffId: (staff as any).id,
      name: inputs.name,
      role: inputs.role,
    })
  } catch (err) {
    return writeError(
      'staff.create',
      2,
      err instanceof Error ? err.message : 'Failed to create staff member'
    )
  }
}

export async function remyAssignStaff(inputs: {
  eventId: string
  staffMemberId: string
  roleOverride?: string
  scheduledHours?: number
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const { assignStaffToEvent } = await import('@/lib/staff/actions')
    const user = await requireChef()

    const assignment = await assignStaffToEvent({
      event_id: inputs.eventId,
      staff_member_id: inputs.staffMemberId,
      ...(inputs.roleOverride ? { role_override: inputs.roleOverride as any } : {}),
      ...(inputs.scheduledHours ? { scheduled_hours: inputs.scheduledHours } : {}),
      ...(inputs.notes ? { notes: inputs.notes } : {}),
    })

    broadcastInsert('event_staff_assignments', user.tenantId!, assignment)
    revalidatePath('/staff')
    revalidatePath(`/events/${inputs.eventId}`)

    return writeResult('staff.assign', 2, {
      assignmentId: (assignment as any)?.id,
      eventId: inputs.eventId,
      staffMemberId: inputs.staffMemberId,
    })
  } catch (err) {
    return writeError(
      'staff.assign',
      2,
      err instanceof Error ? err.message : 'Failed to assign staff'
    )
  }
}

export async function remyRecordStaffHours(inputs: {
  assignmentId: string
  actualHours: number
}): Promise<RemyWriteResult> {
  try {
    const { recordStaffHours } = await import('@/lib/staff/actions')

    await recordStaffHours({
      assignment_id: inputs.assignmentId,
      actual_hours: inputs.actualHours,
    })

    return writeResult('staff.record_hours', 2, {
      assignmentId: inputs.assignmentId,
      hours: inputs.actualHours,
    })
  } catch (err) {
    return writeError(
      'staff.record_hours',
      2,
      err instanceof Error ? err.message : 'Failed to record hours'
    )
  }
}

// ─── Quote Writes ──────────────────────────────────────────────────────────

export async function remyCreateQuote(inputs: {
  clientId: string
  eventId?: string
  pricingModel: 'per_person' | 'flat_rate' | 'custom'
  totalQuotedCents: number
  pricePerPersonCents?: number
  guestCount?: number
  depositRequired?: boolean
  depositAmountCents?: number
  depositPercentage?: number
  validUntil?: string
  pricingNotes?: string
}): Promise<RemyWriteResult> {
  try {
    const { createQuote } = await import('@/lib/quotes/actions')
    const user = await requireChef()

    const result = await createQuote({
      client_id: inputs.clientId,
      pricing_model: inputs.pricingModel,
      total_quoted_cents: inputs.totalQuotedCents,
      ...(inputs.eventId ? { event_id: inputs.eventId } : {}),
      ...(inputs.pricePerPersonCents ? { price_per_person_cents: inputs.pricePerPersonCents } : {}),
      ...(inputs.guestCount ? { guest_count_estimated: inputs.guestCount } : {}),
      ...(inputs.depositRequired !== undefined ? { deposit_required: inputs.depositRequired } : {}),
      ...(inputs.depositAmountCents ? { deposit_amount_cents: inputs.depositAmountCents } : {}),
      ...(inputs.depositPercentage ? { deposit_percentage: inputs.depositPercentage } : {}),
      ...(inputs.validUntil ? { valid_until: inputs.validUntil } : {}),
      ...(inputs.pricingNotes ? { pricing_notes: inputs.pricingNotes } : {}),
    })

    broadcastInsert('quotes', user.tenantId!, (result as any)?.quote)
    revalidatePath('/finance')
    revalidatePath('/quotes')

    return writeResult('quote.create', 3, {
      quoteId: (result as any)?.quote?.id,
      total: `$${(inputs.totalQuotedCents / 100).toFixed(2)}`,
      model: inputs.pricingModel,
    })
  } catch (err) {
    return writeError(
      'quote.create',
      3,
      err instanceof Error ? err.message : 'Failed to create quote'
    )
  }
}

export async function remyTransitionQuote(inputs: {
  quoteId: string
  newStatus: 'sent' | 'accepted' | 'rejected' | 'expired'
}): Promise<RemyWriteResult> {
  try {
    const { transitionQuote } = await import('@/lib/quotes/actions')
    const user = await requireChef()

    await transitionQuote(inputs.quoteId, inputs.newStatus as any)

    broadcastUpdate('quotes', user.tenantId!, { id: inputs.quoteId, status: inputs.newStatus })
    revalidatePath('/finance')
    revalidatePath('/quotes')

    return writeResult('quote.transition', 3, {
      quoteId: inputs.quoteId,
      newStatus: inputs.newStatus,
    })
  } catch (err) {
    return writeError(
      'quote.transition',
      3,
      err instanceof Error ? err.message : 'Failed to transition quote'
    )
  }
}

// ─── Contract Writes ───────────────────────────────────────────────────────

export async function remyGenerateContract(inputs: {
  eventId: string
  templateId?: string
}): Promise<RemyWriteResult> {
  try {
    const { generateEventContract } = await import('@/lib/contracts/actions')
    const user = await requireChef()

    const contract = await generateEventContract(inputs.eventId, inputs.templateId)

    broadcastInsert('event_contracts', user.tenantId!, contract)
    revalidatePath(`/events/${inputs.eventId}`)

    return writeResult(
      'contract.generate',
      3,
      {
        contractId: (contract as any)?.id,
        eventId: inputs.eventId,
      },
      `/events/${inputs.eventId}`
    )
  } catch (err) {
    return writeError(
      'contract.generate',
      3,
      err instanceof Error ? err.message : 'Failed to generate contract'
    )
  }
}

// ─── Prep Writes ───────────────────────────────────────────────────────────

export async function remyCreatePrepBlock(inputs: {
  title: string
  blockDate: string
  blockType: string
  eventId?: string
  startTime?: string
  endTime?: string
  notes?: string
  storeName?: string
  estimatedDurationMinutes?: number
}): Promise<RemyWriteResult> {
  try {
    const { createPrepBlock } = await import('@/lib/scheduling/prep-block-actions')
    const user = await requireChef()

    const result = await createPrepBlock({
      title: inputs.title,
      block_date: inputs.blockDate,
      block_type: inputs.blockType as any,
      ...(inputs.eventId ? { event_id: inputs.eventId } : {}),
      ...(inputs.startTime ? { start_time: inputs.startTime } : {}),
      ...(inputs.endTime ? { end_time: inputs.endTime } : {}),
      ...(inputs.notes ? { notes: inputs.notes } : {}),
      ...(inputs.storeName ? { store_name: inputs.storeName } : {}),
      ...(inputs.estimatedDurationMinutes
        ? { estimated_duration_minutes: inputs.estimatedDurationMinutes }
        : {}),
    })

    if (!result.success) {
      const msg =
        result.conflicts && result.conflicts.length > 0
          ? `Conflict: ${result.conflicts.map((c) => c.blockTitle || 'existing block').join(', ')}`
          : result.error || 'Failed to create prep block'
      return writeError('prep.create_block', 2, msg)
    }

    broadcastInsert('event_prep_blocks', user.tenantId!, result.block)
    revalidatePath('/schedule')
    revalidatePath('/dashboard')

    return writeResult('prep.create_block', 2, {
      blockId: (result.block as any)?.id,
      title: inputs.title,
      date: inputs.blockDate,
    })
  } catch (err) {
    return writeError(
      'prep.create_block',
      2,
      err instanceof Error ? err.message : 'Failed to create prep block'
    )
  }
}

export async function remyCompletePrepBlock(inputs: { blockId: string }): Promise<RemyWriteResult> {
  try {
    const { completePrepBlock } = await import('@/lib/scheduling/prep-block-actions')

    const result = await completePrepBlock(inputs.blockId)

    if (!result.success) {
      return writeError('prep.complete_block', 1, result.error || 'Failed to complete prep block')
    }

    return writeResult('prep.complete_block', 1, { blockId: inputs.blockId })
  } catch (err) {
    return writeError(
      'prep.complete_block',
      1,
      err instanceof Error ? err.message : 'Failed to complete prep block'
    )
  }
}

export async function remyTogglePrepItem(inputs: {
  eventId: string
  itemKey: string
  completed: boolean
}): Promise<RemyWriteResult> {
  try {
    const { togglePrepCompletion } = await import('@/lib/prep-timeline/actions')

    await togglePrepCompletion(inputs.eventId, inputs.itemKey, inputs.completed)

    return writeResult('prep.toggle_item', 1, {
      eventId: inputs.eventId,
      item: inputs.itemKey,
      completed: inputs.completed,
    })
  } catch (err) {
    return writeError(
      'prep.toggle_item',
      1,
      err instanceof Error ? err.message : 'Failed to toggle prep item'
    )
  }
}

// ─── Packing Writes ────────────────────────────────────────────────────────

export async function remyMarkCarPacked(inputs: { eventId: string }): Promise<RemyWriteResult> {
  try {
    const { markCarPacked } = await import('@/lib/packing/actions')
    const user = await requireChef()

    const result = await markCarPacked(inputs.eventId)

    if (!result.success) {
      return writeError('packing.mark_packed', 1, result.error || 'Failed to mark car packed')
    }

    broadcastUpdate('events', user.tenantId!, { id: inputs.eventId, car_packed: true })
    revalidatePath(`/events/${inputs.eventId}`)

    return writeResult('packing.mark_packed', 1, { eventId: inputs.eventId })
  } catch (err) {
    return writeError(
      'packing.mark_packed',
      1,
      err instanceof Error ? err.message : 'Failed to mark car packed'
    )
  }
}

// ─── Equipment Writes ──────────────────────────────────────────────────────

export async function remyCreateEquipment(inputs: {
  name: string
  category?:
    | 'cookware'
    | 'knives'
    | 'smallwares'
    | 'appliances'
    | 'serving'
    | 'transport'
    | 'linen'
    | 'other'
  purchasePriceCents?: number
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const { createEquipmentItem } = await import('@/lib/equipment/actions')
    const user = await requireChef()

    const equipment = await createEquipmentItem({
      name: inputs.name,
      category: inputs.category || 'other',
      ...(inputs.purchasePriceCents ? { purchase_price_cents: inputs.purchasePriceCents } : {}),
      ...(inputs.notes ? { notes: inputs.notes } : {}),
    })

    broadcastInsert('equipment_items', user.tenantId!, equipment)
    revalidatePath('/equipment')

    return writeResult('equipment.create', 2, {
      equipmentId: (equipment as any)?.id,
      name: inputs.name,
      category: inputs.category || 'other',
    })
  } catch (err) {
    return writeError(
      'equipment.create',
      2,
      err instanceof Error ? err.message : 'Failed to create equipment'
    )
  }
}

export async function remyLogMaintenance(inputs: {
  equipmentId: string
  notes?: string
}): Promise<RemyWriteResult> {
  try {
    const { logMaintenance } = await import('@/lib/equipment/actions')

    await logMaintenance(inputs.equipmentId, inputs.notes)

    return writeResult('equipment.log_maintenance', 1, {
      equipmentId: inputs.equipmentId,
    })
  } catch (err) {
    return writeError(
      'equipment.log_maintenance',
      1,
      err instanceof Error ? err.message : 'Failed to log maintenance'
    )
  }
}

// ─── Command Registry ──────────────────────────────────────────────────────
// Maps command strings to write functions for the brain dump pipeline

export const REMY_WRITE_REGISTRY: Record<
  string,
  {
    fn: (inputs: any) => Promise<RemyWriteResult>
    tier: ApprovalTier
    description: string
    category: string
  }
> = {
  'event.create': {
    fn: remyCreateEvent,
    tier: 2,
    description: 'Create a new event',
    category: 'events',
  },
  'event.update': {
    fn: remyUpdateEvent,
    tier: 2,
    description: 'Update event details',
    category: 'events',
  },
  'client.create': {
    fn: remyCreateClient,
    tier: 2,
    description: 'Create a new client',
    category: 'clients',
  },
  'client.update': {
    fn: remyUpdateClient,
    tier: 2,
    description: 'Update client info',
    category: 'clients',
  },
  'todo.create': {
    fn: remyCreateTask,
    tier: 1,
    description: 'Create a task',
    category: 'tasks',
  },
  'todo.complete': {
    fn: remyCompleteTask,
    tier: 1,
    description: 'Complete a task',
    category: 'tasks',
  },
  'menu.create': {
    fn: remyCreateMenu,
    tier: 2,
    description: 'Create a menu',
    category: 'menus',
  },
  'menu.add_dish': {
    fn: remyAddDishToMenu,
    tier: 2,
    description: 'Add dish to menu',
    category: 'menus',
  },
  'memory.save': {
    fn: remySaveNote,
    tier: 1,
    description: 'Save a note/memory',
    category: 'notes',
  },
  'expense.create': {
    fn: remyCreateExpense,
    tier: 2,
    description: 'Log an expense',
    category: 'finance',
  },
  'event.transition': {
    fn: remyTransitionEvent,
    tier: 3,
    description: 'Change event status',
    category: 'events',
  },
  'staff.create': {
    fn: remyCreateStaff,
    tier: 2,
    description: 'Add a staff member',
    category: 'staff',
  },
  'staff.assign': {
    fn: remyAssignStaff,
    tier: 2,
    description: 'Assign staff to event',
    category: 'staff',
  },
  'staff.record_hours': {
    fn: remyRecordStaffHours,
    tier: 2,
    description: 'Record staff hours worked',
    category: 'staff',
  },
  'quote.create': {
    fn: remyCreateQuote,
    tier: 3,
    description: 'Create a quote',
    category: 'finance',
  },
  'quote.transition': {
    fn: remyTransitionQuote,
    tier: 3,
    description: 'Send/accept/reject quote',
    category: 'finance',
  },
  'contract.generate': {
    fn: remyGenerateContract,
    tier: 3,
    description: 'Generate event contract',
    category: 'contracts',
  },
  'prep.create_block': {
    fn: remyCreatePrepBlock,
    tier: 2,
    description: 'Schedule a prep block',
    category: 'prep',
  },
  'prep.complete_block': {
    fn: remyCompletePrepBlock,
    tier: 1,
    description: 'Complete a prep block',
    category: 'prep',
  },
  'prep.toggle_item': {
    fn: remyTogglePrepItem,
    tier: 1,
    description: 'Check off a prep item',
    category: 'prep',
  },
  'packing.mark_packed': {
    fn: remyMarkCarPacked,
    tier: 1,
    description: 'Mark car as packed',
    category: 'packing',
  },
  'equipment.create': {
    fn: remyCreateEquipment,
    tier: 2,
    description: 'Add equipment to inventory',
    category: 'equipment',
  },
  'equipment.log_maintenance': {
    fn: remyLogMaintenance,
    tier: 1,
    description: 'Log equipment maintenance',
    category: 'equipment',
  },
}
