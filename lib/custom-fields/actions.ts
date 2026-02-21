'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomFieldEntityType = 'event' | 'client' | 'recipe'
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'toggle'

export interface CustomFieldDefinition {
  id: string
  tenant_id: string
  entity_type: CustomFieldEntityType
  field_name: string
  field_type: CustomFieldType
  options: string[] | null
  is_required: boolean
  display_order: number
  created_at: string
}

export interface CustomFieldValue {
  id: string
  tenant_id: string
  entity_id: string
  field_definition_id: string
  value_text: string | null
  value_number: number | null
  value_date: string | null
  value_boolean: boolean | null
  value_json: unknown | null
  created_at: string
  updated_at: string
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateDefinitionSchema = z.object({
  entity_type: z.enum(['event', 'client', 'recipe']),
  field_name: z.string().min(1, 'Field name is required').max(100),
  field_type: z.enum(['text', 'number', 'date', 'select', 'multi_select', 'toggle']),
  options: z.array(z.string().min(1)).nullable().optional(),
  is_required: z.boolean().optional().default(false),
  display_order: z.number().int().optional().default(0),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetch all custom field definitions for a given entity type, ordered by display_order.
 */
export async function getCustomFieldDefinitions(
  entityType: CustomFieldEntityType
): Promise<CustomFieldDefinition[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('custom_field_definitions' as any)
    .select('*')
    .eq('tenant_id', chef.entityId)
    .eq('entity_type', entityType)
    .order('display_order')

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as CustomFieldDefinition[]
}

/**
 * Fetch ALL custom field definitions for the current chef, grouped by entity_type.
 * Used by the settings page to show all fields at once.
 */
export async function getAllCustomFieldDefinitions(): Promise<
  Record<CustomFieldEntityType, CustomFieldDefinition[]>
> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('custom_field_definitions' as any)
    .select('*')
    .eq('tenant_id', chef.entityId)
    .order('display_order')

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as CustomFieldDefinition[]
  return {
    event: rows.filter((r) => r.entity_type === 'event'),
    client: rows.filter((r) => r.entity_type === 'client'),
    recipe: rows.filter((r) => r.entity_type === 'recipe'),
  }
}

/**
 * Create a new custom field definition after Zod validation.
 */
export async function createCustomFieldDefinition(
  raw: unknown
): Promise<CustomFieldDefinition> {
  const chef = await requireChef()
  const parsed = CreateDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e: { message: string }) => e.message).join(', '))
  }

  const { entity_type, field_name, field_type, options, is_required, display_order } =
    parsed.data

  // Validate that select/multi_select have at least one option
  if ((field_type === 'select' || field_type === 'multi_select') && !options?.length) {
    throw new Error('Select fields require at least one option')
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('custom_field_definitions' as any)
    .insert({
      tenant_id: chef.entityId,
      entity_type,
      field_name,
      field_type,
      options: options ?? null,
      is_required: is_required ?? false,
      display_order: display_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/settings/custom-fields')
  return data as unknown as CustomFieldDefinition
}

/**
 * Delete a custom field definition (and cascade-deletes all its values via FK).
 */
export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Tenant-scoped delete: only deletes if the row belongs to this chef
  const { error } = await supabase
    .from('custom_field_definitions' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', chef.entityId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/custom-fields')
}

/**
 * Save (upsert) custom field values for a given entity.
 * `values` is a map of field_definition_id → raw value.
 * Each entry is upserted individually so partial saves succeed.
 */
export async function saveCustomFieldValues(
  entityId: string,
  values: Record<string, unknown>
): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Fetch definitions so we know each field's type
  const { data: defs, error: defError } = await supabase
    .from('custom_field_definitions' as any)
    .select('id, field_type')
    .eq('tenant_id', chef.entityId)

  if (defError) throw new Error(defError.message)
  const defMap = new Map<string, CustomFieldType>(
    (defs as unknown as { id: string; field_type: CustomFieldType }[]).map((d) => [d.id, d.field_type])
  )

  const upserts = Object.entries(values).map(([defId, raw]) => {
    const fieldType = defMap.get(defId)
    const base = {
      tenant_id: chef.entityId,
      entity_id: entityId,
      field_definition_id: defId,
      value_text: null as string | null,
      value_number: null as number | null,
      value_date: null as string | null,
      value_boolean: null as boolean | null,
      value_json: null as unknown,
    }

    switch (fieldType) {
      case 'text':
        base.value_text = raw != null ? String(raw) : null
        break
      case 'number':
        base.value_number = raw != null && raw !== '' ? Number(raw) : null
        break
      case 'date':
        base.value_date = raw != null ? String(raw) : null
        break
      case 'toggle':
        base.value_boolean = Boolean(raw)
        break
      case 'select':
        base.value_text = raw != null ? String(raw) : null
        break
      case 'multi_select':
        base.value_json = raw
        break
      default:
        base.value_text = raw != null ? String(raw) : null
    }

    return base
  })

  if (!upserts.length) return

  const { error } = await supabase
    .from('custom_field_values' as any)
    .upsert(upserts, { onConflict: 'entity_id,field_definition_id' })

  if (error) throw new Error(error.message)
}

/**
 * Fetch all custom field values for a specific entity instance.
 * Returns a map of field_definition_id → CustomFieldValue row.
 */
export async function getCustomFieldValues(
  entityId: string
): Promise<Record<string, CustomFieldValue>> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('custom_field_values' as any)
    .select('*')
    .eq('tenant_id', chef.entityId)
    .eq('entity_id', entityId)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as CustomFieldValue[]
  return Object.fromEntries(rows.map((r) => [r.field_definition_id, r]))
}
