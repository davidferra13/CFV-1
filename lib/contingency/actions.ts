'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// EMERGENCY CONTACTS
// ============================================

const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  sort_order: z.number().int().default(0),
})

export type EmergencyContactInput = z.infer<typeof EmergencyContactSchema>

export async function createEmergencyContact(input: EmergencyContactInput) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = EmergencyContactSchema.parse(input)

  const { error } = await supabase.from('chef_emergency_contacts').insert({
    ...data,
    chef_id: chef.id,
    email: data.email || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/emergency')
}

export async function updateEmergencyContact(id: string, input: EmergencyContactInput) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = EmergencyContactSchema.parse(input)

  const { error } = await supabase
    .from('chef_emergency_contacts')
    .update({ ...data, email: data.email || null })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/emergency')
}

export async function deleteEmergencyContact(id: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_emergency_contacts')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/emergency')
}

export async function listEmergencyContacts() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_emergency_contacts')
    .select('*')
    .eq('chef_id', chef.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================
// EVENT CONTINGENCY NOTES
// ============================================

const SCENARIO_TYPES = [
  'chef_illness',
  'equipment_failure',
  'ingredient_unavailable',
  'venue_issue',
  'weather',
  'other',
] as const

// NOTE: SCENARIO_LABELS has been moved to './constants' — import from there instead.

const ContingencyNoteSchema = z.object({
  scenario_type: z.enum(SCENARIO_TYPES),
  mitigation_notes: z.string().min(1, 'Mitigation plan is required'),
  backup_contact_id: z.string().uuid().optional(),
})

export type ContingencyNoteInput = z.infer<typeof ContingencyNoteSchema>

export async function upsertContingencyNote(eventId: string, input: ContingencyNoteInput) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = ContingencyNoteSchema.parse(input)

  // Check if record already exists for this event+scenario
  const { data: existing } = await supabase
    .from('event_contingency_notes')
    .select('id')
    .eq('event_id', eventId)
    .eq('chef_id', chef.id)
    .eq('scenario_type', data.scenario_type)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('event_contingency_notes')
      .update({
        mitigation_notes: data.mitigation_notes,
        backup_contact_id: data.backup_contact_id ?? null,
      })
      .eq('id', existing.id)

    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('event_contingency_notes').insert({
      event_id: eventId,
      chef_id: chef.id,
      scenario_type: data.scenario_type,
      mitigation_notes: data.mitigation_notes,
      backup_contact_id: data.backup_contact_id ?? null,
    })

    if (error) throw new Error(error.message)
  }

  revalidatePath(`/events/${eventId}`)
}

export async function deleteContingencyNote(id: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_contingency_notes')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function getEventContingencyNotes(eventId: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_contingency_notes')
    .select('*, chef_emergency_contacts(name, phone, relationship)')
    .eq('event_id', eventId)
    .eq('chef_id', chef.id)
    .order('scenario_type', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
