// Client Intake/Assessment Forms - Server Actions
// Chefs create customizable intake forms, share them via links,
// and clients submit responses without needing an account.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { FDA_BIG_9, COMMON_ALLERGENS } from '@/lib/constants/allergens'

// ============================================
// TYPES
// ============================================

export interface IntakeFormField {
  id: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'number' | 'email'
  label: string
  required: boolean
  options?: string[]
  placeholder?: string
}

interface CreateIntakeFormData {
  name: string
  description?: string
  fields: IntakeFormField[]
  is_default?: boolean
}

interface UpdateIntakeFormData {
  name?: string
  description?: string
  fields?: IntakeFormField[]
  is_default?: boolean
}

// ============================================
// FORM CRUD
// ============================================

export async function createIntakeForm(data: CreateIntakeFormData) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: form, error } = await (supabase as any)
    .from('client_intake_forms')
    .insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description || null,
      fields: data.fields,
      is_default: data.is_default || false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create intake form: ${error.message}`)

  revalidatePath('/clients/intake')
  return form
}

export async function getIntakeForms() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: forms, error } = await (supabase as any)
    .from('client_intake_forms')
    .select('*, client_intake_responses(count)')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load intake forms: ${error.message}`)

  return (forms || []).map((f: any) => ({
    ...f,
    response_count: f.client_intake_responses?.[0]?.count || 0,
  }))
}

export async function getIntakeForm(formId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: form, error } = await (supabase as any)
    .from('client_intake_forms')
    .select('*')
    .eq('id', formId)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error) throw new Error(`Failed to load intake form: ${error.message}`)
  return form
}

export async function updateIntakeForm(formId: string, data: UpdateIntakeFormData) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.fields !== undefined) updateData.fields = data.fields
  if (data.is_default !== undefined) updateData.is_default = data.is_default

  const { data: form, error } = await (supabase as any)
    .from('client_intake_forms')
    .update(updateData)
    .eq('id', formId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update intake form: ${error.message}`)

  revalidatePath('/clients/intake')
  return form
}

export async function deleteIntakeForm(formId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { error } = await (supabase as any)
    .from('client_intake_forms')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', formId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete intake form: ${error.message}`)

  revalidatePath('/clients/intake')
  return { success: true }
}

// ============================================
// SHARE LINKS
// ============================================

export async function createIntakeShare(
  formId: string,
  clientId?: string,
  clientEmail?: string,
  clientName?: string
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: share, error } = await (supabase as any)
    .from('client_intake_shares')
    .insert({
      tenant_id: tenantId,
      form_id: formId,
      client_id: clientId || null,
      client_email: clientEmail || null,
      client_name: clientName || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create share link: ${error.message}`)

  revalidatePath('/clients/intake')
  return share
}

export async function getIntakeShares(formId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: shares, error } = await (supabase as any)
    .from('client_intake_shares')
    .select('*')
    .eq('form_id', formId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load shares: ${error.message}`)
  return shares || []
}

// ============================================
// PUBLIC ACTIONS (no auth required)
// ============================================

export async function getShareByToken(token: string) {
  const supabase = createAdminClient()

  // Load the share record
  const { data: share, error: shareError } = await (supabase as any)
    .from('client_intake_shares')
    .select('*')
    .eq('share_token', token)
    .single()

  if (shareError || !share) return null

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) return null

  // Check if already responded
  if (share.response_id) return { ...share, already_submitted: true, form: null }

  // Load the form
  const { data: form, error: formError } = await (supabase as any)
    .from('client_intake_forms')
    .select('*')
    .eq('id', share.form_id)
    .eq('is_deleted', false)
    .single()

  if (formError || !form) return null

  return { ...share, form, already_submitted: false }
}

export async function submitIntakeResponse(
  token: string,
  responses: Record<string, unknown>,
  clientName: string,
  clientEmail: string
) {
  const supabase = createAdminClient()

  // Validate the share token
  const { data: share, error: shareError } = await (supabase as any)
    .from('client_intake_shares')
    .select('*')
    .eq('share_token', token)
    .single()

  if (shareError || !share) throw new Error('Invalid or expired share link')
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('This share link has expired')
  }
  if (share.response_id) throw new Error('A response has already been submitted for this link')

  // Insert the response
  const { data: response, error: responseError } = await (supabase as any)
    .from('client_intake_responses')
    .insert({
      tenant_id: share.tenant_id,
      form_id: share.form_id,
      client_id: share.client_id || null,
      client_name: clientName,
      client_email: clientEmail,
      responses,
    })
    .select()
    .single()

  if (responseError) throw new Error(`Failed to submit response: ${responseError.message}`)

  // Link the response to the share
  await (supabase as any)
    .from('client_intake_shares')
    .update({ response_id: response.id })
    .eq('id', share.id)

  return { success: true, responseId: response.id }
}

// ============================================
// RESPONSE MANAGEMENT (chef-only)
// ============================================

export async function getIntakeResponses(formId?: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  let query = (supabase as any)
    .from('client_intake_responses')
    .select('*, client_intake_forms!inner(name)')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false })

  if (formId) {
    query = query.eq('form_id', formId)
  }

  const { data: responses, error } = await query

  if (error) throw new Error(`Failed to load responses: ${error.message}`)
  return responses || []
}

export async function applyResponseToClient(responseId: string, clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Load the response
  const { data: response, error: respError } = await (supabase as any)
    .from('client_intake_responses')
    .select('*')
    .eq('id', responseId)
    .eq('tenant_id', tenantId)
    .single()

  if (respError || !response) throw new Error('Response not found')

  // Load the form to understand the field definitions
  const { data: form, error: formError } = await (supabase as any)
    .from('client_intake_forms')
    .select('fields')
    .eq('id', response.form_id)
    .single()

  if (formError || !form) throw new Error('Form not found')

  // Build update payload from responses
  // Map known field labels to client table columns
  const responseData = response.responses as Record<string, unknown>
  const clientUpdate: Record<string, unknown> = {}

  const fields = form.fields as IntakeFormField[]
  for (const field of fields) {
    const value = responseData[field.id]
    if (value === undefined || value === null || value === '') continue

    const label = field.label.toLowerCase()
    if (label.includes('allerg')) {
      clientUpdate.allergies = Array.isArray(value) ? value : [value]
    } else if (
      label.includes('dietary') &&
      (label.includes('restrict') || label.includes('preference'))
    ) {
      clientUpdate.dietary_restrictions = Array.isArray(value) ? value : [value]
    } else if (label.includes('note')) {
      clientUpdate.notes = String(value)
    }
  }

  // Store full responses in client's unknown_fields for reference
  const { data: existingClient } = await (supabase as any)
    .from('clients')
    .select('unknown_fields')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  const existingUnknown = (existingClient?.unknown_fields as Record<string, unknown>) || {}
  clientUpdate.unknown_fields = {
    ...existingUnknown,
    intake_responses: {
      ...((existingUnknown.intake_responses as Record<string, unknown>) || {}),
      [response.form_id]: {
        response_id: responseId,
        submitted_at: response.submitted_at,
        data: responseData,
      },
    },
  }

  // Update client record
  if (Object.keys(clientUpdate).length > 0) {
    const { error: updateError } = await (supabase as any)
      .from('clients')
      .update(clientUpdate)
      .eq('id', clientId)
      .eq('tenant_id', tenantId)

    if (updateError) throw new Error(`Failed to update client: ${updateError.message}`)
  }

  // Mark response as applied
  const { error: applyError } = await (supabase as any)
    .from('client_intake_responses')
    .update({
      applied_at: new Date().toISOString(),
      client_id: clientId,
    })
    .eq('id', responseId)
    .eq('tenant_id', tenantId)

  if (applyError) throw new Error(`Failed to mark response as applied: ${applyError.message}`)

  revalidatePath('/clients/intake')
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// ============================================
// DEFAULT FORM TEMPLATES
// ============================================

export async function createDefaultForms() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Check if defaults already exist
  const { data: existing } = await (supabase as any)
    .from('client_intake_forms')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .eq('is_deleted', false)

  if (existing && existing.length > 0) {
    return { created: 0, message: 'Default forms already exist' }
  }

  const allergyOptions = [...FDA_BIG_9.map((a) => a), ...COMMON_ALLERGENS.map((a) => a)]

  const defaultForms: CreateIntakeFormData[] = [
    {
      name: 'Client Assessment',
      description: 'General household and service preference assessment for new clients.',
      is_default: true,
      fields: [
        {
          id: 'household_size',
          type: 'number',
          label: 'Household size (number of people)',
          required: true,
          placeholder: '4',
        },
        {
          id: 'service_frequency',
          type: 'select',
          label: 'How often would you like service?',
          required: true,
          options: [
            'Once a week',
            'Twice a week',
            'Three times a week',
            'Daily',
            'Bi-weekly',
            'Monthly',
            'One-time event',
          ],
        },
        {
          id: 'budget_range',
          type: 'select',
          label: 'Budget range per service',
          required: true,
          options: ['Under $200', '$200-$400', '$400-$600', '$600-$1000', '$1000+', 'Not sure yet'],
        },
        {
          id: 'cuisine_preferences',
          type: 'multiselect',
          label: 'Cuisine preferences',
          required: false,
          options: [
            'Italian',
            'French',
            'Mexican',
            'Japanese',
            'Chinese',
            'Indian',
            'Mediterranean',
            'Thai',
            'Korean',
            'American',
            'Southern',
            'Middle Eastern',
            'Fusion',
            'No preference',
          ],
        },
        {
          id: 'kitchen_setup',
          type: 'select',
          label: 'Kitchen setup',
          required: false,
          options: [
            'Full kitchen (all equipment)',
            'Standard kitchen (basic equipment)',
            'Minimal kitchen (limited equipment)',
            'Outdoor/grill setup',
            'Not sure',
          ],
        },
        {
          id: 'special_requests',
          type: 'textarea',
          label: 'Any special requests or things we should know?',
          required: false,
          placeholder: 'Tell us about your family, preferences, goals...',
        },
      ],
    },
    {
      name: 'Allergy & Dietary Form',
      description:
        'Detailed allergy and dietary restriction assessment. Covers FDA Big 9 and common culinary allergens.',
      is_default: true,
      fields: [
        {
          id: 'allergies',
          type: 'multiselect',
          label: 'Known allergies (select all that apply)',
          required: false,
          options: allergyOptions,
        },
        {
          id: 'allergy_severity',
          type: 'select',
          label: 'Allergy severity level',
          required: false,
          options: [
            'Mild (preference/sensitivity)',
            'Moderate (noticeable reaction)',
            'Severe (anaphylaxis risk)',
            'Life-threatening (EpiPen required)',
            'No allergies',
          ],
        },
        {
          id: 'dietary_restrictions',
          type: 'multiselect',
          label: 'Dietary restrictions',
          required: false,
          options: [
            'Vegetarian',
            'Vegan',
            'Pescatarian',
            'Gluten-free',
            'Dairy-free',
            'Keto',
            'Paleo',
            'Low-sodium',
            'Low-sugar',
            'Halal',
            'Kosher',
            'None',
          ],
        },
        {
          id: 'allergy_notes',
          type: 'textarea',
          label: 'Additional allergy or dietary notes',
          required: false,
          placeholder:
            'Please share any details about reactions, cross-contamination concerns, or medications...',
        },
        {
          id: 'epipen',
          type: 'checkbox',
          label: 'EpiPen on site (for severe allergies)',
          required: false,
        },
        {
          id: 'household_members_allergies',
          type: 'textarea',
          label: 'Do other household members have different allergies?',
          required: false,
          placeholder: 'List each person and their specific allergies...',
        },
      ],
    },
    {
      name: 'Meal Preferences',
      description: 'Detailed food preference profile to help your chef create meals you love.',
      is_default: true,
      fields: [
        {
          id: 'liked_ingredients',
          type: 'textarea',
          label: 'Ingredients and foods you love',
          required: false,
          placeholder: 'List your favorites: salmon, roasted vegetables, pasta...',
        },
        {
          id: 'disliked_ingredients',
          type: 'textarea',
          label: 'Ingredients and foods you dislike',
          required: false,
          placeholder: 'List foods you want to avoid: cilantro, olives, beets...',
        },
        {
          id: 'past_favorites',
          type: 'textarea',
          label: 'Past meal favorites (from any chef, restaurant, or home cooking)',
          required: false,
          placeholder: 'Describe dishes you have loved in the past...',
        },
        {
          id: 'dietary_goals',
          type: 'multiselect',
          label: 'Dietary goals',
          required: false,
          options: [
            'Weight loss',
            'Muscle building',
            'Heart health',
            'General wellness',
            'Kid-friendly meals',
            'Meal prep/batch cooking',
            'Entertaining guests',
            'No specific goal',
          ],
        },
        {
          id: 'spice_tolerance',
          type: 'select',
          label: 'Spice tolerance',
          required: false,
          options: ['No spice at all', 'Mild', 'Medium', 'Spicy', 'Extra spicy'],
        },
        {
          id: 'texture_preferences',
          type: 'textarea',
          label: 'Texture preferences or aversions',
          required: false,
          placeholder: 'E.g. "no mushy foods", "love crunchy textures"...',
        },
      ],
    },
  ]

  const results = []
  for (const formData of defaultForms) {
    const { data: form, error } = await (supabase as any)
      .from('client_intake_forms')
      .insert({
        tenant_id: tenantId,
        name: formData.name,
        description: formData.description,
        fields: formData.fields,
        is_default: formData.is_default,
      })
      .select()
      .single()

    if (error) {
      console.error(`[intake] Failed to create default form "${formData.name}":`, error.message)
      continue
    }
    results.push(form)
  }

  revalidatePath('/clients/intake')
  return { created: results.length, forms: results }
}
