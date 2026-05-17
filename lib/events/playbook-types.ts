// Service Playbooks - Type Definitions
// Reusable event templates capturing proven service configurations

export type ServicePlaybook = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  service_style: string | null
  guest_count_min: number | null
  guest_count_max: number | null
  menu_template_id: string | null
  prep_timeline_template: Record<string, unknown>
  equipment_checklist: EquipmentChecklistItem[]
  service_notes: string | null
  tags: string[]
  times_used: number
  last_used_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type EquipmentChecklistItem = {
  name: string
  quantity: number
  notes: string | null
}

export type PlaybookApplication = {
  playbook_id: string
  event_id: string
  menu_copied: boolean
  new_menu_id: string | null
  equipment_copied: boolean
  prep_timeline_copied: boolean
  service_notes_copied: boolean
  adjustments_needed: string[]
}

export type PlaybookSummary = {
  id: string
  name: string
  service_style: string | null
  guest_count_min: number | null
  guest_count_max: number | null
  times_used: number
  tags: string[]
}
