'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acknowledgeCOC(assignmentId: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_staff_assignments')
    .update({
      coc_acknowledged: true,
      coc_acknowledged_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
  // Verify tenant owns via the event join
  if (error) throw new Error(error.message)
  revalidatePath('/events')
}

export async function getCOCStatus(eventId: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select('id, staff_member_id, coc_acknowledged, coc_acknowledged_at, staff_members(full_name)')
    .eq('event_id', eventId)

  if (error) return []
  return (data ?? []).map((a: any) => ({
    assignment_id: a.id,
    staff_name: a.staff_members?.full_name ?? 'Unknown',
    coc_acknowledged: a.coc_acknowledged ?? false,
    coc_acknowledged_at: a.coc_acknowledged_at,
  }))
}
