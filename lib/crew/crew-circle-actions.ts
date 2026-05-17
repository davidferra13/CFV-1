'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CrewCircle,
  CrewMember,
  CrewRole,
  CrewAvailability,
  CrewAvailabilityStatus,
} from './crew-circle-types'

// ---------------------------------------------------------------------------
// createCrewCircle - Create a named crew circle for the chef's team
// ---------------------------------------------------------------------------

export async function createCrewCircle(input: {
  name: string
  description?: string | null
}): Promise<{ success: boolean; circle?: CrewCircle; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const trimmedName = (input.name || '').trim()
  if (!trimmedName || trimmedName.length > 200) {
    return { success: false, error: 'Name is required (max 200 characters)' }
  }

  const { data, error } = await db
    .from('crew_circles')
    .insert({
      tenant_id: user.tenantId!,
      name: trimmedName,
      description: input.description?.trim() || null,
    })
    .select('id, tenant_id, name, description, created_at, updated_at')
    .single()

  if (error) {
    console.error('[createCrewCircle]', error)
    return { success: false, error: 'Failed to create crew circle' }
  }

  revalidatePath('/dashboard')
  return { success: true, circle: data as CrewCircle }
}

// ---------------------------------------------------------------------------
// getCrewCircle - Fetch a single crew circle by ID (tenant-scoped)
// ---------------------------------------------------------------------------

export async function getCrewCircle(circleId: string): Promise<CrewCircle | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('crew_circles')
    .select('id, tenant_id, name, description, created_at, updated_at')
    .eq('id', circleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null
  return data as CrewCircle
}

// ---------------------------------------------------------------------------
// addCrewMember - Add a staff member to a crew circle
// ---------------------------------------------------------------------------

export async function addCrewMember(input: {
  crew_circle_id: string
  staff_member_id: string
  role?: CrewRole
}): Promise<{ success: boolean; member?: CrewMember; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify circle belongs to tenant
  const { data: circle } = await db
    .from('crew_circles')
    .select('id')
    .eq('id', input.crew_circle_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) {
    return { success: false, error: 'Crew circle not found or unauthorized' }
  }

  // Verify staff member belongs to tenant
  const { data: staff } = await db
    .from('staff_members')
    .select('id')
    .eq('id', input.staff_member_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!staff) {
    return { success: false, error: 'Staff member not found or does not belong to your account' }
  }

  // Upsert (idempotent on crew_circle_id + staff_member_id)
  const { data, error } = await db
    .from('crew_members')
    .upsert(
      {
        crew_circle_id: input.crew_circle_id,
        staff_member_id: input.staff_member_id,
        role: input.role || 'other',
      },
      { onConflict: 'crew_circle_id,staff_member_id' }
    )
    .select('id, crew_circle_id, staff_member_id, role, joined_at')
    .single()

  if (error) {
    console.error('[addCrewMember]', error)
    return { success: false, error: 'Failed to add crew member' }
  }

  revalidatePath('/dashboard')
  return { success: true, member: data as CrewMember }
}

// ---------------------------------------------------------------------------
// removeCrewMember - Remove a staff member from a crew circle
// ---------------------------------------------------------------------------

export async function removeCrewMember(input: {
  crew_circle_id: string
  staff_member_id: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify circle belongs to tenant
  const { data: circle } = await db
    .from('crew_circles')
    .select('id')
    .eq('id', input.crew_circle_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) {
    return { success: false, error: 'Crew circle not found or unauthorized' }
  }

  const { error } = await db
    .from('crew_members')
    .delete()
    .eq('crew_circle_id', input.crew_circle_id)
    .eq('staff_member_id', input.staff_member_id)

  if (error) {
    console.error('[removeCrewMember]', error)
    return { success: false, error: 'Failed to remove crew member' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ---------------------------------------------------------------------------
// setCrewAvailability - Set/update availability for a staff member
// ---------------------------------------------------------------------------

export async function setCrewAvailability(input: {
  crew_circle_id: string
  staff_member_id: string
  event_id?: string | null
  date: string
  status: CrewAvailabilityStatus
  note?: string | null
}): Promise<{ success: boolean; availability?: CrewAvailability; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify circle belongs to tenant
  const { data: circle } = await db
    .from('crew_circles')
    .select('id')
    .eq('id', input.crew_circle_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) {
    return { success: false, error: 'Crew circle not found or unauthorized' }
  }

  // Verify staff member is in this circle
  const { data: membership } = await db
    .from('crew_members')
    .select('id')
    .eq('crew_circle_id', input.crew_circle_id)
    .eq('staff_member_id', input.staff_member_id)
    .single()

  if (!membership) {
    return { success: false, error: 'Staff member is not in this crew circle' }
  }

  // Validate status
  const validStatuses: CrewAvailabilityStatus[] = ['available', 'tentative', 'unavailable']
  if (!validStatuses.includes(input.status)) {
    return { success: false, error: 'Invalid availability status' }
  }

  // Upsert on (crew_circle_id, staff_member_id, date)
  const { data, error } = await db
    .from('crew_availability')
    .upsert(
      {
        crew_circle_id: input.crew_circle_id,
        staff_member_id: input.staff_member_id,
        event_id: input.event_id || null,
        date: input.date,
        status: input.status,
        note: input.note?.trim() || null,
      },
      { onConflict: 'crew_circle_id,staff_member_id,date' }
    )
    .select(
      'id, crew_circle_id, staff_member_id, event_id, date, status, note, created_at, updated_at'
    )
    .single()

  if (error) {
    console.error('[setCrewAvailability]', error)
    return { success: false, error: 'Failed to set availability' }
  }

  revalidatePath('/dashboard')
  return { success: true, availability: data as CrewAvailability }
}

// ---------------------------------------------------------------------------
// getCrewForEvent - Get all crew members available for a specific event
// ---------------------------------------------------------------------------

export async function getCrewForEvent(input: {
  crew_circle_id: string
  event_id: string
}): Promise<{ members: (CrewMember & { availability?: CrewAvailability })[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify circle belongs to tenant
  const { data: circle } = await db
    .from('crew_circles')
    .select('id')
    .eq('id', input.crew_circle_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) return { members: [] }

  // Get all members with staff info
  const { data: members, error: membersErr } = await db
    .from('crew_members')
    .select('id, crew_circle_id, staff_member_id, role, joined_at')
    .eq('crew_circle_id', input.crew_circle_id)
    .order('joined_at', { ascending: true })

  if (membersErr || !members || members.length === 0) return { members: [] }

  const staffIds = members.map((m: any) => m.staff_member_id)

  // Fetch staff details and availability in parallel
  const [staffResult, availResult] = await Promise.all([
    db.from('staff_members').select('id, name, email, phone').in('id', staffIds),
    db
      .from('crew_availability')
      .select(
        'id, crew_circle_id, staff_member_id, event_id, date, status, note, created_at, updated_at'
      )
      .eq('crew_circle_id', input.crew_circle_id)
      .eq('event_id', input.event_id),
  ])

  const staffMap = new Map<string, { name: string; email: string | null; phone: string | null }>()
  for (const s of staffResult.data || []) {
    staffMap.set(s.id, { name: s.name, email: s.email, phone: s.phone })
  }

  const availMap = new Map<string, CrewAvailability>()
  for (const a of availResult.data || []) {
    availMap.set(a.staff_member_id, a as CrewAvailability)
  }

  const enriched = members.map((m: any) => {
    const staff = staffMap.get(m.staff_member_id)
    return {
      ...m,
      staff_name: staff?.name,
      staff_email: staff?.email,
      staff_phone: staff?.phone,
      availability: availMap.get(m.staff_member_id) || undefined,
    }
  })

  return { members: enriched }
}

// ---------------------------------------------------------------------------
// getCrewCircles - List all crew circles for the current chef (tenant-scoped)
// ---------------------------------------------------------------------------

export async function getCrewCircles(): Promise<CrewCircle[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('crew_circles')
    .select('id, tenant_id, name, description, created_at, updated_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCrewCircles]', error)
    return []
  }

  return (data || []) as CrewCircle[]
}
