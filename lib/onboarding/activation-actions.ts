'use server'

// Onboarding Import and First-Week Activation
// Data import from external sources + activation checkpoint tracking for new chefs.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  ImportSource,
  ImportEntity,
  ImportJob,
  ActivationCheckpoint,
  ActivationProgress,
  ActivationStep,
} from './activation-types'

export type { ImportSource, ImportEntity, ImportJob, ActivationCheckpoint, ActivationProgress, ActivationStep }

const ACTIVATION_STEPS: { step: ActivationStep; order: number; label: string }[] = [
  { step: 'profile', order: 1, label: 'Complete your profile' },
  { step: 'first_recipe', order: 2, label: 'Add your first recipe' },
  { step: 'first_menu', order: 3, label: 'Create a menu' },
  { step: 'first_client', order: 4, label: 'Add a client' },
  { step: 'first_event', order: 5, label: 'Schedule an event' },
  { step: 'first_quote', order: 6, label: 'Send a quote' },
  { step: 'settings', order: 7, label: 'Configure settings' },
  { step: 'branding', order: 8, label: 'Set up branding' },
]

// ============================================
// 1. createImportJob
// ============================================

export async function createImportJob(
  source: ImportSource,
  entityType: ImportEntity,
  data: Record<string, unknown>[]
): Promise<ImportJob> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Create the job record
  const { data: job, error: jobError } = await (db as any)
    .from('import_jobs')
    .insert({
      tenant_id: user.tenantId!,
      source,
      entity_type: entityType,
      status: 'processing',
      total_rows: data.length,
      processed_rows: 0,
      error_rows: 0,
      errors: [],
    })
    .select()
    .single()

  if (jobError || !job) {
    throw new Error(jobError?.message || 'Failed to create import job')
  }

  // Process rows into target table
  const errors: { row: number; field: string; message: string }[] = []
  let processedRows = 0

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i]
      const mapped = mapRowToEntity(entityType, row, user.tenantId!)

      const { error: insertError } = await (db as any)
        .from(entityType)
        .insert(mapped)

      if (insertError) {
        errors.push({ row: i + 1, field: 'insert', message: insertError.message })
      } else {
        processedRows++
      }
    } catch (e: any) {
      errors.push({ row: i + 1, field: 'unknown', message: e?.message || 'Unknown error' })
    }
  }

  const finalStatus = errors.length === data.length ? 'failed' : 'completed'

  const { data: updated, error: updateError } = await (db as any)
    .from('import_jobs')
    .update({
      status: finalStatus,
      processed_rows: processedRows,
      error_rows: errors.length,
      errors,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/dashboard')
  return mapImportJob(updated)
}

// ============================================
// 2. getImportJobs
// ============================================

export async function getImportJobs(): Promise<ImportJob[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('import_jobs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapImportJob)
}

// ============================================
// 3. getImportJobDetail
// ============================================

export async function getImportJobDetail(jobId: string): Promise<ImportJob | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!jobId) throw new Error('Job ID required')

  const { data, error } = await (db as any)
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null

  return mapImportJob(data)
}

// ============================================
// 4. getActivationProgress
// ============================================

export async function getActivationProgress(): Promise<ActivationProgress> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Ensure checkpoints exist for this tenant
  await ensureCheckpoints(db, user.tenantId!)

  // Query actual data to determine completion
  const completionMap = await detectCompletion(db, user.tenantId!)

  // Sync detected completions into checkpoint records
  for (const [step, completed] of Object.entries(completionMap)) {
    if (completed) {
      await (db as any)
        .from('activation_checkpoints')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('tenant_id', user.tenantId!)
        .eq('checkpoint', step)
        .eq('completed', false)
    }
  }

  // Fetch updated checkpoints
  const { data: checkpoints, error } = await (db as any)
    .from('activation_checkpoints')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const mapped: ActivationCheckpoint[] = (checkpoints || []).map(mapCheckpoint)
  const completedCount = mapped.filter((c) => c.completed).length
  const overallPercent = mapped.length > 0 ? Math.round((completedCount / mapped.length) * 100) : 0
  const currentStep = mapped.find((c) => !c.completed)?.checkpoint || 'all_done'
  const nextRecommendation = getRecommendation(mapped)

  // Days active since tenant creation
  const { data: chef } = await (db as any)
    .from('chefs')
    .select('created_at')
    .eq('id', user.tenantId!)
    .single()

  const createdAt = chef?.created_at ? new Date(chef.created_at) : new Date()
  const daysActive = Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    tenantId: user.tenantId!,
    checkpoints: mapped,
    overallPercent,
    currentStep,
    daysActive,
    nextRecommendation,
  }
}

// ============================================
// 5. completeCheckpoint
// ============================================

export async function completeCheckpoint(checkpoint: ActivationStep): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await ensureCheckpoints(db, user.tenantId!)

  const { error } = await (db as any)
    .from('activation_checkpoints')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('tenant_id', user.tenantId!)
    .eq('checkpoint', checkpoint)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

// ============================================
// 6. getActivationRecommendation
// ============================================

export async function getActivationRecommendation(): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  await ensureCheckpoints(db, user.tenantId!)

  const { data: checkpoints, error } = await (db as any)
    .from('activation_checkpoints')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const mapped = (checkpoints || []).map(mapCheckpoint)
  return getRecommendation(mapped)
}

// ============================================
// 7. resetActivation
// ============================================

export async function resetActivation(): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await (db as any)
    .from('activation_checkpoints')
    .delete()
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

// ============================================
// Internal helpers
// ============================================

async function ensureCheckpoints(db: any, tenantId: string): Promise<void> {
  const { data: existing } = await (db as any)
    .from('activation_checkpoints')
    .select('checkpoint')
    .eq('tenant_id', tenantId)

  const existingSteps = new Set((existing || []).map((r: any) => r.checkpoint))

  const missing = ACTIVATION_STEPS.filter((s) => !existingSteps.has(s.step))
  if (missing.length === 0) return

  const rows = missing.map((s) => ({
    tenant_id: tenantId,
    checkpoint: s.step,
    completed: false,
    sort_order: s.order,
  }))

  await (db as any).from('activation_checkpoints').insert(rows)
}

async function detectCompletion(
  db: any,
  tenantId: string
): Promise<Record<ActivationStep, boolean>> {
  const result: Record<ActivationStep, boolean> = {
    profile: false,
    first_recipe: false,
    first_menu: false,
    first_client: false,
    first_event: false,
    first_quote: false,
    settings: false,
    branding: false,
  }

  // Profile: check chef has display_name
  const { data: chef } = await (db as any)
    .from('chefs')
    .select('display_name, bio')
    .eq('id', tenantId)
    .single()
  if (chef?.display_name && chef.display_name.trim().length > 0) {
    result.profile = true
  }

  // First recipe
  const { data: recipes } = await (db as any)
    .from('recipes')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (recipes && recipes.length > 0) result.first_recipe = true

  // First menu
  const { data: menus } = await (db as any)
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (menus && menus.length > 0) result.first_menu = true

  // First client
  const { data: clientRows } = await (db as any)
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (clientRows && clientRows.length > 0) result.first_client = true

  // First event
  const { data: events } = await (db as any)
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (events && events.length > 0) result.first_event = true

  // First quote
  const { data: quotes } = await (db as any)
    .from('quotes')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (quotes && quotes.length > 0) result.first_quote = true

  // Settings: check chef_settings exists
  const { data: settings } = await (db as any)
    .from('chef_settings')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (settings && settings.length > 0) result.settings = true

  // Branding: check chef has logo or brand color
  const { data: branding } = await (db as any)
    .from('chefs')
    .select('logo_url, brand_color')
    .eq('id', tenantId)
    .single()
  if (branding?.logo_url || branding?.brand_color) result.branding = true

  return result
}

function getRecommendation(checkpoints: ActivationCheckpoint[]): string {
  const incomplete = checkpoints.find((c) => !c.completed)
  if (!incomplete) return 'All activation steps completed. You are ready to go!'

  const stepConfig = ACTIVATION_STEPS.find((s) => s.step === incomplete.checkpoint)
  return stepConfig?.label || `Complete: ${incomplete.checkpoint}`
}

function mapImportJob(row: any): ImportJob {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    source: row.source,
    entityType: row.entity_type,
    status: row.status,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    errorRows: row.error_rows,
    errors: row.errors || [],
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function mapCheckpoint(row: any): ActivationCheckpoint {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    checkpoint: row.checkpoint,
    completed: row.completed,
    completedAt: row.completed_at,
    order: row.sort_order,
  }
}

function mapRowToEntity(
  entityType: ImportEntity,
  row: Record<string, unknown>,
  tenantId: string
): Record<string, unknown> {
  const base = { tenant_id: tenantId }

  switch (entityType) {
    case 'clients':
      return {
        ...base,
        first_name: row.first_name || row.firstName || row.name || '',
        last_name: row.last_name || row.lastName || '',
        email: row.email || null,
        phone: row.phone || null,
        notes: row.notes || null,
      }
    case 'recipes':
      return {
        ...base,
        title: row.title || row.name || 'Untitled Recipe',
        description: row.description || null,
        servings: row.servings || null,
        prep_time: row.prep_time || row.prepTime || null,
        cook_time: row.cook_time || row.cookTime || null,
      }
    case 'events':
      return {
        ...base,
        title: row.title || row.name || 'Imported Event',
        event_date: row.event_date || row.date || null,
        guest_count: row.guest_count || row.guests || null,
        notes: row.notes || null,
      }
    case 'ingredients':
      return {
        ...base,
        name: row.name || row.ingredient || 'Unknown Ingredient',
        category: row.category || null,
        unit: row.unit || null,
      }
    default:
      return base
  }
}
