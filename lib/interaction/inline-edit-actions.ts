'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  EditableEntity,
  InlineEditRequest,
  EditHistoryEntry,
  EditableFieldConfig,
} from './inline-edit-types'

// ---------------------------------------------------------------------------
// Entity type -> table name mapping
// ---------------------------------------------------------------------------

const ENTITY_TABLE_MAP: Record<EditableEntity, string> = {
  event: 'events',
  menu: 'menus',
  recipe: 'recipes',
  client: 'clients',
  ingredient: 'ingredients',
  quote: 'quotes',
}

// ---------------------------------------------------------------------------
// 1. Inline update a single field on any entity
// ---------------------------------------------------------------------------

export async function inlineUpdate(request: InlineEditRequest): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  const tableName = ENTITY_TABLE_MAP[request.entityType]
  if (!tableName) throw new Error(`Invalid entity type: ${request.entityType}`)
  if (!request.field) throw new Error('Field name is required')
  if (!request.entityId) throw new Error('Entity ID is required')

  // Update the entity field
  const { error: updateError } = await db
    .from(tableName)
    .update({ [request.field]: request.newValue })
    .eq('id', request.entityId)
    .eq('tenant_id', tenantId)

  if (updateError)
    throw new Error(
      `Failed to update ${request.entityType}.${request.field}: ${updateError.message}`
    )

  // Record edit history
  const { error: historyError } = await db.from('edit_history').insert({
    tenant_id: tenantId,
    entity_type: request.entityType,
    entity_id: request.entityId,
    field: request.field,
    old_value: JSON.stringify(request.oldValue),
    new_value: JSON.stringify(request.newValue),
    edited_by: user.email || user.id,
  })

  if (historyError) throw new Error(`Failed to record edit history: ${historyError.message}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// 2. Get edit history for an entity
// ---------------------------------------------------------------------------

export async function getEditHistory(
  entityType: string,
  entityId: string
): Promise<EditHistoryEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('edit_history')
    .select('*')
    .eq('tenant_id', user.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('edited_at', { ascending: false })

  if (error) throw new Error(`Failed to load edit history: ${error.message}`)

  return (data || []).map(mapHistoryRow)
}

// ---------------------------------------------------------------------------
// 3. Revert a specific edit
// ---------------------------------------------------------------------------

export async function revertEdit(editId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.id

  // Fetch the edit record
  const { data: edit, error: fetchError } = await db
    .from('edit_history')
    .select('*')
    .eq('id', editId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !edit) throw new Error('Edit record not found')
  if (edit.reverted) throw new Error('Edit has already been reverted')

  const tableName = ENTITY_TABLE_MAP[edit.entity_type as EditableEntity]
  if (!tableName) throw new Error(`Cannot revert: unknown entity type ${edit.entity_type}`)

  // Restore old value on the entity
  const oldValue = typeof edit.old_value === 'string' ? JSON.parse(edit.old_value) : edit.old_value
  const { error: updateError } = await db
    .from(tableName)
    .update({ [edit.field]: oldValue })
    .eq('id', edit.entity_id)
    .eq('tenant_id', tenantId)

  if (updateError) throw new Error(`Failed to revert field: ${updateError.message}`)

  // Mark edit as reverted
  const { error: markError } = await db
    .from('edit_history')
    .update({ reverted: true })
    .eq('id', editId)
    .eq('tenant_id', tenantId)

  if (markError) throw new Error(`Failed to mark edit as reverted: ${markError.message}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. Get recent edits across all entities for current tenant
// ---------------------------------------------------------------------------

export async function getRecentEdits(limit: number = 20): Promise<EditHistoryEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('edit_history')
    .select('*')
    .eq('tenant_id', user.id)
    .order('edited_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load recent edits: ${error.message}`)

  return (data || []).map(mapHistoryRow)
}

// ---------------------------------------------------------------------------
// 5. Get editable fields for an entity type (pure function)
// ---------------------------------------------------------------------------

export async function getEditableFields(
  entityType: EditableEntity
): Promise<EditableFieldConfig[]> {
  await requireChef()

  const configs: Record<EditableEntity, EditableFieldConfig[]> = {
    event: [
      {
        field: 'title',
        label: 'Title',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'event',
      },
      {
        field: 'description',
        label: 'Description',
        type: 'textarea',
        validation: { maxLength: 2000 },
        entityType: 'event',
      },
      {
        field: 'event_date',
        label: 'Date',
        type: 'date',
        validation: { required: true },
        entityType: 'event',
      },
      {
        field: 'guest_count',
        label: 'Guest Count',
        type: 'number',
        validation: { min: 1, max: 500 },
        entityType: 'event',
      },
      {
        field: 'location',
        label: 'Location',
        type: 'text',
        validation: { maxLength: 500 },
        entityType: 'event',
      },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 5000 },
        entityType: 'event',
      },
    ],
    menu: [
      {
        field: 'name',
        label: 'Name',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'menu',
      },
      {
        field: 'description',
        label: 'Description',
        type: 'textarea',
        validation: { maxLength: 2000 },
        entityType: 'menu',
      },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 5000 },
        entityType: 'menu',
      },
    ],
    recipe: [
      {
        field: 'name',
        label: 'Name',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'recipe',
      },
      {
        field: 'description',
        label: 'Description',
        type: 'textarea',
        validation: { maxLength: 2000 },
        entityType: 'recipe',
      },
      {
        field: 'prep_time_minutes',
        label: 'Prep Time (min)',
        type: 'number',
        validation: { min: 0, max: 1440 },
        entityType: 'recipe',
      },
      {
        field: 'cook_time_minutes',
        label: 'Cook Time (min)',
        type: 'number',
        validation: { min: 0, max: 1440 },
        entityType: 'recipe',
      },
      {
        field: 'servings',
        label: 'Servings',
        type: 'number',
        validation: { min: 1, max: 1000 },
        entityType: 'recipe',
      },
      { field: 'instructions', label: 'Instructions', type: 'textarea', entityType: 'recipe' },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 5000 },
        entityType: 'recipe',
      },
    ],
    client: [
      {
        field: 'name',
        label: 'Name',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'client',
      },
      {
        field: 'email',
        label: 'Email',
        type: 'text',
        validation: { maxLength: 320 },
        entityType: 'client',
      },
      {
        field: 'phone',
        label: 'Phone',
        type: 'text',
        validation: { maxLength: 30 },
        entityType: 'client',
      },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 5000 },
        entityType: 'client',
      },
    ],
    ingredient: [
      {
        field: 'name',
        label: 'Name',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'ingredient',
      },
      {
        field: 'category',
        label: 'Category',
        type: 'text',
        validation: { maxLength: 100 },
        entityType: 'ingredient',
      },
      {
        field: 'unit',
        label: 'Unit',
        type: 'text',
        validation: { maxLength: 50 },
        entityType: 'ingredient',
      },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 2000 },
        entityType: 'ingredient',
      },
    ],
    quote: [
      {
        field: 'title',
        label: 'Title',
        type: 'text',
        validation: { required: true, maxLength: 200 },
        entityType: 'quote',
      },
      {
        field: 'notes',
        label: 'Notes',
        type: 'textarea',
        validation: { maxLength: 5000 },
        entityType: 'quote',
      },
      {
        field: 'price_per_person_cents',
        label: 'Price Per Person',
        type: 'number',
        validation: { min: 0 },
        entityType: 'quote',
      },
      {
        field: 'total_cents',
        label: 'Total',
        type: 'number',
        validation: { min: 0 },
        entityType: 'quote',
      },
    ],
  }

  return configs[entityType] || []
}

// ---------------------------------------------------------------------------
// 6. Get field edit count
// ---------------------------------------------------------------------------

export async function getFieldEditCount(
  entityType: string,
  entityId: string,
  field: string
): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('edit_history')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('field', field)

  if (error) throw new Error(`Failed to count field edits: ${error.message}`)

  return (data || []).length
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapHistoryRow(row: any): EditHistoryEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    field: row.field,
    oldValue: typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value,
    newValue: typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    reverted: row.reverted,
  }
}
