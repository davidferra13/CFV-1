'use server'

// Service Playbooks - Server Actions
// Create, manage, and apply reusable event templates

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import { duplicateMenu } from '@/lib/menus/actions'
import type {
  ServicePlaybook,
  PlaybookApplication,
  PlaybookSummary,
} from './playbook-types'

const TABLE = 'service_playbooks'

// ---------------------------------------------------------------------------
// 1. createPlaybook - create from scratch or extract from a past event
// ---------------------------------------------------------------------------

export async function createPlaybook(
  name: string,
  description: string,
  sourceEventId?: string,
): Promise<ServicePlaybook> {
  const user = await requireChef()
  const db: any = createServerClient()

  let menuTemplateId: string | null = null
  let prepTimelineTemplate: Record<string, unknown> = {}
  let equipmentChecklist: unknown[] = []
  let serviceStyle: string | null = null
  let serviceNotes: string | null = null
  let guestCountMin: number | null = null
  let guestCountMax: number | null = null

  // Extract configuration from an existing event
  if (sourceEventId) {
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('*')
      .eq('id', sourceEventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (eventErr || !event) {
      throw new UnknownAppError('Source event not found')
    }

    serviceStyle = event.service_style ?? null
    serviceNotes = event.notes ?? null
    guestCountMin = event.guest_count ?? null
    guestCountMax = event.guest_count ?? null

    // Grab the event's menu if one exists
    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', sourceEventId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null)
      .limit(1)

    if (menus && menus.length > 0) {
      // Duplicate menu as a template for the playbook
      const dupeResult = await duplicateMenu(menus[0].id, 'playbook_extraction')
      menuTemplateId = dupeResult.menu.id

      // Mark the duplicated menu as a template
      await db
        .from('menus')
        .update({ is_template: true, name: `${name} - Menu Template` })
        .eq('id', menuTemplateId)
        .eq('tenant_id', user.tenantId!)
    }

    // Extract equipment checklist from event_safety_checklists (EQ_ prefixed items)
    const { data: safetyRows } = await db
      .from('event_safety_checklists')
      .select('items')
      .eq('event_id', sourceEventId)
      .eq('tenant_id', user.tenantId!)
      .limit(1)

    if (safetyRows && safetyRows.length > 0 && Array.isArray(safetyRows[0].items)) {
      equipmentChecklist = (safetyRows[0].items as any[])
        .filter((item: any) => typeof item.key === 'string' && item.key.startsWith('EQ_'))
        .map((item: any) => ({
          name: item._eq_name ?? item.label ?? '',
          quantity: 1,
          notes: item._eq_notes ?? null,
        }))
    }

    // Extract prep timeline if available
    const { data: prepRows } = await db
      .from('event_prep_timelines')
      .select('*')
      .eq('event_id', sourceEventId)
      .eq('tenant_id', user.tenantId!)

    if (prepRows && prepRows.length > 0) {
      prepTimelineTemplate = {
        items: prepRows.map((row: any) => ({
          task: row.task,
          day_offset: row.day_offset,
          time_of_day: row.time_of_day,
          duration_minutes: row.duration_minutes,
          station: row.station,
          notes: row.notes,
        })),
      }
    }
  }

  const { data, error } = await db
    .from(TABLE)
    .insert({
      tenant_id: user.tenantId!,
      name,
      description: description || null,
      service_style: serviceStyle,
      guest_count_min: guestCountMin,
      guest_count_max: guestCountMax,
      menu_template_id: menuTemplateId,
      prep_timeline_template: prepTimelineTemplate,
      equipment_checklist: equipmentChecklist,
      service_notes: serviceNotes,
      tags: [],
      times_used: 0,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[createPlaybook] Insert failed:', error)
    throw new UnknownAppError('Failed to create playbook')
  }

  revalidatePath('/dashboard')
  return data as ServicePlaybook
}

// ---------------------------------------------------------------------------
// 2. getPlaybooks - list all playbooks for the chef
// ---------------------------------------------------------------------------

export async function getPlaybooks(
  tags?: string[],
): Promise<PlaybookSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(TABLE)
    .select('id, name, service_style, guest_count_min, guest_count_max, times_used, tags')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (tags && tags.length > 0) {
    // Filter playbooks that contain any of the requested tags
    query = query.overlaps('tags', tags)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getPlaybooks] Query failed:', error)
    throw new UnknownAppError('Failed to fetch playbooks')
  }

  return (data ?? []) as PlaybookSummary[]
}

// ---------------------------------------------------------------------------
// 3. getPlaybookDetail - full playbook with all config
// ---------------------------------------------------------------------------

export async function getPlaybookDetail(
  playbookId: string,
): Promise<ServicePlaybook | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', playbookId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .single()

  if (error) {
    // .single() returns error when no rows found
    return null
  }

  return data as ServicePlaybook
}

// ---------------------------------------------------------------------------
// 4. applyPlaybookToEvent - apply playbook to a new event
// ---------------------------------------------------------------------------

export async function applyPlaybookToEvent(
  playbookId: string,
  eventId: string,
): Promise<PlaybookApplication> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch playbook
  const playbook = await getPlaybookDetail(playbookId)
  if (!playbook) {
    throw new UnknownAppError('Playbook not found')
  }

  // Verify event belongs to this chef
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found')
  }

  const result: PlaybookApplication = {
    playbook_id: playbookId,
    event_id: eventId,
    menu_copied: false,
    new_menu_id: null,
    equipment_copied: false,
    prep_timeline_copied: false,
    service_notes_copied: false,
    adjustments_needed: [],
  }

  // Copy menu template if playbook has one
  if (playbook.menu_template_id) {
    try {
      const dupeResult = await duplicateMenu(
        playbook.menu_template_id,
        'playbook_application',
      )
      const newMenuId = dupeResult.menu.id

      // Attach duplicated menu to the target event
      await db
        .from('menus')
        .update({
          event_id: eventId,
          is_template: false,
          name: dupeResult.menu.name.replace(' (Copy)', ''),
        })
        .eq('id', newMenuId)
        .eq('tenant_id', user.tenantId!)

      result.menu_copied = true
      result.new_menu_id = newMenuId
    } catch (e) {
      console.error('[applyPlaybookToEvent] Menu copy failed:', e)
      result.adjustments_needed.push('Menu template could not be copied; add menu manually')
    }
  }

  // Copy equipment checklist to event_safety_checklists
  if (playbook.equipment_checklist && playbook.equipment_checklist.length > 0) {
    try {
      const eqItems = playbook.equipment_checklist.map((item, idx) => ({
        key: `EQ_playbook_${idx}`,
        label: item.name,
        completed: false,
        completed_at: null,
        _eq_id: `playbook_${idx}`,
        _eq_name: item.name,
        _eq_has_backup: false,
        _eq_notes: item.notes ?? '',
      }))

      // Check if safety checklist already exists for this event
      const { data: existing } = await db
        .from('event_safety_checklists')
        .select('id, items')
        .eq('event_id', eventId)
        .eq('tenant_id', user.tenantId!)
        .limit(1)

      if (existing && existing.length > 0) {
        // Append equipment items to existing checklist
        const currentItems = Array.isArray(existing[0].items) ? existing[0].items : []
        const merged = [...currentItems, ...eqItems]
        await db
          .from('event_safety_checklists')
          .update({ items: merged })
          .eq('id', existing[0].id)
          .eq('tenant_id', user.tenantId!)
      } else {
        await db.from('event_safety_checklists').insert({
          tenant_id: user.tenantId!,
          event_id: eventId,
          items: eqItems,
        })
      }

      result.equipment_copied = true
    } catch (e) {
      console.error('[applyPlaybookToEvent] Equipment copy failed:', e)
      result.adjustments_needed.push('Equipment checklist could not be copied')
    }
  }

  // Copy prep timeline template
  if (
    playbook.prep_timeline_template &&
    typeof playbook.prep_timeline_template === 'object' &&
    Array.isArray((playbook.prep_timeline_template as any).items) &&
    (playbook.prep_timeline_template as any).items.length > 0
  ) {
    try {
      const items = (playbook.prep_timeline_template as any).items as any[]
      for (const item of items) {
        await db.from('event_prep_timelines').insert({
          tenant_id: user.tenantId!,
          event_id: eventId,
          task: item.task,
          day_offset: item.day_offset ?? 0,
          time_of_day: item.time_of_day ?? null,
          duration_minutes: item.duration_minutes ?? null,
          station: item.station ?? null,
          notes: item.notes ?? null,
        })
      }
      result.prep_timeline_copied = true
    } catch (e) {
      console.error('[applyPlaybookToEvent] Prep timeline copy failed:', e)
      result.adjustments_needed.push('Prep timeline could not be copied')
    }
  }

  // Copy service notes to event if the event has no notes
  if (playbook.service_notes) {
    const { data: currentEvent } = await db
      .from('events')
      .select('notes')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!currentEvent?.notes) {
      await db
        .from('events')
        .update({ notes: playbook.service_notes })
        .eq('id', eventId)
        .eq('tenant_id', user.tenantId!)
      result.service_notes_copied = true
    } else {
      result.adjustments_needed.push(
        'Event already has notes; playbook service notes were not applied',
      )
    }
  }

  // Increment usage counter
  await db
    .from(TABLE)
    .update({
      times_used: playbook.times_used + 1,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', playbookId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/dashboard')
  revalidatePath(`/events/${eventId}`)
  return result
}

// ---------------------------------------------------------------------------
// 5. updatePlaybook - edit playbook fields
// ---------------------------------------------------------------------------

export async function updatePlaybook(
  playbookId: string,
  updates: Partial<
    Pick<
      ServicePlaybook,
      | 'name'
      | 'description'
      | 'service_style'
      | 'guest_count_min'
      | 'guest_count_max'
      | 'prep_timeline_template'
      | 'equipment_checklist'
      | 'service_notes'
      | 'tags'
    >
  >,
): Promise<ServicePlaybook> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const existing = await getPlaybookDetail(playbookId)
  if (!existing) {
    throw new UnknownAppError('Playbook not found')
  }

  const { data, error } = await db
    .from(TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playbookId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error || !data) {
    console.error('[updatePlaybook] Update failed:', error)
    throw new UnknownAppError('Failed to update playbook')
  }

  revalidatePath('/dashboard')
  return data as ServicePlaybook
}

// ---------------------------------------------------------------------------
// 6. deletePlaybook - soft delete
// ---------------------------------------------------------------------------

export async function deletePlaybook(playbookId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const existing = await getPlaybookDetail(playbookId)
  if (!existing) {
    throw new UnknownAppError('Playbook not found')
  }

  const { error } = await db
    .from(TABLE)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', playbookId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deletePlaybook] Soft delete failed:', error)
    throw new UnknownAppError('Failed to delete playbook')
  }

  revalidatePath('/dashboard')
}
