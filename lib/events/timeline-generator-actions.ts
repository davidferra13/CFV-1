'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidatePath } from 'next/cache'
import type {
  EventTimeline,
  TimelineBlock,
  TimelineGenerationInput,
  AddBlockInput,
  UpdateBlockInput,
  BlockType,
} from './timeline-generator-types'
import { BLOCK_TYPES } from './timeline-generator-types'
import {
  estimateFullDay,
  subtractMinutes,
  addMinutes,
  TIMELINE_DEFAULTS,
} from './timeline-estimator'

// ── Generate Event Timeline ──────────────────────────────────────────────────

/**
 * Auto-generate a day-of timeline from service time, working backward.
 * Uses event menu data (courses, guest count) to estimate timing.
 * Idempotent: regenerating replaces existing draft timeline blocks.
 */
export async function generateEventTimeline(
  input: TimelineGenerationInput
): Promise<EventTimeline> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { eventId, serviceTime, travelMinutes, setupMinutes, cleanupMinutes } = input

  // Verify event ownership
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, guest_count, title')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found', { code: 'TIMELINE_EVENT_NOT_FOUND' })
  }

  // Fetch menu courses for this event
  const courses = await fetchEventCourses(db, eventId, tenantId)
  const guestCount = event.guest_count || 10

  // Estimate full day timing
  const estimation = estimateFullDay({
    courses,
    guestCount,
    travelMinutes: travelMinutes ?? 0,
    setupMinutes,
    cleanupMinutes,
  })

  const serviceDate = new Date(serviceTime)
  const effectiveSetup = setupMinutes ?? TIMELINE_DEFAULTS.SETUP_MINUTES
  const effectiveCleanup = cleanupMinutes ?? TIMELINE_DEFAULTS.CLEANUP_MINUTES

  // Check for existing timeline (idempotent: replace draft, block finalized)
  const { data: existing } = await db
    .from('event_timelines')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (existing && existing.status !== 'draft') {
    throw new UnknownAppError(
      'Cannot regenerate a finalized or in-progress timeline. Reset to draft first.',
      { code: 'TIMELINE_NOT_DRAFT' }
    )
  }

  let timelineId: string

  if (existing) {
    // Delete old blocks, update timeline
    await db.from('timeline_blocks').delete().eq('timeline_id', existing.id)
    const { data: updated, error: updateErr } = await db
      .from('event_timelines')
      .update({
        service_time: serviceTime,
        generated_at: new Date().toISOString(),
        status: 'draft',
        travel_minutes: travelMinutes ?? null,
        setup_minutes: effectiveSetup,
        cleanup_minutes: effectiveCleanup,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateErr) {
      throw new UnknownAppError('Failed to update timeline', { code: 'TIMELINE_UPDATE_FAILED' })
    }
    timelineId = updated.id
  } else {
    // Create new timeline
    const { data: timeline, error: createErr } = await db
      .from('event_timelines')
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        service_time: serviceTime,
        generated_at: new Date().toISOString(),
        status: 'draft',
        travel_minutes: travelMinutes ?? null,
        setup_minutes: effectiveSetup,
        cleanup_minutes: effectiveCleanup,
      })
      .select()
      .single()

    if (createErr) {
      throw new UnknownAppError('Failed to create timeline', { code: 'TIMELINE_CREATE_FAILED' })
    }
    timelineId = timeline.id
  }

  // ── Build blocks working backward from service time ──────────────────────

  const blocks: Array<{
    timeline_id: string
    block_type: BlockType
    label: string
    start_time: string
    end_time: string
    duration_minutes: number
    sequence: number
    notes: string | null
    course_number: number | null
    is_parallel: boolean
  }> = []

  let sequence = 0

  // 1. Travel to venue (if travel time provided)
  if (travelMinutes && travelMinutes > 0) {
    const arriveTime = subtractMinutes(serviceDate, estimation.totalPrepMinutes + estimation.courseEstimates[0]?.fireMinutes + (estimation.courseEstimates[0]?.plateMinutes ?? 0) + effectiveSetup)
    const departTime = subtractMinutes(arriveTime, estimation.travelWithBuffers)

    blocks.push({
      timeline_id: timelineId,
      block_type: 'travel',
      label: 'Depart for venue',
      start_time: departTime.toISOString(),
      end_time: arriveTime.toISOString(),
      duration_minutes: estimation.travelWithBuffers,
      sequence: sequence++,
      notes: travelMinutes >= TIMELINE_DEFAULTS.TRAFFIC_BUFFER_THRESHOLD
        ? `${travelMinutes} min drive + ${TIMELINE_DEFAULTS.TRAFFIC_BUFFER_MINUTES} min traffic buffer + ${TIMELINE_DEFAULTS.ARRIVAL_BUFFER_MINUTES} min arrival buffer`
        : `${travelMinutes} min drive + ${TIMELINE_DEFAULTS.ARRIVAL_BUFFER_MINUTES} min arrival buffer`,
      course_number: null,
      is_parallel: false,
    })
  }

  // 2. Setup
  const firstCourseFire = estimation.courseEstimates[0]
    ? estimation.courseEstimates[0].fireMinutes + estimation.courseEstimates[0].plateMinutes
    : 0
  const prepStartTime = subtractMinutes(serviceDate, estimation.totalPrepMinutes + firstCourseFire)
  const setupStartTime = subtractMinutes(prepStartTime, effectiveSetup)

  blocks.push({
    timeline_id: timelineId,
    block_type: 'setup',
    label: 'Unload and setup',
    start_time: setupStartTime.toISOString(),
    end_time: prepStartTime.toISOString(),
    duration_minutes: effectiveSetup,
    sequence: sequence++,
    notes: null,
    course_number: null,
    is_parallel: false,
  })

  // 3. Prep blocks per course
  let prepCursor = new Date(prepStartTime)
  for (const course of estimation.courseEstimates) {
    const prepEnd = addMinutes(prepCursor, course.prepMinutes)
    blocks.push({
      timeline_id: timelineId,
      block_type: 'prep',
      label: `Prep: ${course.courseName}`,
      start_time: prepCursor.toISOString(),
      end_time: prepEnd.toISOString(),
      duration_minutes: course.prepMinutes,
      sequence: sequence++,
      notes: null,
      course_number: course.courseNumber,
      is_parallel: false,
    })

    // Variant prep (parallel)
    if (course.variantCount > 0 && course.variantExtraMinutes > 0) {
      const variantEnd = addMinutes(prepCursor, course.variantExtraMinutes)
      blocks.push({
        timeline_id: timelineId,
        block_type: 'prep',
        label: `Variant prep: ${course.courseName} (${course.variantCount} variant${course.variantCount > 1 ? 's' : ''})`,
        start_time: prepCursor.toISOString(),
        end_time: variantEnd.toISOString(),
        duration_minutes: course.variantExtraMinutes,
        sequence: sequence++,
        notes: 'Parallel with main course prep',
        course_number: course.courseNumber,
        is_parallel: true,
      })
    }

    prepCursor = prepEnd
  }

  // 4. Fire, plate, serve blocks per course (forward from service time anchor)
  let serviceCursor = new Date(serviceDate)
  // Work backward for first course fire/plate
  const firstCourse = estimation.courseEstimates[0]
  if (firstCourse) {
    serviceCursor = subtractMinutes(serviceDate, firstCourse.fireMinutes + firstCourse.plateMinutes)
  }

  for (let i = 0; i < estimation.courseEstimates.length; i++) {
    const course = estimation.courseEstimates[i]

    // Fire
    const fireEnd = addMinutes(serviceCursor, course.fireMinutes)
    blocks.push({
      timeline_id: timelineId,
      block_type: 'fire',
      label: `Fire: ${course.courseName}`,
      start_time: serviceCursor.toISOString(),
      end_time: fireEnd.toISOString(),
      duration_minutes: course.fireMinutes,
      sequence: sequence++,
      notes: null,
      course_number: course.courseNumber,
      is_parallel: false,
    })

    // Plate
    const plateEnd = addMinutes(fireEnd, course.plateMinutes)
    blocks.push({
      timeline_id: timelineId,
      block_type: 'plate',
      label: `Plate: ${course.courseName}`,
      start_time: fireEnd.toISOString(),
      end_time: plateEnd.toISOString(),
      duration_minutes: course.plateMinutes,
      sequence: sequence++,
      notes: null,
      course_number: course.courseNumber,
      is_parallel: false,
    })

    // Serve
    const serveEnd = addMinutes(plateEnd, 5) // brief serve window
    blocks.push({
      timeline_id: timelineId,
      block_type: 'serve',
      label: `Serve: ${course.courseName}`,
      start_time: plateEnd.toISOString(),
      end_time: serveEnd.toISOString(),
      duration_minutes: 5,
      sequence: sequence++,
      notes: i === 0 ? 'FIRST COURSE SERVED (anchor)' : null,
      course_number: course.courseNumber,
      is_parallel: false,
    })

    // Gap between courses (except after last)
    if (i < estimation.courseEstimates.length - 1) {
      serviceCursor = addMinutes(serveEnd, TIMELINE_DEFAULTS.BETWEEN_COURSES_MINUTES)
    } else {
      serviceCursor = serveEnd
    }
  }

  // 5. Cleanup
  const cleanupEnd = addMinutes(serviceCursor, effectiveCleanup)
  blocks.push({
    timeline_id: timelineId,
    block_type: 'cleanup',
    label: 'Cleanup and pack',
    start_time: serviceCursor.toISOString(),
    end_time: cleanupEnd.toISOString(),
    duration_minutes: effectiveCleanup,
    sequence: sequence++,
    notes: null,
    course_number: null,
    is_parallel: false,
  })

  // 6. Return travel (if applicable)
  if (travelMinutes && travelMinutes > 0) {
    const returnEnd = addMinutes(cleanupEnd, estimation.travelWithBuffers)
    blocks.push({
      timeline_id: timelineId,
      block_type: 'travel',
      label: 'Return home',
      start_time: cleanupEnd.toISOString(),
      end_time: returnEnd.toISOString(),
      duration_minutes: estimation.travelWithBuffers,
      sequence: sequence++,
      notes: null,
      course_number: null,
      is_parallel: false,
    })
  }

  // Insert all blocks
  if (blocks.length > 0) {
    const { error: blockErr } = await db.from('timeline_blocks').insert(blocks)
    if (blockErr) {
      throw new UnknownAppError('Failed to create timeline blocks', {
        code: 'TIMELINE_BLOCKS_CREATE_FAILED',
      })
    }
  }

  revalidatePath(`/events/${eventId}`)
  return getEventTimeline(eventId) as Promise<EventTimeline>
}

// ── Get Event Timeline ───────────────────────────────────────────────────────

export async function getEventTimeline(
  eventId: string
): Promise<EventTimeline | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: timeline, error } = await db
    .from('event_timelines')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !timeline) return null

  const { data: blocks } = await db
    .from('timeline_blocks')
    .select('*')
    .eq('timeline_id', timeline.id)
    .order('sequence', { ascending: true })

  return {
    ...timeline,
    blocks: blocks || [],
  } as EventTimeline
}

// ── Update Timeline Block ────────────────────────────────────────────────────

export async function updateTimelineBlock(
  blockId: string,
  updates: UpdateBlockInput
): Promise<TimelineBlock> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify ownership through timeline -> event -> tenant chain
  const { data: block } = await db
    .from('timeline_blocks')
    .select('id, timeline_id')
    .eq('id', blockId)
    .single()

  if (!block) {
    throw new UnknownAppError('Timeline block not found', { code: 'TIMELINE_BLOCK_NOT_FOUND' })
  }

  const { data: timeline } = await db
    .from('event_timelines')
    .select('id, tenant_id, event_id')
    .eq('id', block.timeline_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!timeline) {
    throw new UnknownAppError('Timeline not found or access denied', {
      code: 'TIMELINE_ACCESS_DENIED',
    })
  }

  // Build update payload (only provided fields)
  const payload: Record<string, unknown> = {}
  if (updates.label !== undefined) payload.label = updates.label
  if (updates.start_time !== undefined) payload.start_time = updates.start_time
  if (updates.end_time !== undefined) payload.end_time = updates.end_time
  if (updates.duration_minutes !== undefined) payload.duration_minutes = updates.duration_minutes
  if (updates.notes !== undefined) payload.notes = updates.notes
  if (updates.sequence !== undefined) payload.sequence = updates.sequence

  if (Object.keys(payload).length === 0) {
    throw new UnknownAppError('No updates provided', { code: 'TIMELINE_BLOCK_NO_UPDATES' })
  }

  const { data: updated, error: updateErr } = await db
    .from('timeline_blocks')
    .update(payload)
    .eq('id', blockId)
    .select()
    .single()

  if (updateErr) {
    throw new UnknownAppError('Failed to update timeline block', {
      code: 'TIMELINE_BLOCK_UPDATE_FAILED',
    })
  }

  revalidatePath(`/events/${timeline.event_id}`)
  return updated as TimelineBlock
}

// ── Add Timeline Block ───────────────────────────────────────────────────────

export async function addTimelineBlock(
  eventId: string,
  blockInput: AddBlockInput
): Promise<TimelineBlock> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get timeline for this event
  const { data: timeline } = await db
    .from('event_timelines')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!timeline) {
    throw new UnknownAppError('No timeline exists for this event. Generate one first.', {
      code: 'TIMELINE_NOT_FOUND',
    })
  }

  // Validate block type
  if (!BLOCK_TYPES.includes(blockInput.block_type)) {
    throw new UnknownAppError('Invalid block type', { code: 'TIMELINE_INVALID_BLOCK_TYPE' })
  }

  // Get max sequence for ordering
  const { data: maxSeqRow } = await db
    .from('timeline_blocks')
    .select('sequence')
    .eq('timeline_id', timeline.id)
    .order('sequence', { ascending: false })
    .limit(1)
    .single()

  const nextSequence = (maxSeqRow?.sequence ?? 0) + 1

  const startTime = new Date(blockInput.start_time)
  const endTime = addMinutes(startTime, blockInput.duration_minutes)

  const { data: block, error: insertErr } = await db
    .from('timeline_blocks')
    .insert({
      timeline_id: timeline.id,
      block_type: blockInput.block_type,
      label: blockInput.label,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: blockInput.duration_minutes,
      sequence: nextSequence,
      notes: blockInput.notes ?? null,
      course_number: blockInput.course_number ?? null,
      is_parallel: blockInput.is_parallel ?? false,
    })
    .select()
    .single()

  if (insertErr) {
    throw new UnknownAppError('Failed to add timeline block', {
      code: 'TIMELINE_BLOCK_ADD_FAILED',
    })
  }

  revalidatePath(`/events/${eventId}`)
  return block as TimelineBlock
}

// ── Reorder Timeline ─────────────────────────────────────────────────────────

export async function reorderTimeline(
  eventId: string,
  blockIds: string[]
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get timeline
  const { data: timeline } = await db
    .from('event_timelines')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!timeline) {
    throw new UnknownAppError('Timeline not found', { code: 'TIMELINE_NOT_FOUND' })
  }

  // Update sequence for each block
  for (let i = 0; i < blockIds.length; i++) {
    const { error } = await db
      .from('timeline_blocks')
      .update({ sequence: i })
      .eq('id', blockIds[i])
      .eq('timeline_id', timeline.id)

    if (error) {
      throw new UnknownAppError('Failed to reorder timeline blocks', {
        code: 'TIMELINE_REORDER_FAILED',
      })
    }
  }

  revalidatePath(`/events/${eventId}`)
}

// ── Mark Block Complete ──────────────────────────────────────────────────────

export async function markBlockComplete(blockId: string): Promise<TimelineBlock> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify ownership
  const { data: block } = await db
    .from('timeline_blocks')
    .select('id, timeline_id, completed_at')
    .eq('id', blockId)
    .single()

  if (!block) {
    throw new UnknownAppError('Timeline block not found', { code: 'TIMELINE_BLOCK_NOT_FOUND' })
  }

  const { data: timeline } = await db
    .from('event_timelines')
    .select('id, tenant_id, event_id')
    .eq('id', block.timeline_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!timeline) {
    throw new UnknownAppError('Timeline not found or access denied', {
      code: 'TIMELINE_ACCESS_DENIED',
    })
  }

  // Toggle: if already completed, uncomplete it
  const completedAt = block.completed_at ? null : new Date().toISOString()

  const { data: updated, error: updateErr } = await db
    .from('timeline_blocks')
    .update({ completed_at: completedAt })
    .eq('id', blockId)
    .select()
    .single()

  if (updateErr) {
    throw new UnknownAppError('Failed to mark block complete', {
      code: 'TIMELINE_BLOCK_COMPLETE_FAILED',
    })
  }

  revalidatePath(`/events/${timeline.event_id}`)
  return updated as TimelineBlock
}

// ── Internal: Fetch Event Courses ────────────────────────────────────────────

type CourseInputForEstimation = {
  courseNumber: number
  courseName: string
  componentCount: number
  isComplex: boolean
  variantCount: number
}

/**
 * Pull menu/course data for an event. Falls back to a single generic course
 * if no menu data is found (chef can adjust afterward).
 */
async function fetchEventCourses(
  db: any,
  eventId: string,
  tenantId: string
): Promise<CourseInputForEstimation[]> {
  // Try to get menu items linked to this event
  const { data: menuItems } = await db
    .from('event_menu_items')
    .select('id, course_label, dish_name, component_count, is_complex, variant_count, sort_order')
    .eq('event_id', eventId)

  if (menuItems && menuItems.length > 0) {
    // Group by course_label, create course inputs
    const courseMap = new Map<string, CourseInputForEstimation>()
    let courseNum = 1

    for (const item of menuItems) {
      const label = item.course_label || `Course ${courseNum}`
      if (!courseMap.has(label)) {
        courseMap.set(label, {
          courseNumber: courseNum++,
          courseName: label,
          componentCount: item.component_count || 1,
          isComplex: item.is_complex || false,
          variantCount: item.variant_count || 0,
        })
      } else {
        const existing = courseMap.get(label)!
        existing.componentCount += item.component_count || 1
        existing.variantCount += item.variant_count || 0
        if (item.is_complex) existing.isComplex = true
      }
    }

    return Array.from(courseMap.values())
  }

  // Try menus table as fallback
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (menus && menus.length > 0) {
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course, prep_complexity')
      .eq('menu_id', menus[0].id)
      .order('course', { ascending: true })

    if (dishes && dishes.length > 0) {
      const courseMap = new Map<string, CourseInputForEstimation>()
      let courseNum = 1

      for (const dish of dishes) {
        const label = dish.course || `Course ${courseNum}`
        if (!courseMap.has(label)) {
          courseMap.set(label, {
            courseNumber: courseNum++,
            courseName: label,
            componentCount: 1,
            isComplex: dish.prep_complexity === 'intensive',
            variantCount: 0,
          })
        } else {
          const existing = courseMap.get(label)!
          existing.componentCount += 1
          if (dish.prep_complexity === 'intensive') existing.isComplex = true
        }
      }

      return Array.from(courseMap.values())
    }
  }

  // No menu data at all: single generic course as fallback
  return [
    {
      courseNumber: 1,
      courseName: 'Main Course',
      componentCount: 3,
      isComplex: false,
      variantCount: 0,
    },
  ]
}
