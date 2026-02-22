'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const REVALIDATE_PATH = '/safety/backup-chef'

const BackupContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  specialties: z.array(z.string()).optional(),
  max_guest_count: z.number().int().nonnegative().optional(),
  relationship: z.string().optional(),
  availability_notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

const UpdateBackupContactSchema = BackupContactSchema.partial()

export type AddBackupContactInput = z.infer<typeof BackupContactSchema>
export type UpdateBackupContactInput = z.infer<typeof UpdateBackupContactSchema>

/**
 * Add a new backup chef contact for the current tenant.
 */
export async function addBackupContact(input: AddBackupContactInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = BackupContactSchema.parse(input)

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_backup_contacts')
    .insert({ ...validated, tenant_id: tenantId })
    .select()
    .single()

  if (error) throw new Error(`Failed to add backup contact: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Update an existing backup chef contact. Verifies tenant ownership.
 */
export async function updateBackupContact(id: string, input: UpdateBackupContactInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = UpdateBackupContactSchema.parse(input)

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('chef_backup_contacts')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Backup contact not found or access denied')

  const { data, error } = await supabase
    .from('chef_backup_contacts')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update backup contact: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Soft-deactivate a backup chef contact (sets is_active = false).
 * Verifies tenant ownership.
 */
export async function deactivateBackupContact(id: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('chef_backup_contacts')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Backup contact not found or access denied')

  const { data, error } = await supabase
    .from('chef_backup_contacts')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to deactivate backup contact: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * List all active backup chef contacts for the current tenant.
 */
export async function getBackupContacts() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_backup_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch backup contacts: ${error.message}`)

  return data ?? []
}

/**
 * Returns true if the current tenant has at least one active backup chef contact.
 * Used by the business health checklist to auto-update the BACKUP_CHEF_CONTACT item.
 */
export async function hasActiveBackupContact(): Promise<boolean> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_backup_contacts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(1)

  if (error) throw new Error(`Failed to check backup contacts: ${error.message}`)

  return (data ?? []).length > 0
}
