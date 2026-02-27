// Menu Upload Pipeline — Server Actions
// Manages the upload-to-dish-index pipeline:
// upload → extract text → parse with Ollama → chef review → dish index

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { extractTextFromFile } from './extract-text'
import { parseMenuText } from './parse-menu-text'
import type { ParsedDish } from './parse-menu-text'
import { canonicalizeDishName } from './dish-index-constants'

// ============================================
// SCHEMAS
// ============================================

const CreateUploadJobSchema = z.object({
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  event_date: z.string().optional(),
  event_type: z.string().optional(),
  client_name: z.string().optional(),
  notes: z.string().optional(),
})

const ApproveDishesBatchSchema = z.object({
  job_id: z.string().uuid(),
  dishes: z.array(
    z.object({
      dish_name: z.string().min(1),
      course: z.string().min(1),
      description: z.string().default(''),
      dietary_tags: z.array(z.string()).default([]),
    })
  ),
})

// ============================================
// UPLOAD JOB CRUD
// ============================================

/**
 * Create an upload job record and store the file.
 * Called after the file is uploaded to Supabase Storage.
 */
export async function createUploadJob(input: z.infer<typeof CreateUploadJobSchema>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const parsed = CreateUploadJobSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_upload_jobs')
    .insert({
      tenant_id: tenantId,
      file_name: parsed.file_name,
      file_type: parsed.file_type,
      status: 'uploaded',
      event_date: parsed.event_date || null,
      event_type: parsed.event_type || null,
      client_name: parsed.client_name || null,
      notes: parsed.notes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create upload job: ${error.message}`)

  revalidatePath('/menus/upload')
  return data
}

/**
 * Get all upload jobs for the current chef, newest first.
 */
export async function getUploadJobs(statusFilter?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('menu_upload_jobs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch upload jobs: ${error.message}`)
  return data ?? []
}

/**
 * Get a single upload job by ID.
 */
export async function getUploadJobById(jobId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_upload_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Upload job not found: ${error.message}`)
  return data
}

/**
 * Process an uploaded file: extract text → parse with Ollama → save results.
 * This is the main pipeline function called after upload.
 */
export async function processUploadJob(jobId: string, fileBuffer: Buffer, fileName: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // 1. Mark as extracting
  await supabase
    .from('menu_upload_jobs')
    .update({ status: 'extracting' })
    .eq('id', jobId)
    .eq('tenant_id', tenantId)

  let extractedText: string
  let ocrConfidence: number | undefined

  // 2. Extract text
  try {
    const result = await extractTextFromFile(fileBuffer, fileName)
    extractedText = result.text
    ocrConfidence = result.confidence
  } catch (err) {
    await supabase
      .from('menu_upload_jobs')
      .update({
        status: 'failed',
        error_message: `Text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
    revalidatePath('/menus/upload')
    throw err
  }

  // Save extracted text and mark as parsing
  await supabase
    .from('menu_upload_jobs')
    .update({
      extracted_text: extractedText,
      status: 'parsing',
    })
    .eq('id', jobId)
    .eq('tenant_id', tenantId)

  // 3. Parse with Ollama
  try {
    const parseResult = await parseMenuText(extractedText)

    await supabase
      .from('menu_upload_jobs')
      .update({
        parsed_dishes: parseResult.dishes as unknown as Record<string, unknown>[],
        dishes_found: parseResult.dishes.length,
        status: 'review',
        error_message: parseResult.warnings.length > 0 ? parseResult.warnings.join('; ') : null,
      })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
  } catch (err) {
    await supabase
      .from('menu_upload_jobs')
      .update({
        status: 'failed',
        error_message: `Parsing failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
    revalidatePath('/menus/upload')
    throw err
  }

  revalidatePath('/menus/upload')
  return { success: true }
}

/**
 * Process pasted text directly (no file upload).
 * Creates a job record, then parses inline.
 */
export async function processFromPastedText(
  text: string,
  metadata?: {
    event_date?: string
    event_type?: string
    client_name?: string
    notes?: string
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('menu_upload_jobs')
    .insert({
      tenant_id: tenantId,
      file_name: 'Pasted Text',
      file_type: 'text',
      extracted_text: text,
      status: 'parsing',
      event_date: metadata?.event_date || null,
      event_type: metadata?.event_type || null,
      client_name: metadata?.client_name || null,
      notes: metadata?.notes || null,
    })
    .select('id')
    .single()

  if (jobError) throw new Error(`Failed to create job: ${jobError.message}`)

  // Parse
  try {
    const parseResult = await parseMenuText(text)

    await supabase
      .from('menu_upload_jobs')
      .update({
        parsed_dishes: parseResult.dishes as unknown as Record<string, unknown>[],
        dishes_found: parseResult.dishes.length,
        status: 'review',
        error_message: parseResult.warnings.length > 0 ? parseResult.warnings.join('; ') : null,
      })
      .eq('id', job.id)
      .eq('tenant_id', tenantId)

    revalidatePath('/menus/upload')
    return { jobId: job.id, dishes: parseResult.dishes, warnings: parseResult.warnings }
  } catch (err) {
    await supabase
      .from('menu_upload_jobs')
      .update({
        status: 'failed',
        error_message: `Parsing failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      .eq('id', job.id)
      .eq('tenant_id', tenantId)
    revalidatePath('/menus/upload')
    throw err
  }
}

/**
 * Approve parsed dishes from a review and add them to the Dish Index.
 * Chef has reviewed/edited the parsed results — now commit to the index.
 */
export async function approveAndIndexDishes(input: z.infer<typeof ApproveDishesBatchSchema>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()
  const parsed = ApproveDishesBatchSchema.parse(input)

  // Get job metadata for appearance records
  const job = await getUploadJobById(parsed.job_id)
  let indexedCount = 0

  for (const dish of parsed.dishes) {
    const canonical = canonicalizeDishName(dish.dish_name)

    // Check if dish already exists (dedup by canonical name + course)
    const { data: existing } = await supabase
      .from('dish_index')
      .select('id, times_served, first_served')
      .eq('tenant_id', tenantId)
      .eq('canonical_name', canonical)
      .eq('course', dish.course)
      .maybeSingle()

    let dishId: string

    if (existing) {
      // Dish exists — increment times_served and update dates
      dishId = existing.id
      const updates: Record<string, unknown> = {
        times_served: existing.times_served + 1,
      }
      if (job.event_date) {
        updates.last_served = job.event_date
        // Update first_served if this event is earlier than the current earliest
        if (!existing.first_served || job.event_date < existing.first_served) {
          updates.first_served = job.event_date
        }
      }
      await supabase.from('dish_index').update(updates).eq('id', dishId).eq('tenant_id', tenantId)
    } else {
      // New dish — insert into index
      const { data: newDish, error: insertError } = await supabase
        .from('dish_index')
        .insert({
          tenant_id: tenantId,
          name: dish.dish_name,
          canonical_name: canonical,
          course: dish.course,
          description: dish.description || null,
          dietary_tags: dish.dietary_tags || [],
          times_served: 1,
          first_served: job.event_date || null,
          last_served: job.event_date || null,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`[dish-index] Failed to insert "${dish.dish_name}":`, insertError.message)
        continue
      }
      dishId = newDish.id
    }

    // Create appearance record
    await supabase.from('dish_appearances').insert({
      dish_id: dishId,
      tenant_id: tenantId,
      menu_upload_job_id: parsed.job_id,
      event_date: job.event_date || null,
      event_type: job.event_type || null,
      client_name: job.client_name || null,
    })

    indexedCount++
  }

  // Mark job as completed
  await supabase
    .from('menu_upload_jobs')
    .update({
      status: 'completed',
      dishes_approved: indexedCount,
    })
    .eq('id', parsed.job_id)
    .eq('tenant_id', tenantId)

  revalidatePath('/menus/upload')
  revalidatePath('/culinary/dish-index')
  return { indexed: indexedCount }
}

/**
 * Check if a file with the same hash has already been uploaded.
 */
export async function checkDuplicateUpload(fileHash: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('menu_upload_jobs')
    .select('id, file_name, created_at, status')
    .eq('tenant_id', user.tenantId!)
    .eq('file_hash', fileHash)
    .limit(1)
    .maybeSingle()

  return data
}

/**
 * Delete an upload job (only if not completed).
 */
export async function deleteUploadJob(jobId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('menu_upload_jobs')
    .delete()
    .eq('id', jobId)
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'completed')

  if (error) throw new Error(`Failed to delete upload job: ${error.message}`)
  revalidatePath('/menus/upload')
}
