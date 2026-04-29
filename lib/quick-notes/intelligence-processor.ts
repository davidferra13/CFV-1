import { createAdminClient } from '@/lib/db/admin'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  InterpretedNoteSchema,
  NOTE_ROUTE_KEYS,
  NOTE_ROUTE_LABELS,
  buildNoteInterpretationPrompt,
  confidenceBand,
  normalizeDueDate,
  normalizeDueTime,
  normalizeIngredientCategory,
  noteDedupeKey,
  taskPriorityFromUrgency,
  todayIsoDate,
  type InterpretedNote,
  type InterpretedNoteAction,
  type InterpretedNoteComponent,
  type NoteComponentType,
} from './intelligence-core'

type Db = ReturnType<typeof createAdminClient> & any
type ProcessorMode = 'inline' | 'queued' | 'inline_fallback' | 'worker'

type TraceLinkKind =
  | 'raw_to_interpretation'
  | 'interpretation_to_component'
  | 'component_to_route'
  | 'action_to_task'
  | 'action_to_calendar'
  | 'action_to_review'
  | 'correction_to_learning'

export type InstantNoteProcessResult =
  | {
      success: true
      interpretationId: string
      confidenceBand: 'high' | 'medium' | 'low'
      reviewRequired: boolean
      components: number
      actions: number
      routeFailures: number
    }
  | {
      success: false
      interpretationId: string
      reviewTaskId: string | null
      error: string
    }

function buildFallbackAction(rawText: string): InterpretedNoteAction {
  return {
    actionType: 'review_prompt',
    title: 'Review captured note',
    description: rawText.slice(0, 500),
    dueDate: todayIsoDate(),
    dueTime: null,
    urgency: 'high',
    componentIndex: null,
    metadata: { source: 'fallback' },
  }
}

function ensureInterpretedNote(rawText: string, parsed: InterpretedNote): InterpretedNote {
  const components = parsed.components.length
    ? parsed.components.map((component) => ({
        ...component,
        routeLayer: component.routeLayer || NOTE_ROUTE_LABELS[component.componentType],
      }))
    : [
        {
          componentType: 'review_prompt' as const,
          title: 'Unclassified note',
          summary: rawText.slice(0, 500),
          routeLayer: NOTE_ROUTE_LABELS.review_prompt,
          sourceExcerpt: rawText.slice(0, 500),
          confidenceScore: Math.min(parsed.confidenceScore, 40),
          metadata: {},
        },
      ]

  const actions = parsed.actions.length ? parsed.actions : [buildFallbackAction(rawText)]
  const hasCalendarAlert = actions.some((action) => action.actionType === 'calendar_alert')
  if (parsed.timeIntelligence.isTimeSensitive && !hasCalendarAlert) {
    const firstWindow = parsed.timeIntelligence.windows[0]
    actions.push({
      actionType: 'calendar_alert',
      title: firstWindow?.label ? `Return to ${firstWindow.label}` : 'Return to captured note',
      description:
        firstWindow?.urgencyReason ?? 'ChefFlow inferred time sensitivity from the captured note.',
      dueDate: firstWindow?.startDate ?? null,
      dueTime: null,
      urgency: parsed.timeIntelligence.urgency,
      componentIndex: null,
      metadata: { source: 'time_intelligence_guardrail' },
    })
  }

  return {
    ...parsed,
    confidenceBand: confidenceBand(parsed.confidenceScore),
    classifications: parsed.classifications.length
      ? parsed.classifications
      : Array.from(new Set(components.map((component) => component.componentType))),
    components,
    actions,
  }
}

async function recordTraceLink(
  db: Db,
  input: {
    chefId: string
    quickNoteId: string
    interpretationId?: string | null
    componentId?: string | null
    actionId?: string | null
    linkKind: TraceLinkKind
    derivedType: string
    derivedRefId?: string | null
    routeLayer?: string | null
    confidenceScore?: number | null
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await db.from('chef_note_trace_links').insert({
    chef_id: input.chefId,
    quick_note_id: input.quickNoteId,
    interpretation_id: input.interpretationId ?? null,
    component_id: input.componentId ?? null,
    action_id: input.actionId ?? null,
    link_kind: input.linkKind,
    derived_type: input.derivedType,
    derived_ref_id: input.derivedRefId ?? null,
    route_layer: input.routeLayer ?? null,
    confidence_score: input.confidenceScore ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error('[note-intelligence] trace link insert failed:', error)
  }
}

export async function createQueuedInterpretation(input: {
  chefId: string
  quickNoteId: string
  rawText: string
  processorMode?: ProcessorMode
}) {
  const db: Db = createAdminClient()
  const { data, error } = await db
    .from('chef_note_interpretations')
    .insert({
      chef_id: input.chefId,
      quick_note_id: input.quickNoteId,
      raw_text: input.rawText,
      status: 'processing',
      processor_mode: input.processorMode ?? 'queued',
      queued_at: new Date().toISOString(),
      dedupe_key: noteDedupeKey(['raw', input.rawText]),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] queued interpretation insert failed:', error)
    throw new Error('Failed to create note interpretation')
  }

  await recordTraceLink(db, {
    chefId: input.chefId,
    quickNoteId: input.quickNoteId,
    interpretationId: data.id,
    linkKind: 'raw_to_interpretation',
    derivedType: 'chef_note_interpretations',
    derivedRefId: data.id,
    routeLayer: 'Interpretation',
    metadata: { processorMode: input.processorMode ?? 'queued' },
  })

  return data.id as string
}

export async function attachAiTaskToInterpretation(input: {
  chefId: string
  quickNoteId: string
  interpretationId: string
  aiTaskId: string
}) {
  const db: Db = createAdminClient()
  const { error } = await db
    .from('chef_note_interpretations')
    .update({
      ai_task_id: input.aiTaskId,
      processor_mode: 'queued',
      queued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.interpretationId)
    .eq('chef_id', input.chefId)
    .eq('quick_note_id', input.quickNoteId)

  if (error) {
    console.error('[note-intelligence] ai task attach failed:', error)
    throw new Error('Failed to attach queued note task')
  }
}

async function loadInterpretationContext(db: Db, chefId: string) {
  const [corrections, rules] = await Promise.all([
    db
      .from('chef_note_corrections')
      .select('correction_type, original_value, corrected_value, notes, created_at')
      .eq('chef_id', chefId)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('chef_note_learning_rules')
      .select('rule_type, pattern, instruction, weight, created_at')
      .eq('chef_id', chefId)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (corrections.error) {
    console.error('[note-intelligence] correction context lookup failed:', corrections.error)
  }
  if (rules.error) {
    console.error('[note-intelligence] learning rule lookup failed:', rules.error)
  }

  return [
    ...(corrections.data ?? []),
    ...(rules.data ?? []).map((rule: Record<string, unknown>) => ({
      correction_type: rule.rule_type,
      original_value: { pattern: rule.pattern },
      corrected_value: { instruction: rule.instruction, weight: rule.weight },
      notes: 'Durable learning rule',
      created_at: rule.created_at,
    })),
  ]
}

async function updateInterpretationRow(
  db: Db,
  chefId: string,
  interpretationId: string,
  payload: Record<string, unknown>
) {
  const { error } = await db
    .from('chef_note_interpretations')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', interpretationId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[note-intelligence] interpretation update failed:', error)
    throw new Error('Failed to update note interpretation')
  }
}

async function updateQuickNoteProcessing(
  db: Db,
  chefId: string,
  quickNoteId: string,
  processingStatus: 'queued' | 'processing' | 'processed' | 'needs_review' | 'failed',
  triage?: { triagedTo: string; triagedRefId: string }
) {
  const { error } = await db
    .from('chef_quick_notes')
    .update({
      processing_status: processingStatus,
      ...(triage
        ? {
            status: 'triaged',
            triaged_to: triage.triagedTo,
            triaged_ref_id: triage.triagedRefId,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', quickNoteId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[note-intelligence] quick note processing update failed:', error)
  }
}

async function insertComponentRow(
  db: Db,
  chefId: string,
  interpretationId: string,
  quickNoteId: string,
  component: InterpretedNoteComponent,
  needsReview: boolean
) {
  const routeKey = NOTE_ROUTE_KEYS[component.componentType]
  const routeLayer = component.routeLayer || NOTE_ROUTE_LABELS[component.componentType]
  const { data, error } = await db
    .from('chef_note_components')
    .insert({
      chef_id: chefId,
      interpretation_id: interpretationId,
      quick_note_id: quickNoteId,
      component_type: component.componentType,
      title: component.title,
      summary: component.summary,
      route_layer: routeLayer,
      route_key: routeKey,
      route_confidence_band: confidenceBand(component.confidenceScore),
      confidence_score: component.confidenceScore,
      status: needsReview ? 'needs_review' : 'routed',
      source_excerpt: component.sourceExcerpt,
      metadata: component.metadata,
      unassigned_guard: routeKey === 'review_queue' ? 'review_queue_fallback' : null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] component insert failed:', error)
    throw new Error('Failed to save note component')
  }

  await recordTraceLink(db, {
    chefId,
    quickNoteId,
    interpretationId,
    componentId: data.id,
    linkKind: 'interpretation_to_component',
    derivedType: 'chef_note_components',
    derivedRefId: data.id,
    routeLayer,
    confidenceScore: component.confidenceScore,
    metadata: { componentType: component.componentType, routeKey },
  })

  return data.id as string
}

async function markComponentRoute(
  db: Db,
  chefId: string,
  componentId: string,
  routedTo: string,
  routedRefId: string | null,
  status: 'routed' | 'needs_review' | 'failed',
  routeError?: string
) {
  const { error } = await db
    .from('chef_note_components')
    .update({
      routed_to: routedTo,
      routed_ref_id: routedRefId,
      status,
      route_error: routeError ?? null,
      confirmed_at: status === 'routed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', componentId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[note-intelligence] component route update failed:', error)
  }
}

async function createWorkflowNoteForComponent(
  db: Db,
  chefId: string,
  userId: string,
  rawText: string,
  component: InterpretedNoteComponent
) {
  const titlePrefix: Record<NoteComponentType, string> = {
    recipe_concept: 'Recipe concept',
    technique_variation: 'Technique experiment',
    ingredient_discovery: 'Ingredient discovery',
    seasonal_sourcing_insight: 'Seasonal sourcing insight',
    task: 'Task',
    event_idea: 'Event idea',
    inventory_thought: 'Inventory thought',
    constraint: 'Constraint',
    review_prompt: 'Review',
    other: 'Captured note',
  }

  const body = [
    component.summary,
    '',
    `Route: ${component.routeLayer || NOTE_ROUTE_LABELS[component.componentType]}`,
    component.sourceExcerpt ? `Source excerpt: ${component.sourceExcerpt}` : null,
    '',
    'Raw note:',
    rawText,
  ]
    .filter(Boolean)
    .join('\n')

  const { data, error } = await db
    .from('workflow_notes')
    .insert({
      tenant_id: chefId,
      title: `${titlePrefix[component.componentType]}: ${component.title}`.slice(0, 240),
      body,
      ownership_scope: 'global',
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] workflow note route failed:', error)
    throw new Error('Failed to route component to workflow notes')
  }

  return data.id as string
}

async function routeIngredientComponent(
  db: Db,
  chefId: string,
  userId: string,
  component: InterpretedNoteComponent
) {
  const ingredientName =
    typeof component.metadata.ingredientName === 'string'
      ? component.metadata.ingredientName.trim()
      : component.title.trim()

  if (!ingredientName) throw new Error('Ingredient name missing')

  const { data: existing, error: lookupError } = await db
    .from('ingredients')
    .select('id')
    .eq('tenant_id', chefId)
    .ilike('name', ingredientName)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    console.error('[note-intelligence] ingredient lookup failed:', lookupError)
  }

  if (existing?.id) return existing.id as string

  const { data, error } = await db
    .from('ingredients')
    .insert({
      tenant_id: chefId,
      name: ingredientName,
      category: normalizeIngredientCategory(component.metadata.category),
      description: component.summary,
      default_unit:
        typeof component.metadata.defaultUnit === 'string'
          ? component.metadata.defaultUnit
          : 'each',
      vendor_notes:
        typeof component.metadata.vendorNotes === 'string' ? component.metadata.vendorNotes : null,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] ingredient route failed:', error)
    throw new Error('Failed to route component to ingredients')
  }

  return data.id as string
}

async function createTaskForAction(
  db: Db,
  chefId: string,
  action: InterpretedNoteAction,
  fallbackUrgency: 'low' | 'normal' | 'high' | 'urgent',
  rawText: string
) {
  const dueDate = normalizeDueDate(action, fallbackUrgency)
  const dueTime = normalizeDueTime(action.dueTime)
  const notes = [
    action.description,
    '',
    'Created from instant note capture.',
    `Raw note: ${rawText}`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000)

  const { data, error } = await db
    .from('tasks')
    .insert({
      chef_id: chefId,
      title: action.title,
      description: action.description,
      due_date: dueDate,
      due_time: dueTime,
      priority: taskPriorityFromUrgency(action.urgency ?? fallbackUrgency),
      status: 'pending',
      notes,
      recurring_rule: null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] task action route failed:', error)
    throw new Error('Failed to create note action task')
  }

  return data.id as string
}

async function createCalendarEntryForAction(
  db: Db,
  chefId: string,
  action: InterpretedNoteAction,
  fallbackUrgency: 'low' | 'normal' | 'high' | 'urgent',
  rawText: string
) {
  const startDate = normalizeDueDate(action, fallbackUrgency)
  const rawStartTime = normalizeDueTime(action.dueTime)
  const startTime = rawStartTime && rawStartTime >= '23:00' ? '22:59' : rawStartTime
  const endTime = startTime ? calendarEndTime(startTime) : null
  const { data, error } = await db
    .from('chef_calendar_entries')
    .insert({
      chef_id: chefId,
      entry_type: 'admin_block',
      title: action.title,
      description: [action.description, '', 'Created from instant note capture.', rawText]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000),
      start_date: startDate,
      end_date: startDate,
      all_day: !startTime,
      start_time: startTime,
      end_time: endTime,
      blocks_bookings: false,
      is_private: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] calendar action route failed:', error)
    throw new Error('Failed to create note calendar entry')
  }

  return data.id as string
}

function calendarEndTime(startTime: string): string {
  const [hourText, minuteText] = startTime.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '23:59'
  const end = new Date(2026, 0, 1, hour, minute)
  end.setMinutes(end.getMinutes() + 60)
  const endHour = Math.min(end.getHours(), 23)
  const endMinute =
    endHour === 23 && end.getHours() >= 23 ? Math.min(end.getMinutes(), 59) : end.getMinutes()
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
}

async function findExistingActionRoute(db: Db, chefId: string, dedupeKey: string) {
  const { data, error } = await db
    .from('chef_note_actions')
    .select('routed_to, routed_ref_id, calendar_entry_id')
    .eq('chef_id', chefId)
    .eq('dedupe_key', dedupeKey)
    .eq('status', 'created')
    .not('routed_ref_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[note-intelligence] action dedupe lookup failed:', error)
  }

  return data ?? null
}

async function insertActionRow(
  db: Db,
  chefId: string,
  interpretationId: string,
  quickNoteId: string,
  componentId: string | null,
  action: InterpretedNoteAction,
  status: 'pending' | 'created' | 'needs_review' | 'failed',
  routedTo?: string | null,
  routedRefId?: string | null,
  calendarEntryId?: string | null
) {
  const sourceActionSignature = noteDedupeKey([
    action.actionType,
    action.title,
    action.description,
    action.dueDate,
    action.dueTime,
  ])
  const { data, error } = await db
    .from('chef_note_actions')
    .insert({
      chef_id: chefId,
      interpretation_id: interpretationId,
      component_id: componentId,
      quick_note_id: quickNoteId,
      action_type: action.actionType,
      title: action.title,
      description: action.description,
      due_date:
        action.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(action.dueDate) ? action.dueDate : null,
      due_time: normalizeDueTime(action.dueTime),
      urgency: action.urgency,
      status,
      routed_to: routedTo ?? null,
      routed_ref_id: routedRefId ?? null,
      calendar_entry_id: calendarEntryId ?? null,
      dedupe_key: sourceActionSignature,
      source_action_signature: sourceActionSignature,
      metadata: action.metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] action insert failed:', error)
    throw new Error('Failed to save note action')
  }

  return { id: data.id as string, dedupeKey: sourceActionSignature }
}

async function routeComponents(
  db: Db,
  chefId: string,
  userId: string,
  rawText: string,
  interpretationId: string,
  quickNoteId: string,
  componentIds: string[],
  components: InterpretedNoteComponent[],
  needsReview: boolean
) {
  let routeFailures = 0
  if (needsReview) return routeFailures

  for (let index = 0; index < components.length; index++) {
    const component = components[index]
    const componentId = componentIds[index]
    try {
      if (component.componentType === 'ingredient_discovery') {
        const ingredientId = await routeIngredientComponent(db, chefId, userId, component)
        await markComponentRoute(db, chefId, componentId, 'ingredients', ingredientId, 'routed')
        await recordTraceLink(db, {
          chefId,
          quickNoteId,
          interpretationId,
          componentId,
          linkKind: 'component_to_route',
          derivedType: 'ingredients',
          derivedRefId: ingredientId,
          routeLayer: component.routeLayer,
          confidenceScore: component.confidenceScore,
        })
      } else if (
        component.componentType !== 'task' &&
        component.componentType !== 'review_prompt'
      ) {
        const noteId = await createWorkflowNoteForComponent(db, chefId, userId, rawText, component)
        await markComponentRoute(db, chefId, componentId, 'workflow_notes', noteId, 'routed')
        await recordTraceLink(db, {
          chefId,
          quickNoteId,
          interpretationId,
          componentId,
          linkKind: 'component_to_route',
          derivedType: 'workflow_notes',
          derivedRefId: noteId,
          routeLayer: component.routeLayer,
          confidenceScore: component.confidenceScore,
        })
      } else {
        await markComponentRoute(db, chefId, componentId, 'tasks', null, 'routed')
      }
    } catch (err) {
      routeFailures++
      const errorMessage = err instanceof Error ? err.message : 'Component route failed'
      console.error('[note-intelligence] component routing failed:', err)
      await markComponentRoute(
        db,
        chefId,
        componentId,
        NOTE_ROUTE_LABELS[component.componentType],
        null,
        'failed',
        errorMessage
      )
    }
  }

  return routeFailures
}

async function routeActions(
  db: Db,
  chefId: string,
  interpretationId: string,
  quickNoteId: string,
  rawText: string,
  interpreted: InterpretedNote,
  componentIds: string[],
  needsReview: boolean
) {
  let createdCount = 0
  const fallbackUrgency = interpreted.timeIntelligence.urgency

  for (const action of interpreted.actions) {
    const componentId =
      action.componentIndex !== null && action.componentIndex !== undefined
        ? (componentIds[action.componentIndex] ?? null)
        : null

    if (needsReview && action.actionType !== 'review_prompt') {
      await insertActionRow(
        db,
        chefId,
        interpretationId,
        quickNoteId,
        componentId,
        action,
        'needs_review'
      )
      continue
    }

    try {
      const dedupeKey = noteDedupeKey([
        action.actionType,
        action.title,
        action.description,
        action.dueDate,
        action.dueTime,
      ])
      const existing = await findExistingActionRoute(db, chefId, dedupeKey)
      if (existing?.routed_ref_id) {
        const actionRow = await insertActionRow(
          db,
          chefId,
          interpretationId,
          quickNoteId,
          componentId,
          action,
          'created',
          existing.routed_to,
          existing.routed_ref_id,
          existing.calendar_entry_id
        )
        await recordTraceLink(db, {
          chefId,
          quickNoteId,
          interpretationId,
          componentId,
          actionId: actionRow.id,
          linkKind:
            existing.routed_to === 'chef_calendar_entries'
              ? 'action_to_calendar'
              : 'action_to_task',
          derivedType: existing.routed_to ?? 'tasks',
          derivedRefId: existing.routed_ref_id,
          routeLayer: action.actionType,
          metadata: { deduped: true },
        })
        createdCount++
        continue
      }

      if (action.actionType === 'calendar_alert') {
        const calendarEntryId = await createCalendarEntryForAction(
          db,
          chefId,
          action,
          fallbackUrgency,
          rawText
        )
        const actionRow = await insertActionRow(
          db,
          chefId,
          interpretationId,
          quickNoteId,
          componentId,
          action,
          'created',
          'chef_calendar_entries',
          calendarEntryId,
          calendarEntryId
        )
        await recordTraceLink(db, {
          chefId,
          quickNoteId,
          interpretationId,
          componentId,
          actionId: actionRow.id,
          linkKind: 'action_to_calendar',
          derivedType: 'chef_calendar_entries',
          derivedRefId: calendarEntryId,
          routeLayer: 'Calendar',
        })
      } else {
        const taskId = await createTaskForAction(db, chefId, action, fallbackUrgency, rawText)
        const actionRow = await insertActionRow(
          db,
          chefId,
          interpretationId,
          quickNoteId,
          componentId,
          action,
          'created',
          'tasks',
          taskId
        )
        await recordTraceLink(db, {
          chefId,
          quickNoteId,
          interpretationId,
          componentId,
          actionId: actionRow.id,
          linkKind: action.actionType === 'review_prompt' ? 'action_to_review' : 'action_to_task',
          derivedType: 'tasks',
          derivedRefId: taskId,
          routeLayer: 'Task System',
        })
      }
      createdCount++
    } catch (err) {
      console.error('[note-intelligence] action routing failed:', err)
      await insertActionRow(
        db,
        chefId,
        interpretationId,
        quickNoteId,
        componentId,
        action,
        'failed'
      )
    }
  }

  if (needsReview || createdCount === 0) {
    const reviewAction = buildFallbackAction(rawText)
    const taskId = await createTaskForAction(db, chefId, reviewAction, 'high', rawText)
    const actionRow = await insertActionRow(
      db,
      chefId,
      interpretationId,
      quickNoteId,
      null,
      reviewAction,
      'created',
      'tasks',
      taskId
    )
    await recordTraceLink(db, {
      chefId,
      quickNoteId,
      interpretationId,
      actionId: actionRow.id,
      linkKind: 'action_to_review',
      derivedType: 'tasks',
      derivedRefId: taskId,
      routeLayer: 'Review Queue',
    })
  }
}

async function getExistingCompletedInterpretation(db: Db, chefId: string, quickNoteId: string) {
  const { data, error } = await db
    .from('chef_note_interpretations')
    .select(
      'id, quick_note_id, raw_text, confidence_score, confidence_band, status, interpretation, time_intelligence, ambiguity_notes, error, created_at, updated_at'
    )
    .eq('chef_id', chefId)
    .eq('quick_note_id', quickNoteId)
    .in('status', ['auto_committed', 'needs_confirmation', 'review_queue', 'corrected'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[note-intelligence] existing interpretation lookup failed:', error)
  }

  return data ?? null
}

async function createInterpretationIfNeeded(
  db: Db,
  chefId: string,
  quickNoteId: string,
  rawText: string,
  processorMode: ProcessorMode,
  interpretationId?: string | null
) {
  if (interpretationId) return interpretationId
  return createQueuedInterpretation({ chefId, quickNoteId, rawText, processorMode })
}

export async function processInstantNoteForChef(input: {
  chefId: string
  userId: string
  quickNoteId: string
  interpretationId?: string | null
  aiTaskId?: string | null
  processorMode?: ProcessorMode
}): Promise<InstantNoteProcessResult> {
  const db: Db = createAdminClient()

  const { data: note, error: noteError } = await db
    .from('chef_quick_notes')
    .select('id, text, status')
    .eq('id', input.quickNoteId)
    .eq('chef_id', input.chefId)
    .single()

  if (noteError || !note) {
    return {
      success: false,
      interpretationId: input.interpretationId ?? input.quickNoteId,
      reviewTaskId: null,
      error: 'Note not found',
    }
  }

  const existing = await getExistingCompletedInterpretation(db, input.chefId, note.id)
  if (existing && existing.id !== input.interpretationId) {
    return {
      success: true,
      interpretationId: existing.id,
      confidenceBand: existing.confidence_band,
      reviewRequired: existing.status !== 'auto_committed',
      components: Array.isArray(existing.interpretation?.components)
        ? existing.interpretation.components.length
        : 0,
      actions: Array.isArray(existing.interpretation?.actions)
        ? existing.interpretation.actions.length
        : 0,
      routeFailures: 0,
    }
  }

  const processorMode = input.processorMode ?? 'inline'
  const interpretationId = await createInterpretationIfNeeded(
    db,
    input.chefId,
    note.id,
    note.text,
    processorMode,
    input.interpretationId
  )

  await updateQuickNoteProcessing(db, input.chefId, note.id, 'processing')
  await updateInterpretationRow(db, input.chefId, interpretationId, {
    ai_task_id: input.aiTaskId ?? null,
    processor_mode: processorMode,
  })

  try {
    const corrections = await loadInterpretationContext(db, input.chefId)
    const parsed = await parseWithOllama(
      buildNoteInterpretationPrompt(corrections),
      note.text,
      InterpretedNoteSchema,
      {
        modelTier: 'complex',
        maxTokens: 2048,
        dispatchHint: {
          taskType: 'note.intelligence',
          surface: 'capture.instant_note',
          latencySensitive: processorMode === 'inline',
          canAutoExecute: true,
          canQueueForApproval: true,
        },
      }
    )

    const interpreted = ensureInterpretedNote(note.text, parsed)
    const needsReview = interpreted.confidenceBand !== 'high'
    const componentIds: string[] = []

    for (const component of interpreted.components) {
      componentIds.push(
        await insertComponentRow(
          db,
          input.chefId,
          interpretationId,
          note.id,
          component,
          needsReview
        )
      )
    }

    const routeFailures = await routeComponents(
      db,
      input.chefId,
      input.userId,
      note.text,
      interpretationId,
      note.id,
      componentIds,
      interpreted.components,
      needsReview
    )
    await routeActions(
      db,
      input.chefId,
      interpretationId,
      note.id,
      note.text,
      interpreted,
      componentIds,
      needsReview || routeFailures > 0
    )

    const status =
      needsReview || routeFailures > 0
        ? interpreted.confidenceBand === 'medium' && routeFailures === 0
          ? 'needs_confirmation'
          : 'review_queue'
        : 'auto_committed'

    await updateInterpretationRow(db, input.chefId, interpretationId, {
      confidence_score: interpreted.confidenceScore,
      confidence_band: interpreted.confidenceBand,
      status,
      interpretation: {
        summary: interpreted.summary,
        classifications: interpreted.classifications,
        components: interpreted.components,
        actions: interpreted.actions,
      },
      time_intelligence: interpreted.timeIntelligence,
      ambiguity_notes: interpreted.ambiguityNotes,
      review_reason:
        routeFailures > 0
          ? `${routeFailures} route(s) failed and need review.`
          : needsReview
            ? 'Confidence requires chef review.'
            : null,
      error: null,
      processed_at: new Date().toISOString(),
    })

    await updateQuickNoteProcessing(
      db,
      input.chefId,
      note.id,
      needsReview ? 'needs_review' : 'processed',
      {
        triagedTo: needsReview ? 'note_intelligence_review' : 'note_intelligence',
        triagedRefId: interpretationId,
      }
    )

    return {
      success: true,
      interpretationId,
      confidenceBand: interpreted.confidenceBand,
      reviewRequired: needsReview || routeFailures > 0,
      components: interpreted.components.length,
      actions: interpreted.actions.length,
      routeFailures,
    }
  } catch (err) {
    const isOffline = err instanceof OllamaOfflineError
    const reviewAction = buildFallbackAction(note.text)
    let reviewTaskId: string | null = null

    try {
      reviewTaskId = await createTaskForAction(db, input.chefId, reviewAction, 'high', note.text)
      const actionRow = await insertActionRow(
        db,
        input.chefId,
        interpretationId,
        note.id,
        null,
        reviewAction,
        'created',
        'tasks',
        reviewTaskId
      )
      await recordTraceLink(db, {
        chefId: input.chefId,
        quickNoteId: note.id,
        interpretationId,
        actionId: actionRow.id,
        linkKind: 'action_to_review',
        derivedType: 'tasks',
        derivedRefId: reviewTaskId,
        routeLayer: 'Review Queue',
      })
    } catch (actionErr) {
      console.error('[note-intelligence] fallback review action failed:', actionErr)
    }

    await updateInterpretationRow(db, input.chefId, interpretationId, {
      confidence_score: 0,
      confidence_band: 'low',
      status: 'failed',
      interpretation: {
        summary: 'AI interpretation failed. Raw note is preserved for review.',
        classifications: ['review_prompt'],
        components: [],
        actions: [reviewAction],
      },
      time_intelligence: {
        isTimeSensitive: false,
        windows: [],
        urgency: 'high',
      },
      ambiguity_notes: [isOffline ? 'AI runtime unavailable.' : 'Interpretation failed.'],
      review_reason: isOffline ? 'AI runtime unavailable.' : 'Interpretation failed.',
      error: err instanceof Error ? err.message : 'Unknown interpretation error',
      processed_at: new Date().toISOString(),
    })
    await updateQuickNoteProcessing(db, input.chefId, note.id, 'failed', {
      triagedTo: 'note_intelligence_review',
      triagedRefId: interpretationId,
    })

    return {
      success: false,
      interpretationId,
      reviewTaskId,
      error: isOffline
        ? 'AI processing is temporarily unavailable. A review task was created.'
        : 'Failed to interpret note. A review task was created.',
    }
  }
}

export async function handleInstantNoteQueueTask(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const quickNoteId = typeof payload.quickNoteId === 'string' ? payload.quickNoteId : null
  const interpretationId =
    typeof payload.interpretationId === 'string' ? payload.interpretationId : null
  const userId = typeof payload.userId === 'string' ? payload.userId : tenantId
  const aiTaskId = typeof payload.aiTaskId === 'string' ? payload.aiTaskId : null

  if (!quickNoteId) {
    throw new Error('Queued instant note task missing quickNoteId')
  }

  const result = await processInstantNoteForChef({
    chefId: tenantId,
    userId,
    quickNoteId,
    interpretationId,
    aiTaskId,
    processorMode: 'worker',
  })

  return result
}
