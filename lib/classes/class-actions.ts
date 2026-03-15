'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type CookingClassRow = {
  id: string
  tenant_id: string
  title: string
  description: string | null
  class_date: string
  duration_minutes: number
  max_capacity: number
  price_per_person_cents: number
  location: string | null
  menu_id: string | null
  skill_level: string | null
  cuisine_type: string | null
  what_to_bring: string[] | null
  what_included: string[] | null
  status: string
  registration_deadline: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type ClassRegistrationRow = {
  id: string
  tenant_id: string
  class_id: string
  attendee_name: string
  attendee_email: string
  allergies: string[] | null
  dietary_restrictions: string[] | null
  status: string
  amount_paid_cents: number
  payment_status: string | null
  notes: string | null
  registered_at: string
}

export type CreateClassInput = {
  title: string
  description?: string
  class_date: string
  duration_minutes?: number
  max_capacity?: number
  price_per_person_cents: number
  location?: string
  menu_id?: string
  skill_level?: string
  cuisine_type?: string
  what_to_bring?: string[]
  what_included?: string[]
  registration_deadline?: string
}

export type UpdateClassInput = Partial<CreateClassInput> & {
  status?: string
}

export type RegisterAttendeeInput = {
  attendee_name: string
  attendee_email: string
  allergies?: string[]
  dietary_restrictions?: string[]
  notes?: string
}

export type ClassCapacityStatus = {
  maxCapacity: number
  registered: number
  waitlisted: number
  available: number
  isFull: boolean
}

export type ClassDietarySummary = {
  totalAttendees: number
  allergies: Record<string, number>
  dietaryRestrictions: Record<string, number>
}

export type ClassListOptions = {
  upcoming?: boolean
  past?: boolean
  status?: string
}

// ── Chef Actions ───────────────────────────────────────────────────────────

export async function createClass(data: CreateClassInput): Promise<CookingClassRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: row, error } = await supabase
    .from('cooking_classes' as any)
    .insert({
      tenant_id: tenantId,
      title: data.title,
      description: data.description ?? null,
      class_date: data.class_date,
      duration_minutes: data.duration_minutes ?? 120,
      max_capacity: data.max_capacity ?? 10,
      price_per_person_cents: data.price_per_person_cents,
      location: data.location ?? null,
      menu_id: data.menu_id ?? null,
      skill_level: data.skill_level ?? null,
      cuisine_type: data.cuisine_type ?? null,
      what_to_bring: data.what_to_bring ?? [],
      what_included: data.what_included ?? [],
      registration_deadline: data.registration_deadline ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createClass] Error:', error)
    throw new Error('Failed to create cooking class')
  }

  revalidatePath('/classes')
  return row as CookingClassRow
}

export async function updateClass(id: string, data: UpdateClassInput): Promise<CookingClassRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) updatePayload.title = data.title
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.class_date !== undefined) updatePayload.class_date = data.class_date
  if (data.duration_minutes !== undefined) updatePayload.duration_minutes = data.duration_minutes
  if (data.max_capacity !== undefined) updatePayload.max_capacity = data.max_capacity
  if (data.price_per_person_cents !== undefined)
    updatePayload.price_per_person_cents = data.price_per_person_cents
  if (data.location !== undefined) updatePayload.location = data.location
  if (data.menu_id !== undefined) updatePayload.menu_id = data.menu_id
  if (data.skill_level !== undefined) updatePayload.skill_level = data.skill_level
  if (data.cuisine_type !== undefined) updatePayload.cuisine_type = data.cuisine_type
  if (data.what_to_bring !== undefined) updatePayload.what_to_bring = data.what_to_bring
  if (data.what_included !== undefined) updatePayload.what_included = data.what_included
  if (data.registration_deadline !== undefined)
    updatePayload.registration_deadline = data.registration_deadline
  if (data.status !== undefined) updatePayload.status = data.status

  const { data: row, error } = await supabase
    .from('cooking_classes' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('[updateClass] Error:', error)
    throw new Error('Failed to update cooking class')
  }

  revalidatePath('/classes')
  revalidatePath(`/classes/${id}`)
  return row as CookingClassRow
}

export async function deleteClass(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Only allow deleting draft classes
  const { data: existing, error: fetchError } = await supabase
    .from('cooking_classes' as any)
    .select('status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Class not found')
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft classes can be deleted. Cancel the class instead.')
  }

  const { error } = await supabase
    .from('cooking_classes' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[deleteClass] Error:', error)
    throw new Error('Failed to delete cooking class')
  }

  revalidatePath('/classes')
}

export async function getClasses(options?: ClassListOptions): Promise<CookingClassRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('cooking_classes' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  const now = new Date().toISOString()

  if (options?.upcoming) {
    query = query.gte('class_date', now)
  }

  if (options?.past) {
    query = query.lt('class_date', now)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('class_date', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('[getClasses] Error:', error)
    return []
  }

  return (data ?? []) as CookingClassRow[]
}

export async function getClassDetail(id: string): Promise<{
  classData: CookingClassRow
  registrations: ClassRegistrationRow[]
} | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: classData, error: classError } = await supabase
    .from('cooking_classes' as any)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (classError || !classData) {
    return null
  }

  const { data: registrations, error: regError } = await supabase
    .from('class_registrations' as any)
    .select('*')
    .eq('class_id', id)
    .eq('tenant_id', tenantId)
    .order('registered_at', { ascending: true })

  if (regError) {
    console.error('[getClassDetail] Registration fetch error:', regError)
  }

  return {
    classData: classData as CookingClassRow,
    registrations: (registrations ?? []) as ClassRegistrationRow[],
  }
}

export async function registerForClass(
  classId: string,
  attendeeData: RegisterAttendeeInput
): Promise<ClassRegistrationRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Check capacity
  const capacity = await getClassCapacityStatus(classId)
  const status = capacity.isFull ? 'waitlisted' : 'registered'

  const { data: row, error } = await supabase
    .from('class_registrations' as any)
    .insert({
      tenant_id: tenantId,
      class_id: classId,
      attendee_name: attendeeData.attendee_name,
      attendee_email: attendeeData.attendee_email,
      allergies: attendeeData.allergies ?? [],
      dietary_restrictions: attendeeData.dietary_restrictions ?? [],
      notes: attendeeData.notes ?? null,
      status,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[registerForClass] Error:', error)
    throw new Error('Failed to register for class')
  }

  // If class is now full, update status to 'full'
  if (!capacity.isFull && capacity.available === 1) {
    await supabase
      .from('cooking_classes' as any)
      .update({ status: 'full', updated_at: new Date().toISOString() })
      .eq('id', classId)
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
  }

  revalidatePath('/classes')
  revalidatePath(`/classes/${classId}`)
  return row as ClassRegistrationRow
}

export async function cancelRegistration(registrationId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the registration to find class_id
  const { data: reg, error: fetchError } = await supabase
    .from('class_registrations' as any)
    .select('class_id, status')
    .eq('id', registrationId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !reg) {
    throw new Error('Registration not found')
  }

  const wasRegistered = reg.status === 'registered' || reg.status === 'confirmed'

  // Cancel the registration
  const { error } = await supabase
    .from('class_registrations' as any)
    .update({ status: 'cancelled' })
    .eq('id', registrationId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[cancelRegistration] Error:', error)
    throw new Error('Failed to cancel registration')
  }

  // Auto-promote from waitlist if a registered spot opened up
  if (wasRegistered) {
    const { data: nextWaitlisted } = await supabase
      .from('class_registrations' as any)
      .select('id')
      .eq('class_id', reg.class_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'waitlisted')
      .order('registered_at', { ascending: true })
      .limit(1)
      .single()

    if (nextWaitlisted) {
      await supabase
        .from('class_registrations' as any)
        .update({ status: 'registered' })
        .eq('id', nextWaitlisted.id)
        .eq('tenant_id', tenantId)
    }

    // If class was full, set back to published
    await supabase
      .from('cooking_classes' as any)
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', reg.class_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'full')
  }

  revalidatePath('/classes')
  revalidatePath(`/classes/${reg.class_id}`)
}

export async function getClassCapacityStatus(classId: string): Promise<ClassCapacityStatus> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: classData } = await supabase
    .from('cooking_classes' as any)
    .select('max_capacity')
    .eq('id', classId)
    .eq('tenant_id', tenantId)
    .single()

  if (!classData) {
    throw new Error('Class not found')
  }

  const maxCapacity = classData.max_capacity ?? 10

  const { count: registered } = await supabase
    .from('class_registrations' as any)
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .in('status', ['registered', 'confirmed'])

  const { count: waitlisted } = await supabase
    .from('class_registrations' as any)
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .eq('status', 'waitlisted')

  const registeredCount = registered ?? 0
  const waitlistedCount = waitlisted ?? 0
  const available = Math.max(0, maxCapacity - registeredCount)

  return {
    maxCapacity,
    registered: registeredCount,
    waitlisted: waitlistedCount,
    available,
    isFull: available === 0,
  }
}

export async function getClassDietarySummary(classId: string): Promise<ClassDietarySummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: registrations, error } = await supabase
    .from('class_registrations' as any)
    .select('allergies, dietary_restrictions')
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .in('status', ['registered', 'confirmed'])

  if (error) {
    console.error('[getClassDietarySummary] Error:', error)
    return { totalAttendees: 0, allergies: {}, dietaryRestrictions: {} }
  }

  const rows = (registrations ?? []) as {
    allergies: string[] | null
    dietary_restrictions: string[] | null
  }[]

  const allergies: Record<string, number> = {}
  const dietaryRestrictions: Record<string, number> = {}

  for (const row of rows) {
    if (row.allergies) {
      for (const a of row.allergies) {
        const key = a.toLowerCase().trim()
        if (key) allergies[key] = (allergies[key] ?? 0) + 1
      }
    }
    if (row.dietary_restrictions) {
      for (const d of row.dietary_restrictions) {
        const key = d.toLowerCase().trim()
        if (key) dietaryRestrictions[key] = (dietaryRestrictions[key] ?? 0) + 1
      }
    }
  }

  return {
    totalAttendees: rows.length,
    allergies,
    dietaryRestrictions,
  }
}
