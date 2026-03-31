'use server'

// Service Lifecycle Intelligence - Server Actions
// Public actions (UI-triggered, session-required) and internal functions
// (pipeline-triggered, accept chefId directly).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  runFullDetection,
  detectFromFields,
  type InquiryRow,
  type CheckpointDetection,
} from './detector'
import { ensureTemplateSeeded } from './seed'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StageProgress {
  stageNumber: number
  stageName: string
  total: number
  completed: number
  checkpoints: ProgressCheckpoint[]
}

interface ProgressCheckpoint {
  checkpointKey: string
  checkpointLabel: string
  stageNumber: number
  status: string
  isRequired: boolean
  clientVisible: boolean
  clientLabel: string | null
  detectedAt: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  evidenceType: string | null
  evidenceExcerpt: string | null
  extractedData: any
  notes: string | null
}

interface ClientStageView {
  stageNumber: number
  stageName: string
  checkpoints: {
    label: string
    status: string
    value?: string
  }[]
}

interface CheckpointUpdate {
  key: string
  status: string
  evidence_type?: string
  evidence_source?: string
  evidence_excerpt?: string
  extracted_data?: any
}

// ---------------------------------------------------------------------------
// Public Server Actions (UI-triggered, session-required)
// ---------------------------------------------------------------------------

export async function getLifecycleProgress(
  inquiryId?: string,
  eventId?: string
): Promise<{
  stages: StageProgress[]
  overallPercent: number
  currentStage: number
  nextActions: string[]
}> {
  const user = await requireChef()
  const chefId = user.tenantId!

  // Ensure template exists
  await ensureTemplateSeeded(chefId)

  return getLifecycleProgressInternal(chefId, inquiryId, eventId)
}

export async function getLifecycleProgressForClient(
  groupToken: string
): Promise<{ stages: ClientStageView[] }> {
  const db = createServerClient()

  // Look up the hub group by token to find inquiry
  const groupResult = await db
    .from('hub_groups')
    .select('id, inquiry_id, tenant_id')
    .eq('group_token', groupToken)
    .single()

  if (groupResult.error || !groupResult.data) {
    return { stages: [] }
  }

  const { inquiry_id, tenant_id } = groupResult.data as any

  if (!inquiry_id || !tenant_id) {
    return { stages: [] }
  }

  const full = await getLifecycleProgressInternal(tenant_id, inquiry_id, null)

  // Filter to client-visible checkpoints only
  const clientStages: ClientStageView[] = full.stages
    .map((stage) => {
      const visibleCheckpoints = stage.checkpoints
        .filter((cp) => cp.clientVisible)
        .map((cp) => ({
          label: cp.clientLabel || cp.checkpointLabel,
          status: cp.status,
          value: cp.extractedData ? formatExtractedValue(cp.extractedData) : undefined,
        }))

      if (visibleCheckpoints.length === 0) return null

      return {
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        checkpoints: visibleCheckpoints,
      }
    })
    .filter(Boolean) as ClientStageView[]

  return { stages: clientStages }
}

export async function updateCheckpoint(
  inquiryId: string | null,
  eventId: string | null,
  checkpointKey: string,
  status: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const chefId = user.tenantId!

  const validStatuses = ['not_started', 'auto_detected', 'confirmed', 'skipped', 'not_applicable']
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status' }
  }

  return updateCheckpointInternal(chefId, inquiryId, eventId, checkpointKey, status, notes)
}

export async function bulkUpdateCheckpoints(
  inquiryId: string | null,
  eventId: string | null,
  updates: CheckpointUpdate[]
): Promise<{ success: boolean; updated: number }> {
  const user = await requireChef()
  const chefId = user.tenantId!

  return bulkUpdateCheckpointsInternal(chefId, inquiryId, eventId, updates)
}

export async function skipCheckpoint(
  inquiryId: string | null,
  eventId: string | null,
  checkpointKey: string,
  reason: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const chefId = user.tenantId!

  return updateCheckpointInternal(chefId, inquiryId, eventId, checkpointKey, 'skipped', reason)
}

export async function analyzeConversation(
  inquiryId: string,
  messageText?: string,
  fullThread?: string
): Promise<{ detected: CheckpointDetection[]; missing: string[]; stageAssessment: number }> {
  const user = await requireChef()
  const chefId = user.tenantId!

  const db = createServerClient()

  // Fetch the inquiry
  const inquiryResult = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', chefId)
    .single()

  if (inquiryResult.error || !inquiryResult.data) {
    return { detected: [], missing: [], stageAssessment: 1 }
  }

  const inquiry = inquiryResult.data as unknown as InquiryRow
  const textToAnalyze = fullThread || messageText || inquiry.source_message || ''

  const result = await runFullDetection(inquiry, textToAnalyze)

  // Auto-update progress for detected checkpoints
  if (result.detected.length > 0) {
    await bulkUpdateCheckpointsInternal(
      chefId,
      inquiryId,
      null,
      result.detected.map((d) => ({
        key: d.checkpoint_key,
        status: 'auto_detected',
        evidence_type: 'conversation',
        evidence_excerpt: d.excerpt,
        extracted_data: d.value,
      }))
    )
  }

  // Log the detection
  try {
    await logDetection(db, {
      chefId,
      inquiryId,
      eventId: null,
      sourceType: 'conversation',
      sourceId: null,
      rawContent: textToAnalyze.substring(0, 2000),
      detectionMethod: result.method,
      checkpointsDetected: result.detected.map((d) => ({
        key: d.checkpoint_key,
        value: d.value,
        confidence: d.confidence,
        excerpt: d.excerpt,
      })),
      checkpointsMissing: result.missing,
      stageAssessment: result.stageAssessment,
      processingTimeMs: 0,
    })
  } catch (err) {
    console.error('[lifecycle] Failed to log detection', err)
  }

  revalidatePath(`/inquiries/${inquiryId}`)

  return {
    detected: result.detected,
    missing: result.missing,
    stageAssessment: result.stageAssessment,
  }
}

export async function updateTemplateCheckpoint(
  checkpointKey: string,
  updates: {
    is_active?: boolean
    is_required?: boolean
    client_visible?: boolean
    client_label?: string
  }
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const db = createServerClient()

  const setClauses: string[] = []
  const values: any[] = []
  let paramIdx = 3 // $1 = chefId, $2 = checkpointKey

  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIdx}`)
    values.push(updates.is_active)
    paramIdx++
  }
  if (updates.is_required !== undefined) {
    setClauses.push(`is_required = $${paramIdx}`)
    values.push(updates.is_required)
    paramIdx++
  }
  if (updates.client_visible !== undefined) {
    setClauses.push(`client_visible = $${paramIdx}`)
    values.push(updates.client_visible)
    paramIdx++
  }
  if (updates.client_label !== undefined) {
    setClauses.push(`client_label = $${paramIdx}`)
    values.push(updates.client_label)
    paramIdx++
  }

  if (setClauses.length === 0) {
    return { success: true }
  }

  setClauses.push('updated_at = now()')

  const result = await db
    .from('service_lifecycle_templates')
    .update(
      Object.fromEntries([...Object.entries(updates), ['updated_at', new Date().toISOString()]])
    )
    .eq('chef_id', chefId)
    .eq('checkpoint_key', checkpointKey)

  return { success: !result.error }
}

export async function getNextMissingInfo(
  inquiryId: string
): Promise<{ missingCheckpoints: { key: string; label: string }[]; suggestedQuestion: string }> {
  const user = await requireChef()
  const chefId = user.tenantId!

  const progress = await getLifecycleProgressInternal(chefId, inquiryId, null)

  // Find missing required checkpoints in stages 1-3
  const missing: { key: string; label: string }[] = []
  for (const stage of progress.stages) {
    if (stage.stageNumber > 3) break
    for (const cp of stage.checkpoints) {
      if (cp.isRequired && cp.status === 'not_started') {
        missing.push({ key: cp.checkpointKey, label: cp.checkpointLabel })
      }
    }
  }

  // Generate a simple suggested question from missing items
  const suggestedQuestion =
    missing.length > 0
      ? `Could you let me know about: ${missing
          .slice(0, 3)
          .map((m) => m.label.toLowerCase())
          .join(', ')}?`
      : 'All key information has been gathered.'

  return { missingCheckpoints: missing, suggestedQuestion }
}

export async function getMissingInfoDraftEmail(
  inquiryId: string
): Promise<{ draft: string; missingItems: string[] }> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const db = createServerClient()

  // Get inquiry for context
  const inquiryResult = await db
    .from('inquiries')
    .select('contact_name, confirmed_date, confirmed_guest_count, confirmed_occasion')
    .eq('id', inquiryId)
    .eq('tenant_id', chefId)
    .single()

  const inquiry = inquiryResult.data as any

  // Get missing info
  const { missingCheckpoints } = await getNextMissingInfo(inquiryId)

  if (missingCheckpoints.length === 0) {
    return { draft: '', missingItems: [] }
  }

  const missingItems = missingCheckpoints.map((m) => m.label)

  // Try Ollama for a natural-sounding email draft
  try {
    const DraftSchema = z.object({
      email_body: z.string(),
    })

    const contactName = inquiry?.contact_name || 'there'
    const occasion = inquiry?.confirmed_occasion || 'your event'

    const result = await parseWithOllama(
      `You are a private chef writing a warm, professional follow-up email to a client.
Write a short email (3-5 sentences max) asking for the missing information listed below.
Be conversational, not robotic. No bold headers. No bullet points. No em dashes.
Address the client by first name. Reference the occasion if known.
End with something warm, not "please let me know."`,
      `Client: ${contactName}
Occasion: ${occasion}
Missing information needed:
${missingItems.map((m) => `- ${m}`).join('\n')}`,
      DraftSchema,
      { timeoutMs: 15000, maxTokens: 512 }
    )

    return { draft: result.email_body, missingItems }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      // Fallback: simple template
      const name = inquiry?.contact_name?.split(' ')[0] || 'Hi'
      const items = missingItems
        .slice(0, 3)
        .map((m) => m.toLowerCase())
        .join(', ')
      return {
        draft: `Hi ${name},\n\nThanks for reaching out about ${inquiry?.confirmed_occasion || 'your dinner'}. To put together the best experience, I still need a few details: ${items}.\n\nWhenever you get a chance, just reply here or update your Dinner Circle page.\n\nLooking forward to cooking for you!`,
        missingItems,
      }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Internal Functions (pipeline-triggered, no session required)
// Called from Gmail sync, cron jobs, etc.
// ---------------------------------------------------------------------------

export async function getLifecycleProgressInternal(
  chefId: string,
  inquiryId?: string | null,
  eventId?: string | null
): Promise<{
  stages: StageProgress[]
  overallPercent: number
  currentStage: number
  nextActions: string[]
}> {
  const db = createServerClient()

  // Get all active template checkpoints for this chef
  const templateResult = await db
    .from('service_lifecycle_templates')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_active', true)
    .order('stage_number', { ascending: true })

  if (templateResult.error || !templateResult.data) {
    return { stages: [], overallPercent: 0, currentStage: 1, nextActions: [] }
  }

  const templates = templateResult.data as any[]

  // Get progress records for this inquiry/event
  let progressRecords: any[] = []
  if (inquiryId) {
    const progressResult = await db
      .from('service_lifecycle_progress')
      .select('*')
      .eq('chef_id', chefId)
      .eq('inquiry_id', inquiryId)

    progressRecords = (progressResult.data as any[]) || []
  } else if (eventId) {
    const progressResult = await db
      .from('service_lifecycle_progress')
      .select('*')
      .eq('chef_id', chefId)
      .eq('event_id', eventId)

    progressRecords = (progressResult.data as any[]) || []
  }

  const progressMap = new Map<string, any>()
  for (const p of progressRecords) {
    progressMap.set(p.checkpoint_key, p)
  }

  // Build stage groups
  const stageMap = new Map<number, StageProgress>()

  for (const t of templates) {
    if (!stageMap.has(t.stage_number)) {
      stageMap.set(t.stage_number, {
        stageNumber: t.stage_number,
        stageName: t.stage_name,
        total: 0,
        completed: 0,
        checkpoints: [],
      })
    }

    const stage = stageMap.get(t.stage_number)!
    stage.total++

    const progress = progressMap.get(t.checkpoint_key)
    const status = progress?.status || 'not_started'

    if (['confirmed', 'auto_detected', 'skipped', 'not_applicable'].includes(status)) {
      stage.completed++
    }

    stage.checkpoints.push({
      checkpointKey: t.checkpoint_key,
      checkpointLabel: t.checkpoint_label,
      stageNumber: t.stage_number,
      status,
      isRequired: t.is_required,
      clientVisible: t.client_visible,
      clientLabel: t.client_label,
      detectedAt: progress?.detected_at || null,
      confirmedAt: progress?.confirmed_at || null,
      confirmedBy: progress?.confirmed_by || null,
      evidenceType: progress?.evidence_type || null,
      evidenceExcerpt: progress?.evidence_excerpt || null,
      extractedData: progress?.extracted_data || null,
      notes: progress?.notes || null,
    })
  }

  const stages = Array.from(stageMap.values()).sort((a, b) => a.stageNumber - b.stageNumber)

  // Overall percentage
  const totalCheckpoints = stages.reduce((sum, s) => sum + s.total, 0)
  const completedCheckpoints = stages.reduce((sum, s) => sum + s.completed, 0)
  const overallPercent =
    totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0

  // Current stage = highest stage with any completed checkpoints, minimum 1
  let currentStage = 1
  for (const stage of stages) {
    if (stage.completed > 0) {
      currentStage = stage.stageNumber
    }
  }

  // Next actions = missing required checkpoints in current/next stage
  const nextActions: string[] = []
  for (const stage of stages) {
    if (stage.stageNumber < currentStage) continue
    if (stage.stageNumber > currentStage + 1) break
    for (const cp of stage.checkpoints) {
      if (cp.isRequired && cp.status === 'not_started') {
        nextActions.push(cp.checkpointLabel)
      }
    }
  }

  return { stages, overallPercent, currentStage, nextActions: nextActions.slice(0, 5) }
}

export async function bulkUpdateCheckpointsInternal(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  updates: CheckpointUpdate[]
): Promise<{ success: boolean; updated: number }> {
  const db = createServerClient()
  let updatedCount = 0

  for (const update of updates) {
    try {
      // Check if progress record exists
      let existingResult
      if (inquiryId) {
        existingResult = await db
          .from('service_lifecycle_progress')
          .select('id, status')
          .eq('chef_id', chefId)
          .eq('inquiry_id', inquiryId)
          .eq('checkpoint_key', update.key)
          .single()
      } else if (eventId) {
        existingResult = await db
          .from('service_lifecycle_progress')
          .select('id, status')
          .eq('chef_id', chefId)
          .eq('event_id', eventId)
          .eq('checkpoint_key', update.key)
          .single()
      }

      // Don't downgrade: if already confirmed, don't overwrite with auto_detected
      if (existingResult?.data) {
        const existing = existingResult.data as any
        if (existing.status === 'confirmed' && update.status === 'auto_detected') {
          continue // don't downgrade
        }
      }

      // Get stage_number from template
      const templateResult = await db
        .from('service_lifecycle_templates')
        .select('stage_number')
        .eq('chef_id', chefId)
        .eq('checkpoint_key', update.key)
        .single()

      const stageNumber = (templateResult.data as any)?.stage_number || 1

      if (existingResult?.data) {
        // Update existing
        const updateData: any = {
          status: update.status,
          updated_at: new Date().toISOString(),
        }

        if (update.status === 'auto_detected') {
          updateData.detected_at = new Date().toISOString()
        }
        if (update.status === 'confirmed') {
          updateData.confirmed_at = new Date().toISOString()
          updateData.confirmed_by = 'system'
        }
        if (update.evidence_type) updateData.evidence_type = update.evidence_type
        if (update.evidence_source) updateData.evidence_source = update.evidence_source
        if (update.evidence_excerpt) updateData.evidence_excerpt = update.evidence_excerpt
        if (update.extracted_data !== undefined)
          updateData.extracted_data = JSON.stringify(update.extracted_data)

        const result = await db
          .from('service_lifecycle_progress')
          .update(updateData)
          .eq('id', (existingResult.data as any).id)

        if (!result.error) updatedCount++
      } else {
        // Insert new
        const insertData: any = {
          chef_id: chefId,
          checkpoint_key: update.key,
          stage_number: stageNumber,
          status: update.status,
        }

        if (inquiryId) insertData.inquiry_id = inquiryId
        if (eventId) insertData.event_id = eventId

        if (update.status === 'auto_detected') {
          insertData.detected_at = new Date().toISOString()
        }
        if (update.status === 'confirmed') {
          insertData.confirmed_at = new Date().toISOString()
          insertData.confirmed_by = 'system'
        }
        if (update.evidence_type) insertData.evidence_type = update.evidence_type
        if (update.evidence_source) insertData.evidence_source = update.evidence_source
        if (update.evidence_excerpt) insertData.evidence_excerpt = update.evidence_excerpt
        if (update.extracted_data !== undefined)
          insertData.extracted_data = JSON.stringify(update.extracted_data)

        const result = await db.from('service_lifecycle_progress').insert(insertData)

        if (!result.error) updatedCount++
      }
    } catch (err) {
      console.error(`[lifecycle] Failed to update checkpoint ${update.key}`, err)
    }
  }

  // Bust caches
  if (inquiryId) {
    revalidatePath(`/inquiries/${inquiryId}`)
  }
  revalidatePath('/inquiries')
  revalidatePath('/dashboard')

  return { success: true, updated: updatedCount }
}

export async function updateCheckpointInternal(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  checkpointKey: string,
  status: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await bulkUpdateCheckpointsInternal(chefId, inquiryId, eventId, [
    { key: checkpointKey, status },
  ])

  if (notes && result.success) {
    const db = createServerClient()
    if (inquiryId) {
      await db
        .from('service_lifecycle_progress')
        .update({ notes })
        .eq('chef_id', chefId)
        .eq('inquiry_id', inquiryId)
        .eq('checkpoint_key', checkpointKey)
    } else if (eventId) {
      await db
        .from('service_lifecycle_progress')
        .update({ notes })
        .eq('chef_id', chefId)
        .eq('event_id', eventId)
        .eq('checkpoint_key', checkpointKey)
    }
  }

  return { success: result.success }
}

// ---------------------------------------------------------------------------
// Detection runner for Gmail sync and inquiry pipeline
// Called from lib/gmail/sync.ts and lib/inquiries/actions.ts
// ---------------------------------------------------------------------------

export async function runDetectionAndUpdate(
  chefId: string,
  inquiryId: string,
  eventId: string | null,
  sourceType: string,
  sourceId: string | null,
  textContent: string,
  inquiry: InquiryRow,
  event?: { status?: string }
): Promise<{ detected: number; missing: number }> {
  const startTime = Date.now()

  const result = await runFullDetection(inquiry, textContent, event)

  if (result.detected.length > 0) {
    await bulkUpdateCheckpointsInternal(
      chefId,
      inquiryId,
      eventId,
      result.detected.map((d) => ({
        key: d.checkpoint_key,
        status: 'auto_detected',
        evidence_type: sourceType,
        evidence_source: sourceId || undefined,
        evidence_excerpt: d.excerpt,
        extracted_data: d.value,
      }))
    )
  }

  // Log detection
  const db = createServerClient()
  try {
    await logDetection(db, {
      chefId,
      inquiryId,
      eventId,
      sourceType,
      sourceId,
      rawContent: textContent.substring(0, 2000),
      detectionMethod: result.method,
      checkpointsDetected: result.detected.map((d) => ({
        key: d.checkpoint_key,
        value: d.value,
        confidence: d.confidence,
        excerpt: d.excerpt,
      })),
      checkpointsMissing: result.missing,
      stageAssessment: result.stageAssessment,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (err) {
    console.error('[lifecycle] Failed to log detection', err)
  }

  return { detected: result.detected.length, missing: result.missing.length }
}

// Convenience: run detection from fields only (no text, no AI)
// Used after inquiry field updates
export async function runFieldDetectionAndUpdate(
  chefId: string,
  inquiryId: string,
  inquiry: InquiryRow,
  event?: { status?: string }
): Promise<{ detected: number }> {
  const detections = detectFromFields(inquiry, event)

  if (detections.length > 0) {
    await bulkUpdateCheckpointsInternal(
      chefId,
      inquiryId,
      null,
      detections.map((d) => ({
        key: d.checkpoint_key,
        status: 'auto_detected',
        evidence_type: 'field',
        evidence_excerpt: d.excerpt,
        extracted_data: d.value,
      }))
    )
  }

  return { detected: detections.length }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatExtractedValue(data: any): string | undefined {
  if (!data) return undefined
  if (typeof data === 'string') return data
  if (typeof data === 'number') return String(data)
  return undefined
}

async function logDetection(
  db: any,
  params: {
    chefId: string
    inquiryId: string | null
    eventId: string | null
    sourceType: string
    sourceId: string | null
    rawContent: string
    detectionMethod: string
    checkpointsDetected: any[]
    checkpointsMissing: string[]
    stageAssessment: number
    processingTimeMs: number
  }
) {
  const insertData: any = {
    chef_id: params.chefId,
    source_type: params.sourceType,
    detection_method: params.detectionMethod,
    checkpoints_detected: JSON.stringify(params.checkpointsDetected),
    checkpoints_missing: JSON.stringify(params.checkpointsMissing),
    stage_assessment: params.stageAssessment,
    processing_time_ms: params.processingTimeMs,
  }

  if (params.inquiryId) insertData.inquiry_id = params.inquiryId
  if (params.eventId) insertData.event_id = params.eventId
  if (params.sourceId) insertData.source_id = params.sourceId
  if (params.rawContent) insertData.raw_content = params.rawContent

  await db.from('lifecycle_detection_log').insert(insertData)
}
