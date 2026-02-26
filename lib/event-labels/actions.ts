'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventLabelType = 'occasion_type' | 'status_label'

export interface ChefEventTypeLabel {
  id: string
  tenant_id: string
  default_label: string
  custom_label: string
  label_type: EventLabelType
  created_at: string
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetch all custom event/status labels for the current chef.
 * Returns an array of existing overrides — default labels that have no row
 * in the DB should simply show their default_label as the current value.
 */
export async function getEventLabels(): Promise<ChefEventTypeLabel[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_event_type_labels' as any)
    .select('*')
    .eq('tenant_id', chef.entityId)
    .order('label_type')

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ChefEventTypeLabel[]
}

/**
 * Upsert a custom label for a given default label + label type.
 * If custom_label equals default_label (chef cleared their override),
 * we delete the row so lookups fall back to the default cleanly.
 */
export async function upsertEventLabel(
  defaultLabel: string,
  customLabel: string,
  labelType: EventLabelType
): Promise<void> {
  if (!defaultLabel.trim()) throw new Error('defaultLabel is required')
  if (!customLabel.trim()) throw new Error('customLabel is required')

  const chef = await requireChef()
  const supabase = createServerClient()

  // If the custom label is the same as the default, remove the override
  if (customLabel.trim() === defaultLabel.trim()) {
    await supabase
      .from('chef_event_type_labels' as any)
      .delete()
      .eq('tenant_id', chef.entityId)
      .eq('default_label', defaultLabel)
      .eq('label_type', labelType)

    revalidatePath('/settings/event-types')
    return
  }

  const { error } = await supabase.from('chef_event_type_labels' as any).upsert(
    {
      tenant_id: chef.entityId,
      default_label: defaultLabel,
      custom_label: customLabel.trim(),
      label_type: labelType,
    },
    { onConflict: 'tenant_id,default_label,label_type' }
  )

  if (error) throw new Error(error.message)

  revalidatePath('/settings/event-types')
}

/**
 * Reset a custom label back to its default by deleting the override row.
 */
export async function resetEventLabel(id: string): Promise<void> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_event_type_labels' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', chef.entityId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/event-types')
}

// buildLabelMap moved to lib/event-labels/utils.ts (non-server utility)
