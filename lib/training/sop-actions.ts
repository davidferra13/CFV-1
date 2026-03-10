'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types

export type SOPCategory =
  | 'food_safety'
  | 'opening_closing'
  | 'recipes'
  | 'equipment'
  | 'customer_service'
  | 'cleaning'
  | 'emergency'
  | 'general'

export type StaffRole = 'cook' | 'server' | 'manager' | 'driver' | 'all'

export type SOP = {
  id: string
  tenant_id: string
  title: string
  category: SOPCategory
  content: string
  version: number
  required_for_roles: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SOPCompletion = {
  id: string
  tenant_id: string
  sop_id: string
  staff_member_id: string
  version_completed: number
  completed_at: string
  notes: string | null
}

export type TrainingStatus = {
  sop: SOP
  completed: boolean
  outdated: boolean // completed an older version
  version_completed: number | null
  completed_at: string | null
}

export type ComplianceRow = {
  staff_member_id: string
  staff_name: string
  statuses: Record<string, 'complete' | 'outdated' | 'pending'>
}

// Category labels for display
export const SOP_CATEGORY_LABELS: Record<SOPCategory, string> = {
  food_safety: 'Food Safety',
  opening_closing: 'Opening / Closing',
  recipes: 'Recipes',
  equipment: 'Equipment',
  customer_service: 'Customer Service',
  cleaning: 'Cleaning',
  emergency: 'Emergency',
  general: 'General',
}

// CRUD

export async function createSOP(input: {
  title: string
  category: SOPCategory
  content: string
  required_for_roles?: string[]
}): Promise<{ success: boolean; error?: string; sop?: SOP }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('sops')
    .insert({
      tenant_id: tenantId,
      title: input.title,
      category: input.category,
      content: input.content,
      required_for_roles: input.required_for_roles || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[sop] createSOP failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/training')
  return { success: true, sop: data as SOP }
}

export async function updateSOP(
  id: string,
  input: {
    title?: string
    category?: SOPCategory
    content?: string
    required_for_roles?: string[]
    is_active?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // If content changed, increment version
  const updateData: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  if (input.content !== undefined) {
    // Fetch current version
    const { data: current } = await supabase
      .from('sops')
      .select('version')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (current) {
      updateData.version = current.version + 1
    }
  }

  const { error } = await supabase
    .from('sops')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[sop] updateSOP failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/training')
  return { success: true }
}

export async function deleteSOP(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase.from('sops').delete().eq('id', id).eq('tenant_id', tenantId)

  if (error) {
    console.error('[sop] deleteSOP failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/training')
  return { success: true }
}

// Queries

export async function getSOPs(category?: SOPCategory): Promise<{ sops: SOP[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  let query = supabase
    .from('sops')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('category')
    .order('title')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[sop] getSOPs failed:', error)
    return { sops: [], error: error.message }
  }

  return { sops: (data || []) as SOP[] }
}

export async function getSOP(id: string): Promise<{ sop: SOP | null; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('sops')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('[sop] getSOP failed:', error)
    return { sop: null, error: error.message }
  }

  return { sop: data as SOP }
}

// Training tracking

export async function markSOPComplete(
  sopId: string,
  staffMemberId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Get current SOP version
  const { data: sop } = await supabase
    .from('sops')
    .select('version')
    .eq('id', sopId)
    .eq('tenant_id', tenantId)
    .single()

  if (!sop) {
    return { success: false, error: 'SOP not found' }
  }

  const { error } = await supabase.from('sop_completions').upsert(
    {
      tenant_id: tenantId,
      sop_id: sopId,
      staff_member_id: staffMemberId,
      version_completed: sop.version,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    },
    { onConflict: 'sop_id,staff_member_id,version_completed' }
  )

  if (error) {
    console.error('[sop] markSOPComplete failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/training')
  return { success: true }
}

export async function getStaffTrainingStatus(
  staffMemberId: string
): Promise<{ statuses: TrainingStatus[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Get all active SOPs
  const { data: sops, error: sopError } = await supabase
    .from('sops')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('category')
    .order('title')

  if (sopError) {
    return { statuses: [], error: sopError.message }
  }

  // Get all completions for this staff member
  const { data: completions, error: compError } = await supabase
    .from('sop_completions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('staff_member_id', staffMemberId)

  if (compError) {
    return { statuses: [], error: compError.message }
  }

  const completionMap = new Map<string, SOPCompletion>()
  for (const c of completions || []) {
    const existing = completionMap.get(c.sop_id)
    // Keep the highest version completed
    if (!existing || c.version_completed > existing.version_completed) {
      completionMap.set(c.sop_id, c as SOPCompletion)
    }
  }

  const statuses: TrainingStatus[] = (sops || []).map((sop) => {
    const completion = completionMap.get(sop.id)
    const completed = !!completion
    const outdated = completed && completion.version_completed < sop.version

    return {
      sop: sop as SOP,
      completed,
      outdated,
      version_completed: completion?.version_completed ?? null,
      completed_at: completion?.completed_at ?? null,
    }
  })

  return { statuses }
}

export async function getSOPComplianceMatrix(): Promise<{
  sops: SOP[]
  rows: ComplianceRow[]
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Get all active SOPs
  const { data: sops, error: sopError } = await supabase
    .from('sops')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('category')
    .order('title')

  if (sopError) {
    return { sops: [], rows: [], error: sopError.message }
  }

  // Get all staff
  const { data: staff, error: staffError } = await supabase
    .from('staff_members')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name')

  if (staffError) {
    return { sops: (sops || []) as SOP[], rows: [], error: staffError.message }
  }

  // Get all completions
  const { data: completions, error: compError } = await supabase
    .from('sop_completions')
    .select('*')
    .eq('tenant_id', tenantId)

  if (compError) {
    return {
      sops: (sops || []) as SOP[],
      rows: [],
      error: compError.message,
    }
  }

  // Build lookup: staffId -> sopId -> highest version completed
  const compMap = new Map<string, Map<string, number>>()
  for (const c of completions || []) {
    if (!compMap.has(c.staff_member_id)) {
      compMap.set(c.staff_member_id, new Map())
    }
    const staffMap = compMap.get(c.staff_member_id)!
    const existing = staffMap.get(c.sop_id) || 0
    if (c.version_completed > existing) {
      staffMap.set(c.sop_id, c.version_completed)
    }
  }

  const typedSops = (sops || []) as SOP[]

  const rows: ComplianceRow[] = (staff || []).map((s) => {
    const staffComps = compMap.get(s.id) || new Map()
    const statuses: Record<string, 'complete' | 'outdated' | 'pending'> = {}

    for (const sop of typedSops) {
      const versionDone = staffComps.get(sop.id)
      if (!versionDone) {
        statuses[sop.id] = 'pending'
      } else if (versionDone < sop.version) {
        statuses[sop.id] = 'outdated'
      } else {
        statuses[sop.id] = 'complete'
      }
    }

    return {
      staff_member_id: s.id,
      staff_name: s.name,
      statuses,
    }
  })

  return { sops: typedSops, rows }
}

export async function getOverdueTraining(): Promise<{
  items: Array<{
    staff_member_id: string
    staff_name: string
    sop_title: string
    sop_id: string
    status: 'pending' | 'outdated'
  }>
  error?: string
}> {
  const { sops, rows, error } = await getSOPComplianceMatrix()

  if (error) {
    return { items: [], error }
  }

  const items: Array<{
    staff_member_id: string
    staff_name: string
    sop_title: string
    sop_id: string
    status: 'pending' | 'outdated'
  }> = []

  for (const row of rows) {
    for (const sop of sops) {
      const status = row.statuses[sop.id]
      if (status === 'pending' || status === 'outdated') {
        items.push({
          staff_member_id: row.staff_member_id,
          staff_name: row.staff_name,
          sop_title: sop.title,
          sop_id: sop.id,
          status,
        })
      }
    }
  }

  return { items }
}

export async function generateOnboardingChecklist(
  role: StaffRole
): Promise<{ sops: SOP[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('sops')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('category')
    .order('title')

  if (error) {
    return { sops: [], error: error.message }
  }

  // Filter to SOPs that are required for this role or 'all'
  const filtered = (data || []).filter((sop) => {
    const roles = sop.required_for_roles as string[] | null
    if (!roles || roles.length === 0) return false
    return roles.includes(role) || roles.includes('all')
  })

  return { sops: filtered as SOP[] }
}

export async function getSOPStats(): Promise<{
  totalSOPs: number
  activeSOPs: number
  completionRate: number
  mostOverdue: string | null
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data: allSops } = await supabase
    .from('sops')
    .select('id, is_active')
    .eq('tenant_id', tenantId)

  const totalSOPs = allSops?.length || 0
  const activeSOPs = allSops?.filter((s) => s.is_active).length || 0

  const { items } = await getOverdueTraining()
  const overdueCount: Record<string, number> = {}
  for (const item of items) {
    overdueCount[item.sop_title] = (overdueCount[item.sop_title] || 0) + 1
  }

  let mostOverdue: string | null = null
  let maxCount = 0
  for (const [title, count] of Object.entries(overdueCount)) {
    if (count > maxCount) {
      mostOverdue = title
      maxCount = count
    }
  }

  // Completion rate: total completions / (active SOPs * active staff)
  const { data: staff } = await supabase
    .from('staff_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  const totalPossible = activeSOPs * (staff?.length || 0)
  const totalComplete = totalPossible - items.length
  const completionRate = totalPossible > 0 ? Math.round((totalComplete / totalPossible) * 100) : 0

  return {
    totalSOPs,
    activeSOPs,
    completionRate,
    mostOverdue,
  }
}
