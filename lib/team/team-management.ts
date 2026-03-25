import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const InviteTeamMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'lead_chef', 'sous_chef', 'prep_chef', 'admin']).default('sous_chef'),
  memberChefId: z.string().uuid().optional(),
})

const UpdateTeamMemberSchema = z.object({
  role: z.enum(['owner', 'lead_chef', 'sous_chef', 'prep_chef', 'admin']).optional(),
  status: z.enum(['invited', 'active', 'inactive', 'removed']).optional(),
})

type DbTeamMember = {
  id: string
  tenant_id: string
  member_chef_id: string | null
  member_email: string
  member_name: string
  role: string
  status: string
  created_at: string
  accepted_at: string | null
}

export type TeamMember = {
  id: string
  tenantId: string
  memberChefId: string | null
  email: string
  name: string
  role: string
  status: string
  createdAt: string
  acceptedAt: string | null
  source: 'team_table' | 'staff_fallback'
}

function isMissingRelation(error: any): boolean {
  return error?.code === '42P01'
}

function mapTeamRow(row: DbTeamMember): TeamMember {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    memberChefId: row.member_chef_id,
    email: row.member_email,
    name: row.member_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    source: 'team_table',
  }
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_team_members')
    .select(
      'id, tenant_id, member_chef_id, member_email, member_name, role, status, created_at, accepted_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (!error) {
    return ((data || []) as DbTeamMember[]).map(mapTeamRow)
  }

  if (!isMissingRelation(error)) {
    throw new Error(`Failed to load team members: ${error.message}`)
  }

  // Backward-compatible fallback: treat staff roster as team members.
  const { data: staff, error: staffError } = await db
    .from('staff_members')
    .select('id, chef_id, email, name, role, status, created_at')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (staffError) {
    throw new Error(`Failed to load fallback staff team: ${staffError.message}`)
  }

  return ((staff || []) as Array<any>).map((member) => ({
    id: member.id,
    tenantId: member.chef_id,
    memberChefId: null,
    email: member.email || '',
    name: member.name || 'Team Member',
    role: member.role || 'sous_chef',
    status: member.status || 'active',
    createdAt: member.created_at,
    acceptedAt: null,
    source: 'staff_fallback' as const,
  }))
}

export async function inviteTeamMember(input: z.infer<typeof InviteTeamMemberSchema>) {
  const user = await requireChef()
  const validated = InviteTeamMemberSchema.parse(input)
  const db: any = createServerClient()

  const payload = {
    tenant_id: user.tenantId!,
    chef_id: user.entityId,
    member_chef_id: validated.memberChefId || null,
    member_email: validated.email.toLowerCase(),
    member_name: validated.name,
    role: validated.role,
    status: 'invited',
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('chef_team_members')
    .insert(payload)
    .select(
      'id, tenant_id, member_chef_id, member_email, member_name, role, status, created_at, accepted_at'
    )
    .single()

  if (!error && data) {
    revalidatePath('/team')
    return mapTeamRow(data as DbTeamMember)
  }

  if (!isMissingRelation(error)) {
    throw new Error(`Failed to invite team member: ${error?.message || 'Unknown error'}`)
  }

  // Fallback for older environments: add as staff member.
  const { data: staffData, error: staffError } = await db
    .from('staff_members')
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      email: validated.email.toLowerCase(),
      role: 'other',
      status: 'active',
    })
    .select('id, chef_id, email, name, role, status, created_at')
    .single()

  if (staffError || !staffData) {
    throw new Error(
      `Failed to invite fallback staff member: ${staffError?.message || 'Unknown error'}`
    )
  }

  revalidatePath('/team')
  return {
    id: staffData.id,
    tenantId: staffData.chef_id,
    memberChefId: null,
    email: staffData.email || '',
    name: staffData.name || 'Team Member',
    role: staffData.role || validated.role,
    status: staffData.status || 'active',
    createdAt: staffData.created_at,
    acceptedAt: null,
    source: 'staff_fallback' as const,
  }
}

export async function updateTeamMember(
  memberId: string,
  input: z.infer<typeof UpdateTeamMemberSchema>
) {
  const user = await requireChef()
  const validated = UpdateTeamMemberSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_team_members')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('tenant_id', user.tenantId!)
    .select(
      'id, tenant_id, member_chef_id, member_email, member_name, role, status, created_at, accepted_at'
    )
    .single()

  if (!error && data) {
    revalidatePath('/team')
    return mapTeamRow(data as DbTeamMember)
  }

  if (!isMissingRelation(error)) {
    throw new Error(`Failed to update team member: ${error?.message || 'Unknown error'}`)
  }

  const fallbackUpdate: Record<string, unknown> = {}
  if (validated.status) {
    fallbackUpdate.status = validated.status === 'active' ? 'active' : 'inactive'
  }

  const { data: staffData, error: staffError } = await db
    .from('staff_members')
    .update(fallbackUpdate)
    .eq('id', memberId)
    .eq('chef_id', user.tenantId!)
    .select('id, chef_id, email, name, role, status, created_at')
    .single()

  if (staffError || !staffData) {
    throw new Error(
      `Failed to update fallback team member: ${staffError?.message || 'Unknown error'}`
    )
  }

  revalidatePath('/team')
  return {
    id: staffData.id,
    tenantId: staffData.chef_id,
    memberChefId: null,
    email: staffData.email || '',
    name: staffData.name || 'Team Member',
    role: staffData.role || 'other',
    status: staffData.status || 'inactive',
    createdAt: staffData.created_at,
    acceptedAt: null,
    source: 'staff_fallback' as const,
  }
}

export async function removeTeamMember(memberId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_team_members')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('tenant_id', user.tenantId!)

  if (!error) {
    revalidatePath('/team')
    return { success: true }
  }

  if (!isMissingRelation(error)) {
    throw new Error(`Failed to remove team member: ${error.message}`)
  }

  const { error: staffError } = await db
    .from('staff_members')
    .update({ status: 'inactive' })
    .eq('id', memberId)
    .eq('chef_id', user.tenantId!)

  if (staffError) {
    throw new Error(`Failed to remove fallback team member: ${staffError.message}`)
  }

  revalidatePath('/team')
  return { success: true }
}
