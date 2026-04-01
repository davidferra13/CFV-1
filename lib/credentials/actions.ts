'use server'

// Chef Credentials Server Actions
// Handles work history, public achievements, charity impact, and private resume.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { upload, remove } from '@/lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChefWorkHistoryEntry = {
  id: string
  chef_id: string
  role_title: string
  organization_name: string
  location_label: string | null
  start_date: string | null
  end_date: string | null
  is_current: boolean
  summary: string | null
  notable_credits: string[]
  display_order: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export type PublicCharityImpact = {
  totalHours: number
  totalEntries: number
  uniqueOrgs: number
  verified501cOrgs: number
  publicCharityPercent: number | null
  publicCharityNote: string | null
}

export type PrivateResumeStatus = {
  hasResume: boolean
  filename: string | null
  updatedAt: string | null
  documentId: string | null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const WorkHistorySchema = z.object({
  roleTitle: z.string().min(1, 'Role title is required').max(200),
  organizationName: z.string().min(1, 'Organization name is required').max(300),
  locationLabel: z.string().max(200).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  isCurrent: z.boolean().default(false),
  summary: z.string().max(2000).optional().nullable(),
  notableCredits: z.array(z.string().max(500)).default([]),
  isPublic: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
})

const CredentialProfileSchema = z.object({
  publicCharityPercent: z.number().min(0).max(100).optional().nullable(),
  publicCharityNote: z.string().max(500).optional().nullable(),
  showResumeAvailableNote: z.boolean(),
})

const RESUME_BUCKET = 'chef-documents'
const RESUME_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const RESUME_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function revalidateCredentialPaths(slug: string | null) {
  revalidatePath('/settings/credentials')
  revalidatePath('/settings/client-preview')
  if (slug) revalidatePath(`/chef/${slug}`)
}

async function getChefSlugForRevalidation(chefId: string): Promise<string | null> {
  try {
    const db: any = createServerClient()
    const { data } = await db.from('chefs').select('slug, booking_slug').eq('id', chefId).single()
    return data?.slug ?? null
  } catch {
    return null
  }
}

// ─── Work History (chef-side) ─────────────────────────────────────────────────

export async function listWorkHistoryEntries(): Promise<ChefWorkHistoryEntry[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_work_history_entries')
    .select('*')
    .eq('chef_id', chef.id)
    .order('display_order', { ascending: true })
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[listWorkHistoryEntries]', error)
    return []
  }
  return data ?? []
}

export async function saveWorkHistoryEntry(
  input: z.input<typeof WorkHistorySchema> & { id?: string }
): Promise<{ success: boolean; entry?: ChefWorkHistoryEntry; error?: string }> {
  const chef = await requireChef()
  const parsed = WorkHistorySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const data = parsed.data

  // If is_current is true, clear end_date
  const endDate = data.isCurrent ? null : (data.endDate ?? null)

  // Validate date order when both are set
  if (data.startDate && endDate && endDate < data.startDate) {
    return { success: false, error: 'End date must be on or after start date' }
  }

  const db: any = createServerClient()
  const row = {
    chef_id: chef.id,
    role_title: data.roleTitle,
    organization_name: data.organizationName,
    location_label: data.locationLabel ?? null,
    start_date: data.startDate ?? null,
    end_date: endDate,
    is_current: data.isCurrent,
    summary: data.summary ?? null,
    notable_credits: data.notableCredits,
    display_order: data.displayOrder,
    is_public: data.isPublic,
    updated_at: new Date().toISOString(),
  }

  let result: any
  if (input.id) {
    result = await db
      .from('chef_work_history_entries')
      .update(row)
      .eq('id', input.id)
      .eq('chef_id', chef.id)
      .select()
      .single()
  } else {
    result = await db
      .from('chef_work_history_entries')
      .insert({ ...row, created_at: new Date().toISOString() })
      .select()
      .single()
  }

  if (result.error) {
    console.error('[saveWorkHistoryEntry]', result.error)
    return { success: false, error: 'Failed to save work history entry' }
  }

  const slug = await getChefSlugForRevalidation(chef.id)
  revalidateCredentialPaths(slug)

  return { success: true, entry: result.data }
}

export async function deleteWorkHistoryEntry(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  if (!id) return { success: false, error: 'ID required' }

  const db: any = createServerClient()
  const { error } = await db
    .from('chef_work_history_entries')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) {
    console.error('[deleteWorkHistoryEntry]', error)
    return { success: false, error: 'Failed to delete entry' }
  }

  const slug = await getChefSlugForRevalidation(chef.id)
  revalidateCredentialPaths(slug)
  return { success: true }
}

export async function reorderWorkHistoryEntries(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  if (!Array.isArray(ids) || ids.length === 0) return { success: true }

  const db: any = createServerClient()

  // Update each entry's display_order to match position in the array
  const updates = ids.map((id, idx) =>
    db
      .from('chef_work_history_entries')
      .update({ display_order: idx, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', chef.id)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r: any) => r.error)
  if (failed) {
    console.error('[reorderWorkHistoryEntries]', (failed as any).error)
    return { success: false, error: 'Failed to reorder entries' }
  }

  const slug = await getChefSlugForRevalidation(chef.id)
  revalidateCredentialPaths(slug)
  return { success: true }
}

// ─── Public Reads (no auth) ───────────────────────────────────────────────────

export async function getPublicWorkHistory(chefId: string): Promise<ChefWorkHistoryEntry[]> {
  if (!chefId) return []
  try {
    const db: any = createServerClient({ admin: true })

    const { data, error } = await db
      .from('chef_work_history_entries')
      .select('*')
      .eq('chef_id', chefId)
      .eq('is_public', true)
      .order('display_order', { ascending: true })
      .order('start_date', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[getPublicWorkHistory]', error)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('[getPublicWorkHistory] unexpected error', err)
    return []
  }
}

export async function getPublicAchievements(chefId: string) {
  if (!chefId) return []
  try {
    const db: any = createServerClient({ admin: true })

    const { data, error } = await db
      .from('professional_achievements')
      .select(
        'id, achieve_type, title, organization, achieve_date, description, outcome, url, image_url, is_public'
      )
      .eq('chef_id', chefId)
      .eq('is_public', true)
      .order('achieve_date', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[getPublicAchievements]', error)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('[getPublicAchievements] unexpected error', err)
    return []
  }
}

export async function getPublicCharityImpact(chefId: string): Promise<PublicCharityImpact> {
  const fallback: PublicCharityImpact = {
    totalHours: 0,
    totalEntries: 0,
    uniqueOrgs: 0,
    verified501cOrgs: 0,
    publicCharityPercent: null,
    publicCharityNote: null,
  }

  if (!chefId) return fallback

  try {
    const db: any = createServerClient({ admin: true })

    // Fetch charity hours and chef charity fields in parallel
    const [hoursResult, chefResult] = await Promise.all([
      db
        .from('charity_hours')
        .select('hours, organization_name, is_verified_501c')
        .eq('chef_id', chefId),
      db
        .from('chefs')
        .select('public_charity_percent, public_charity_note')
        .eq('id', chefId)
        .single(),
    ])

    const hours: Array<{ hours: number; organization_name: string; is_verified_501c: boolean }> =
      hoursResult.data ?? []

    const orgMap = new Map<string, { hours: number; isVerified: boolean }>()
    let totalHours = 0

    for (const entry of hours) {
      totalHours += Number(entry.hours)
      const existing = orgMap.get(entry.organization_name)
      if (existing) {
        existing.hours += Number(entry.hours)
      } else {
        orgMap.set(entry.organization_name, {
          hours: Number(entry.hours),
          isVerified: entry.is_verified_501c,
        })
      }
    }

    const chefData = chefResult.data

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalEntries: hours.length,
      uniqueOrgs: orgMap.size,
      verified501cOrgs: Array.from(orgMap.values()).filter((o) => o.isVerified).length,
      publicCharityPercent: chefData?.public_charity_percent ?? null,
      publicCharityNote: chefData?.public_charity_note ?? null,
    }
  } catch (err) {
    console.error('[getPublicCharityImpact] unexpected error', err)
    return fallback
  }
}

// ─── Credential Profile Settings ─────────────────────────────────────────────

export async function updatePublicCredentialProfile(
  input: z.input<typeof CredentialProfileSchema>
): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()

  const parsed = CredentialProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }
  const data = parsed.data

  // If enabling resume note, verify a resume actually exists
  if (data.showResumeAvailableNote) {
    const status = await getPrivateResumeStatus()
    if (!status.hasResume) {
      return {
        success: false,
        error: 'Upload a resume first before enabling the resume-available note.',
      }
    }
  }

  const db: any = createServerClient()
  const { error } = await db
    .from('chefs')
    .update({
      public_charity_percent: data.publicCharityPercent ?? null,
      public_charity_note: data.publicCharityNote ?? null,
      show_resume_available_note: data.showResumeAvailableNote,
    })
    .eq('id', chef.id)

  if (error) {
    console.error('[updatePublicCredentialProfile]', error)
    return { success: false, error: 'Failed to save credential settings' }
  }

  const slug = await getChefSlugForRevalidation(chef.id)
  revalidateCredentialPaths(slug)
  return { success: true }
}

// ─── Private Resume ───────────────────────────────────────────────────────────

export async function getPrivateResumeStatus(): Promise<PrivateResumeStatus> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_documents')
    .select('id, source_filename, original_filename, updated_at')
    .eq('tenant_id', chef.tenantId!)
    .eq('document_type', 'resume_private')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[getPrivateResumeStatus]', error)
    return { hasResume: false, filename: null, updatedAt: null, documentId: null }
  }

  const row = data?.[0] ?? null
  return {
    hasResume: !!row,
    filename: row?.original_filename ?? row?.source_filename ?? null,
    updatedAt: row?.updated_at ?? null,
    documentId: row?.id ?? null,
  }
}

export async function savePrivateResume(
  formData: FormData
): Promise<{ success: boolean; filename?: string; error?: string }> {
  const chef = await requireChef()
  const file = formData.get('resume') as File | null

  if (!file || !(file instanceof File)) {
    return { success: false, error: 'No file provided' }
  }
  if (file.size > RESUME_MAX_BYTES) {
    return { success: false, error: 'File must be under 10 MB' }
  }
  if (!RESUME_ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'File must be a PDF, DOC, or DOCX' }
  }

  const db: any = createServerClient()

  // Check for existing resume to replace after successful upload
  const { data: existing } = await db
    .from('chef_documents')
    .select('id, tags')
    .eq('tenant_id', chef.tenantId!)
    .eq('document_type', 'resume_private')
    .order('updated_at', { ascending: false })
    .limit(1)

  const ext = file.name.split('.').pop() || 'pdf'
  const storagePath = `resumes/${chef.id}/resume-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload new file first
  const uploaded = await upload(RESUME_BUCKET, storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (!uploaded) {
    return { success: false, error: 'File upload failed' }
  }

  const now = new Date().toISOString()

  if (existing?.[0]) {
    // Update the existing resume document record
    const { error: updateError } = await db
      .from('chef_documents')
      .update({
        source_filename: file.name,
        original_filename: file.name,
        tags: ['resume_private'],
        storage_path: storagePath,
        storage_bucket: RESUME_BUCKET,
        mime_type: file.type,
        file_size_bytes: file.size,
        updated_at: now,
        updated_by: chef.id,
      })
      .eq('id', existing[0].id)
      .eq('tenant_id', chef.tenantId!)

    if (updateError) {
      console.error('[savePrivateResume] update error', updateError)
      return { success: false, error: 'Failed to update resume record' }
    }
  } else {
    // Insert new resume document record
    const { error: insertError } = await db.from('chef_documents').insert({
      tenant_id: chef.tenantId!,
      title: `Private Resume`,
      document_type: 'resume_private',
      source_filename: file.name,
      original_filename: file.name,
      tags: ['resume_private'],
      storage_path: storagePath,
      storage_bucket: RESUME_BUCKET,
      mime_type: file.type,
      file_size_bytes: file.size,
      source_type: 'upload',
      content_text: '',
      created_by: chef.id,
      updated_by: chef.id,
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      console.error('[savePrivateResume] insert error', insertError)
      return { success: false, error: 'Failed to save resume record' }
    }
  }

  revalidatePath('/settings/credentials')
  revalidatePath('/settings/client-preview')
  return { success: true, filename: file.name }
}

export async function deletePrivateResume(): Promise<{ success: boolean; error?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('chef_documents')
    .select('id, storage_path')
    .eq('tenant_id', chef.tenantId!)
    .eq('document_type', 'resume_private')

  if (!existing?.length) {
    return { success: true }
  }

  // Delete all resume document records (should be one, but clean up all)
  for (const doc of existing) {
    if (doc.storage_path) {
      try {
        await remove(RESUME_BUCKET, [doc.storage_path])
      } catch (err) {
        console.error('[deletePrivateResume] storage remove error', err)
      }
    }
  }

  const { error } = await db
    .from('chef_documents')
    .delete()
    .eq('tenant_id', chef.tenantId!)
    .eq('document_type', 'resume_private')

  if (error) {
    console.error('[deletePrivateResume]', error)
    return { success: false, error: 'Failed to delete resume record' }
  }

  // If the resume note was enabled, turn it off automatically
  await db.from('chefs').update({ show_resume_available_note: false }).eq('id', chef.id)

  revalidatePath('/settings/credentials')
  revalidatePath('/settings/client-preview')

  const slug = await getChefSlugForRevalidation(chef.id)
  if (slug) revalidatePath(`/chef/${slug}`)

  return { success: true }
}
