// Client Intake Form Server Actions
// Chef-side: create, edit, send, and review intake forms
// Public-side: load form by token, submit response (no auth)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { IntakeFormField, IntakeForm, IntakeResponse, IntakeShare } from './intake-types'
import { DEFAULT_FORM_TEMPLATES } from './intake-types'

// ---------- Schemas ----------

const FormFieldSchema: z.ZodType<IntakeFormField> = z.object({
  id: z.string().min(1),
  type: z.enum([
    'text',
    'textarea',
    'checkbox_group',
    'radio',
    'select',
    'allergy_picker',
    'number',
    'date',
  ]),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  mapToClientField: z.string().optional(),
})

const CreateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema).min(1, 'At least one field is required'),
})

const UpdateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  fields: z.array(FormFieldSchema).optional(),
})

const SendFormSchema = z.object({
  formId: z.string().uuid(),
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),
  clientId: z.string().uuid().optional(),
})

// ---------- Chef Actions ----------

/**
 * Get all intake forms for the chef's tenant.
 * Seeds default templates on first access if none exist.
 */
export async function getIntakeForms(): Promise<IntakeForm[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_intake_forms')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load intake forms: ${error.message}`)

  // Seed defaults on first access
  if (!data || data.length === 0) {
    const seeded = await seedDefaultForms(user.tenantId!)
    return seeded
  }

  return data as IntakeForm[]
}

/**
 * Get a single intake form by ID.
 */
export async function getIntakeFormById(formId: string): Promise<IntakeForm | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_intake_forms')
    .select('*')
    .eq('id', formId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_deleted', false)
    .single()

  if (error) return null
  return data as IntakeForm
}

/**
 * Create a new intake form.
 */
export async function createIntakeForm(
  input: z.infer<typeof CreateFormSchema>
): Promise<IntakeForm> {
  const user = await requireChef()
  const validated = CreateFormSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_intake_forms')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description || null,
      fields: validated.fields as unknown as Record<string, unknown>,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create form: ${error.message}`)

  revalidatePath('/clients/intake')
  return data as IntakeForm
}

/**
 * Update an existing intake form.
 */
export async function updateIntakeForm(
  formId: string,
  input: z.infer<typeof UpdateFormSchema>
): Promise<IntakeForm> {
  const user = await requireChef()
  const validated = UpdateFormSchema.parse(input)
  const supabase = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.description !== undefined) updates.description = validated.description
  if (validated.fields !== undefined) updates.fields = validated.fields

  const { data, error } = await supabase
    .from('client_intake_forms')
    .update(updates)
    .eq('id', formId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update form: ${error.message}`)

  revalidatePath('/clients/intake')
  return data as IntakeForm
}

/**
 * Soft-delete an intake form.
 */
export async function deleteIntakeForm(formId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('client_intake_forms')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', formId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete form: ${error.message}`)

  revalidatePath('/clients/intake')
}

/**
 * Generate a share link for an intake form.
 * Optionally pre-associates with a client.
 */
export async function sendIntakeForm(
  input: z.infer<typeof SendFormSchema>
): Promise<{ shareToken: string; shareUrl: string }> {
  const user = await requireChef()
  const validated = SendFormSchema.parse(input)
  const supabase = createServerClient()

  // Verify form belongs to tenant
  const { data: form } = await supabase
    .from('client_intake_forms')
    .select('id')
    .eq('id', validated.formId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_deleted', false)
    .single()

  if (!form) throw new Error('Form not found')

  const { data: share, error } = await supabase
    .from('client_intake_shares')
    .insert({
      tenant_id: user.tenantId!,
      form_id: validated.formId,
      client_id: validated.clientId || null,
      client_email: validated.clientEmail || null,
      client_name: validated.clientName || null,
    })
    .select('share_token')
    .single()

  if (error) throw new Error(`Failed to create share link: ${error.message}`)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const shareUrl = `${baseUrl}/intake/${share.share_token}`

  revalidatePath('/clients/intake')
  return { shareToken: share.share_token, shareUrl }
}

/**
 * Get all intake responses for the tenant, optionally filtered by form.
 */
export async function getIntakeResponses(
  formId?: string
): Promise<(IntakeResponse & { form_name?: string })[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('client_intake_responses')
    .select('*, client_intake_forms(name)')
    .eq('tenant_id', user.tenantId!)
    .order('submitted_at', { ascending: false })

  if (formId) {
    query = query.eq('form_id', formId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load responses: ${error.message}`)

  return (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    form_name: (r.client_intake_forms as { name: string } | null)?.name,
  })) as (IntakeResponse & { form_name?: string })[]
}

/**
 * Get responses for a specific client.
 */
export async function getClientIntakeResponses(
  clientId: string
): Promise<(IntakeResponse & { form_name?: string })[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_intake_responses')
    .select('*, client_intake_forms(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(`Failed to load client responses: ${error.message}`)

  return (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    form_name: (r.client_intake_forms as { name: string } | null)?.name,
  })) as (IntakeResponse & { form_name?: string })[]
}

/**
 * Apply intake response data to a client record.
 * Merges mapped fields into the client's profile.
 */
export async function applyIntakeToClient(responseId: string, clientId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the response
  const { data: response, error: respErr } = await supabase
    .from('client_intake_responses')
    .select('*, client_intake_forms(fields)')
    .eq('id', responseId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (respErr || !response) throw new Error('Response not found')

  // Get form fields to find mapToClientField mappings
  const fields =
    (response.client_intake_forms as { fields: IntakeFormField[] } | null)?.fields || []
  const responses = response.responses as Record<string, unknown>

  // Build client update from mapped fields
  const clientUpdate: Record<string, unknown> = {}

  for (const field of fields) {
    if (!field.mapToClientField || !(field.id in responses)) continue

    const value = responses[field.id]
    const target = field.mapToClientField

    // Handle spice tolerance mapping (radio value to enum)
    if (target === 'spice_tolerance' && typeof value === 'string') {
      const spiceMap: Record<string, string> = {
        'None (no spice at all)': 'none',
        Mild: 'mild',
        Medium: 'medium',
        Hot: 'hot',
        'Very Hot': 'very_hot',
      }
      clientUpdate[target] = spiceMap[value] || 'medium'
      continue
    }

    // Handle dislikes (textarea to array)
    if (target === 'dislikes' && typeof value === 'string') {
      clientUpdate[target] = value
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
      continue
    }

    // Handle favorite_dishes (textarea to array)
    if (target === 'favorite_dishes' && typeof value === 'string') {
      clientUpdate[target] = value
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
      continue
    }

    // Handle wine_beverage_preferences (textarea to string - stored as text in clients)
    if (target === 'wine_beverage_preferences' && typeof value === 'string') {
      clientUpdate[target] = value
      continue
    }

    // Arrays stay as arrays (checkbox_group, allergy_picker)
    if (Array.isArray(value)) {
      clientUpdate[target] = value
      continue
    }

    // Everything else: direct assignment
    clientUpdate[target] = value
  }

  if (Object.keys(clientUpdate).length > 0) {
    const { error: updateErr } = await supabase
      .from('clients')
      .update(clientUpdate)
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)

    if (updateErr) throw new Error(`Failed to update client: ${updateErr.message}`)
  }

  // Mark response as applied and link to client
  const { error: markErr } = await supabase
    .from('client_intake_responses')
    .update({
      applied_at: new Date().toISOString(),
      client_id: clientId,
    })
    .eq('id', responseId)
    .eq('tenant_id', user.tenantId!)

  if (markErr) throw new Error(`Failed to mark response as applied: ${markErr.message}`)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients/intake')
}

// ---------- Public Actions (no auth) ----------

/**
 * Load an intake form by share token (public, no auth).
 */
export async function getIntakeFormByToken(shareToken: string): Promise<{
  form: IntakeForm
  share: IntakeShare
} | null> {
  const supabase = createServerClient({ admin: true })

  // Look up the share
  const { data: share, error: shareErr } = await supabase
    .from('client_intake_shares')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (shareErr || !share) return null

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) return null

  // Check if already submitted
  if (share.response_id) return null

  // Load the form
  const { data: form, error: formErr } = await supabase
    .from('client_intake_forms')
    .select('*')
    .eq('id', share.form_id)
    .eq('is_deleted', false)
    .single()

  if (formErr || !form) return null

  return {
    form: form as IntakeForm,
    share: share as IntakeShare,
  }
}

/**
 * Submit an intake form response (public, no auth).
 */
export async function submitIntakeResponse(
  shareToken: string,
  responses: Record<string, unknown>,
  clientName?: string,
  clientEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  // Look up the share
  const { data: share, error: shareErr } = await supabase
    .from('client_intake_shares')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (shareErr || !share) return { success: false, error: 'Invalid or expired link.' }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { success: false, error: 'This form link has expired.' }
  }

  // Check if already submitted
  if (share.response_id) {
    return { success: false, error: 'This form has already been submitted.' }
  }

  // Validate the form exists
  const { data: form } = await supabase
    .from('client_intake_forms')
    .select('fields')
    .eq('id', share.form_id)
    .eq('is_deleted', false)
    .single()

  if (!form) return { success: false, error: 'Form not found.' }

  // Validate required fields
  const fields = (form.fields as IntakeFormField[]) || []
  for (const field of fields) {
    if (field.required) {
      const val = responses[field.id]
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0)
      ) {
        return { success: false, error: `"${field.label}" is required.` }
      }
    }
  }

  // Insert response
  const { data: resp, error: insertErr } = await supabase
    .from('client_intake_responses')
    .insert({
      tenant_id: share.tenant_id,
      form_id: share.form_id,
      client_id: share.client_id || null,
      client_name: clientName || share.client_name || null,
      client_email: clientEmail || share.client_email || null,
      responses: responses as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (insertErr) return { success: false, error: 'Failed to submit response. Please try again.' }

  // Link response to share
  await supabase.from('client_intake_shares').update({ response_id: resp.id }).eq('id', share.id)

  return { success: true }
}

// ---------- Internal Helpers ----------

async function seedDefaultForms(tenantId: string): Promise<IntakeForm[]> {
  const supabase = createServerClient()

  const inserts = DEFAULT_FORM_TEMPLATES.map((t) => ({
    tenant_id: tenantId,
    name: t.name,
    description: t.description,
    fields: t.fields as unknown as Record<string, unknown>,
    is_default: t.is_default,
  }))

  const { data, error } = await supabase.from('client_intake_forms').insert(inserts).select()

  if (error) throw new Error(`Failed to seed default forms: ${error.message}`)

  return (data || []) as IntakeForm[]
}
