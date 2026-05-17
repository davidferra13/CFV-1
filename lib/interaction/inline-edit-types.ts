export type EditableEntity = 'event' | 'menu' | 'recipe' | 'client' | 'ingredient' | 'quote'

export interface InlineEditRequest {
  entityType: EditableEntity
  entityId: string
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface EditHistoryEntry {
  id: string
  tenantId: string
  entityType: string
  entityId: string
  field: string
  oldValue: unknown
  newValue: unknown
  editedBy: string
  editedAt: string
  reverted: boolean
}

export interface EditableFieldConfig {
  field: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean'
  validation?: { min?: number; max?: number; maxLength?: number; required?: boolean }
  entityType: EditableEntity
}
