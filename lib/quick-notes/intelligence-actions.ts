'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { enqueueTask } from '@/lib/ai/queue/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  InterpretedNoteSchema,
  NOTE_ROUTE_LABELS,
  buildNoteInterpretationPrompt,
  confidenceBand,
  normalizeDueDate,
  normalizeDueTime,
  normalizeIngredientCategory,
  taskPriorityFromUrgency,
  todayIsoDate,
  classifyCaptureSource,
  type InterpretedNote,
  type InterpretedNoteAction,
  type InterpretedNoteComponent,
  type NoteComponentType,
} from './intelligence-core'
import {
  attachAiTaskToInterpretation,
  createQueuedInterpretation,
  processInstantNoteForChef,
} from './intelligence-processor'

const CaptureNoteSchema = z.object({
  text: z.string().min(1).max(10000),
  captureSource: z.enum(['typed', 'pasted', 'voice']).optional(),
})

const ProcessNoteSchema = z.object({
  quickNoteId: z.string().uuid(),
})

const CorrectionSchema = z.object({
  quickNoteId: z.string().uuid(),
  interpretationId: z.string().uuid().nullable().optional(),
  componentId: z.string().uuid().nullable().optional(),
  correctionType: z
    .enum(['classification', 'routing', 'action', 'time_window', 'confidence', 'other'])
    .default('other'),
  originalValue: z.record(z.string(), z.unknown()).default({}),
  correctedValue: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(2000).nullable().optional(),
})

type Db = ReturnType<typeof createServerClient> & any

function revalidateNoteIntelligence() {
  revalidatePath('/capture')
  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath('/culinary/dish-index')
  revalidatePath('/culinary/ingredients')
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

  return {
    ...parsed,
    confidenceBand: confidenceBand(parsed.confidenceScore),
    classifications: parsed.classifications.length
      ? parsed.classifications
      : Array.from(new Set(components.map((component) => component.componentType))),
    components,
    actions: parsed.actions.length ? parsed.actions : [buildFallbackAction(rawText)],
  }
}

async function loadCorrectionContext(db: Db, chefId: string) {
  const { data, error } = await db
    .from('chef_note_corrections')
    .select('correction_type, original_value, corrected_value, notes, created_at')
    .eq('chef_id', chefId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[note-intelligence] correction context lookup failed:', error)
    return []
  }

  return data ?? []
}

async function createInterpretationRow(
  db: Db,
  chefId: string,
  quickNoteId: string,
  rawText: string
) {
  const { data, error } = await db
    .from('chef_note_interpretations')
    .insert({
      chef_id: chefId,
      quick_note_id: quickNoteId,
      raw_text: rawText,
      status: 'processing',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] interpretation insert failed:', error)
    throw new Error('Failed to create note interpretation')
  }

  return data.id as string
}

async function updateInterpretationRow(
  db: Db,
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

  if (error) {
    console.error('[note-intelligence] interpretation update failed:', error)
    throw new Error('Failed to update note interpretation')
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
  const { data, error } = await db
    .from('chef_note_components')
    .insert({
      chef_id: chefId,
      interpretation_id: interpretationId,
      quick_note_id: quickNoteId,
      component_type: component.componentType,
      title: component.title,
      summary: component.summary,
      route_layer: component.routeLayer || NOTE_ROUTE_LABELS[component.componentType],
      confidence_score: component.confidenceScore,
      status: needsReview ? 'needs_review' : 'routed',
      source_excerpt: component.sourceExcerpt,
      metadata: component.metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] component insert failed:', error)
    throw new Error('Failed to save note component')
  }

  return data.id as string
}

async function markComponentRoute(
  db: Db,
  componentId: string,
  routedTo: string,
  routedRefId: string | null,
  status: 'routed' | 'needs_review' | 'failed'
) {
  const { error } = await db
    .from('chef_note_components')
    .update({
      routed_to: routedTo,
      routed_ref_id: routedRefId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', componentId)

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
    `Created from instant note capture.`,
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

async function insertActionRow(
  db: Db,
  chefId: string,
  interpretationId: string,
  quickNoteId: string,
  componentId: string | null,
  action: InterpretedNoteAction,
  status: 'pending' | 'created' | 'needs_review' | 'failed',
  routedRefId?: string | null
) {
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
      routed_to: routedRefId ? 'tasks' : null,
      routed_ref_id: routedRefId ?? null,
      metadata: action.metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] action insert failed:', error)
    throw new Error('Failed to save note action')
  }

  return data.id as string
}

async function routeComponents(
  db: Db,
  chefId: string,
  userId: string,
  rawText: string,
  componentIds: string[],
  components: InterpretedNoteComponent[],
  needsReview: boolean
) {
  if (needsReview) return

  for (let index = 0; index < components.length; index++) {
    const component = components[index]
    const componentId = componentIds[index]
    try {
      if (component.componentType === 'ingredient_discovery') {
        const ingredientId = await routeIngredientComponent(db, chefId, userId, component)
        await markComponentRoute(db, componentId, 'ingredients', ingredientId, 'routed')
      } else if (
        component.componentType !== 'task' &&
        component.componentType !== 'review_prompt'
      ) {
        const noteId = await createWorkflowNoteForComponent(db, chefId, userId, rawText, component)
        await markComponentRoute(db, componentId, 'workflow_notes', noteId, 'routed')
      } else {
        await markComponentRoute(db, componentId, 'tasks', null, 'routed')
      }
    } catch (err) {
      console.error('[note-intelligence] component routing failed:', err)
      await markComponentRoute(
        db,
        componentId,
        NOTE_ROUTE_LABELS[component.componentType],
        null,
        'failed'
      )
    }
  }
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
      const taskId = await createTaskForAction(db, chefId, action, fallbackUrgency, rawText)
      await insertActionRow(
        db,
        chefId,
        interpretationId,
        quickNoteId,
        componentId,
        action,
        'created',
        taskId
      )
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
    await insertActionRow(
      db,
      chefId,
      interpretationId,
      quickNoteId,
      null,
      reviewAction,
      'created',
      taskId
    )
  }
}

async function getExistingInterpretation(db: Db, chefId: string, quickNoteId: string) {
  const { data, error } = await db
    .from('chef_note_interpretations')
    .select(
      'id, quick_note_id, raw_text, confidence_score, confidence_band, status, interpretation, time_intelligence, ambiguity_notes, error, created_at, updated_at'
    )
    .eq('chef_id', chefId)
    .eq('quick_note_id', quickNoteId)
    .neq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[note-intelligence] existing interpretation lookup failed:', error)
  }

  return data ?? null
}

export async function createInstantNote(input: z.infer<typeof CaptureNoteSchema>) {
  const user = await requireChef()
  const validated = CaptureNoteSchema.parse(input)
  const rawText = validated.text
  const captureSource = validated.captureSource ?? classifyCaptureSource(rawText)

  if (!rawText.trim()) {
    return { success: false, error: 'Note cannot be empty' }
  }

  const db: Db = createServerClient()
  const { data, error } = await db
    .from('chef_quick_notes')
    .insert({
      chef_id: user.entityId,
      text: rawText,
      status: 'raw',
      capture_source: captureSource,
      processing_status: 'queued',
    })
    .select(
      'id, text, status, triaged_to, triaged_ref_id, capture_source, processing_status, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    console.error('[note-intelligence] raw note insert failed:', error)
    return { success: false, error: 'Failed to save note' }
  }

  let interpretationId: string | null = null
  let aiTaskId: string | null = null
  let processingMode: 'queued' | 'inline_fallback' = 'queued'

  try {
    interpretationId = await createQueuedInterpretation({
      chefId: user.entityId,
      quickNoteId: data.id,
      rawText,
      processorMode: 'queued',
    })

    const queued = await enqueueTask({
      tenantId: user.tenantId ?? user.entityId,
      taskType: 'note.interpretation',
      priority: 800,
      approvalTier: 'auto',
      payload: {
        quickNoteId: data.id,
        interpretationId,
        userId: user.id,
        captureSource,
        _aiConfidence: 100,
      },
    })

    if ('error' in queued) {
      console.error('[note-intelligence] queue enqueue failed:', queued.error)
      processingMode = 'inline_fallback'
      const processed = await processInstantNoteForChef({
        chefId: user.entityId,
        userId: user.id,
        quickNoteId: data.id,
        interpretationId,
        processorMode: 'inline_fallback',
      })
      revalidateNoteIntelligence()
      return {
        success: true,
        note: data,
        interpretationId,
        processingMode,
        inlineResult: processed,
      }
    }

    aiTaskId = queued.id
    if (!interpretationId) {
      throw new Error('Queued interpretation missing')
    }
    await attachAiTaskToInterpretation({
      chefId: user.entityId,
      quickNoteId: data.id,
      interpretationId,
      aiTaskId,
    })
  } catch (queueErr) {
    console.error('[note-intelligence] queue setup failed:', queueErr)
    processingMode = 'inline_fallback'
    const processed = await processInstantNoteForChef({
      chefId: user.entityId,
      userId: user.id,
      quickNoteId: data.id,
      interpretationId,
      processorMode: 'inline_fallback',
    })
    revalidateNoteIntelligence()
    return {
      success: true,
      note: data,
      interpretationId,
      processingMode,
      inlineResult: processed,
    }
  }

  revalidatePath('/capture')
  revalidatePath('/dashboard')
  return { success: true, note: data, interpretationId, aiTaskId, processingMode }
}

export async function processInstantNote(input: z.infer<typeof ProcessNoteSchema>) {
  const user = await requireChef()
  const validated = ProcessNoteSchema.parse(input)
  const result = await processInstantNoteForChef({
    chefId: user.entityId,
    userId: user.id,
    quickNoteId: validated.quickNoteId,
    processorMode: 'inline',
  })

  revalidateNoteIntelligence()
  return result
}

export async function getInstantNoteReviewQueue() {
  const user = await requireChef()
  const db: Db = createServerClient()

  const { data, error } = await db
    .from('chef_note_interpretations')
    .select(
      'id, quick_note_id, raw_text, confidence_score, confidence_band, status, interpretation, time_intelligence, ambiguity_notes, review_reason, error, created_at'
    )
    .eq('chef_id', user.entityId)
    .in('status', ['processing', 'needs_confirmation', 'review_queue', 'failed'])
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[note-intelligence] review queue load failed:', error)
    throw new Error('Failed to load note review queue')
  }

  return data ?? []
}

export async function getInstantNoteActions(limit = 25) {
  const user = await requireChef()
  const db: Db = createServerClient()

  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const { data, error } = await db
    .from('chef_note_actions')
    .select(
      'id, title, description, action_type, urgency, status, due_date, routed_to, routed_ref_id, calendar_entry_id, dedupe_key, created_at'
    )
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[note-intelligence] actions load failed:', error)
    throw new Error('Failed to load note actions')
  }

  return data ?? []
}

export async function getInstantNoteTraceLinks(limit = 40) {
  const user = await requireChef()
  const db: Db = createServerClient()
  const safeLimit = Math.min(Math.max(limit, 1), 100)

  const { data, error } = await db
    .from('chef_note_trace_links')
    .select(
      'id, quick_note_id, interpretation_id, component_id, action_id, link_kind, derived_type, derived_ref_id, route_layer, confidence_score, metadata, created_at'
    )
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[note-intelligence] trace link load failed:', error)
    throw new Error('Failed to load note trace links')
  }

  return data ?? []
}

export async function getInstantNoteLearningRules(limit = 20) {
  const user = await requireChef()
  const db: Db = createServerClient()
  const safeLimit = Math.min(Math.max(limit, 1), 50)

  const { data, error } = await db
    .from('chef_note_learning_rules')
    .select('id, rule_type, pattern, instruction, weight, last_applied_at, created_at')
    .eq('chef_id', user.entityId)
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[note-intelligence] learning rules load failed:', error)
    throw new Error('Failed to load note learning rules')
  }

  return data ?? []
}

export async function getInstantNoteSummary() {
  const user = await requireChef()
  const db: Db = createServerClient()

  const [interpretations, actions, quickNotes] = await Promise.all([
    db
      .from('chef_note_interpretations')
      .select('status, confidence_band, created_at')
      .eq('chef_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('chef_note_actions')
      .select('status, urgency, due_date, created_at')
      .eq('chef_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('chef_quick_notes')
      .select('processing_status, created_at')
      .eq('chef_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (interpretations.error || actions.error || quickNotes.error) {
    console.error('[note-intelligence] summary load failed:', {
      interpretations: interpretations.error,
      actions: actions.error,
      quickNotes: quickNotes.error,
    })
    throw new Error('Failed to load note intelligence summary')
  }

  const interpretationRows = interpretations.data ?? []
  const actionRows = actions.data ?? []
  const quickNoteRows = quickNotes.data ?? []

  return {
    totalNotes: quickNoteRows.length,
    queuedNotes: quickNoteRows.filter((row: any) =>
      ['queued', 'processing', 'unprocessed'].includes(row.processing_status)
    ).length,
    reviewCount: interpretationRows.filter((row: any) =>
      ['needs_confirmation', 'review_queue', 'failed'].includes(row.status)
    ).length,
    highConfidence: interpretationRows.filter((row: any) => row.confidence_band === 'high').length,
    mediumConfidence: interpretationRows.filter((row: any) => row.confidence_band === 'medium')
      .length,
    lowConfidence: interpretationRows.filter((row: any) => row.confidence_band === 'low').length,
    openActions: actionRows.filter((row: any) =>
      ['pending', 'created', 'needs_review', 'failed'].includes(row.status)
    ).length,
    urgentActions: actionRows.filter((row: any) => ['urgent', 'high'].includes(row.urgency)).length,
  }
}

export async function recordInstantNoteCorrection(input: z.infer<typeof CorrectionSchema>) {
  const user = await requireChef()
  const validated = CorrectionSchema.parse(input)
  const db: Db = createServerClient()

  const { data: correction, error } = await db
    .from('chef_note_corrections')
    .insert({
      chef_id: user.entityId,
      quick_note_id: validated.quickNoteId,
      interpretation_id: validated.interpretationId ?? null,
      component_id: validated.componentId ?? null,
      correction_type: validated.correctionType,
      original_value: validated.originalValue,
      corrected_value: validated.correctedValue,
      notes: validated.notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[note-intelligence] correction insert failed:', error)
    return { success: false, error: 'Failed to save correction' }
  }

  try {
    const pattern = JSON.stringify(validated.originalValue).slice(0, 500)
    const instruction =
      validated.notes?.trim() ||
      `Chef corrected ${validated.correctionType}. Prefer the corrected value when similar notes appear.`
    await db.from('chef_note_learning_rules').insert({
      chef_id: user.entityId,
      correction_id: correction?.id ?? null,
      rule_type: validated.correctionType,
      pattern,
      instruction,
      weight: validated.correctionType === 'routing' ? 12 : 10,
    })

    await db.from('chef_note_trace_links').insert({
      chef_id: user.entityId,
      quick_note_id: validated.quickNoteId,
      interpretation_id: validated.interpretationId ?? null,
      component_id: validated.componentId ?? null,
      link_kind: 'correction_to_learning',
      derived_type: 'chef_note_learning_rules',
      route_layer: 'Learning Loop',
      metadata: { correctionType: validated.correctionType },
    })
  } catch (learningErr) {
    console.error('[note-intelligence] learning rule side effect failed:', learningErr)
  }

  if (validated.interpretationId) {
    await db
      .from('chef_note_interpretations')
      .update({ status: 'corrected', updated_at: new Date().toISOString() })
      .eq('id', validated.interpretationId)
      .eq('chef_id', user.entityId)
  }

  revalidateNoteIntelligence()
  return { success: true }
}

export async function markInstantNoteReviewed(interpretationId: string) {
  const user = await requireChef()
  const parsed = z.string().uuid().parse(interpretationId)
  const db: Db = createServerClient()

  const { data: interpretation } = await db
    .from('chef_note_interpretations')
    .select('quick_note_id')
    .eq('id', parsed)
    .eq('chef_id', user.entityId)
    .single()

  const { error } = await db
    .from('chef_note_interpretations')
    .update({ status: 'corrected', updated_at: new Date().toISOString() })
    .eq('id', parsed)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[note-intelligence] review mark failed:', error)
    return { success: false, error: 'Failed to mark note reviewed' }
  }

  if (interpretation?.quick_note_id) {
    await db
      .from('chef_quick_notes')
      .update({
        status: 'triaged',
        triaged_to: 'note_intelligence_review',
        triaged_ref_id: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interpretation.quick_note_id)
      .eq('chef_id', user.entityId)
  }

  revalidateNoteIntelligence()
  return { success: true }
}
