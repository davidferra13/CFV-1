'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
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
  type InterpretedNote,
  type InterpretedNoteAction,
  type InterpretedNoteComponent,
  type NoteComponentType,
} from './intelligence-core'

const CaptureNoteSchema = z.object({
  text: z.string().min(1).max(10000),
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
    })
    .select('id, text, status, triaged_to, triaged_ref_id, created_at, updated_at')
    .single()

  if (error || !data) {
    console.error('[note-intelligence] raw note insert failed:', error)
    return { success: false, error: 'Failed to save note' }
  }

  revalidatePath('/capture')
  revalidatePath('/dashboard')
  return { success: true, note: data }
}

export async function processInstantNote(input: z.infer<typeof ProcessNoteSchema>) {
  const user = await requireChef()
  const validated = ProcessNoteSchema.parse(input)
  const db: Db = createServerClient()

  const { data: note, error: noteError } = await db
    .from('chef_quick_notes')
    .select('id, text, status')
    .eq('id', validated.quickNoteId)
    .eq('chef_id', user.entityId)
    .single()

  if (noteError || !note) {
    return { success: false, error: 'Note not found' }
  }

  const existing = await getExistingInterpretation(db, user.entityId, note.id)
  if (existing) {
    return { success: true, interpretation: existing, alreadyProcessed: true }
  }

  const interpretationId = await createInterpretationRow(db, user.entityId, note.id, note.text)

  try {
    const corrections = await loadCorrectionContext(db, user.entityId)
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
          latencySensitive: true,
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
          user.entityId,
          interpretationId,
          note.id,
          component,
          needsReview
        )
      )
    }

    await routeComponents(
      db,
      user.entityId,
      user.id,
      note.text,
      componentIds,
      interpreted.components,
      needsReview
    )
    await routeActions(
      db,
      user.entityId,
      interpretationId,
      note.id,
      note.text,
      interpreted,
      componentIds,
      needsReview
    )

    const status = needsReview
      ? interpreted.confidenceBand === 'medium'
        ? 'needs_confirmation'
        : 'review_queue'
      : 'auto_committed'

    await updateInterpretationRow(db, interpretationId, {
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
      error: null,
    })

    if (!needsReview) {
      const { error: triageError } = await db
        .from('chef_quick_notes')
        .update({
          status: 'triaged',
          triaged_to: 'note_intelligence',
          triaged_ref_id: interpretationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', note.id)
        .eq('chef_id', user.entityId)

      if (triageError) {
        console.error('[note-intelligence] quick note triage update failed:', triageError)
      }
    }

    revalidateNoteIntelligence()
    return {
      success: true,
      interpretationId,
      confidenceBand: interpreted.confidenceBand,
      reviewRequired: needsReview,
      components: interpreted.components.length,
      actions: interpreted.actions.length,
    }
  } catch (err) {
    const isOffline = err instanceof OllamaOfflineError
    const reviewAction = buildFallbackAction(note.text)
    let reviewTaskId: string | null = null

    try {
      reviewTaskId = await createTaskForAction(db, user.entityId, reviewAction, 'high', note.text)
      await insertActionRow(
        db,
        user.entityId,
        interpretationId,
        note.id,
        null,
        reviewAction,
        'created',
        reviewTaskId
      )
    } catch (actionErr) {
      console.error('[note-intelligence] fallback review action failed:', actionErr)
    }

    await updateInterpretationRow(db, interpretationId, {
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
      error: err instanceof Error ? err.message : 'Unknown interpretation error',
    })

    revalidateNoteIntelligence()
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

export async function getInstantNoteReviewQueue() {
  const user = await requireChef()
  const db: Db = createServerClient()

  const { data, error } = await db
    .from('chef_note_interpretations')
    .select(
      'id, quick_note_id, raw_text, confidence_score, confidence_band, status, interpretation, time_intelligence, ambiguity_notes, error, created_at'
    )
    .eq('chef_id', user.entityId)
    .in('status', ['needs_confirmation', 'review_queue', 'failed'])
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
      'id, title, description, action_type, urgency, status, due_date, routed_to, routed_ref_id, created_at'
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

export async function recordInstantNoteCorrection(input: z.infer<typeof CorrectionSchema>) {
  const user = await requireChef()
  const validated = CorrectionSchema.parse(input)
  const db: Db = createServerClient()

  const { error } = await db.from('chef_note_corrections').insert({
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

  if (error) {
    console.error('[note-intelligence] correction insert failed:', error)
    return { success: false, error: 'Failed to save correction' }
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
