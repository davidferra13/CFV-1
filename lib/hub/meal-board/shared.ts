export type GroupAccessInput = {
  groupId: string
  groupToken?: string
  profileToken?: string
}

const MEAL_BOARD_MANAGER_ROLES = new Set(['owner', 'admin', 'chef', 'host'])
const MEAL_BOARD_CHEF_ROLES = new Set(['owner', 'admin', 'chef'])

export function liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function resolveProfile(db: any, profileToken: string) {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()
  if (!profile) throw new Error('Invalid profile token')
  return profile
}

export async function getGroupMembership(db: any, groupId: string, profileId: string) {
  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .single()
  return membership
}

export async function requireChefOrAdmin(db: any, groupId: string, profileId: string) {
  const membership = await getGroupMembership(db, groupId, profileId)
  if (!membership) throw new Error('Not a member of this group')
  if (!MEAL_BOARD_CHEF_ROLES.has(membership.role)) {
    throw new Error('Only chefs and admins can modify the meal board')
  }
  return membership
}

export async function hasManagerAccess(
  db: any,
  groupId: string,
  profileToken?: string
): Promise<boolean> {
  if (!profileToken) return false

  try {
    const profile = await resolveProfile(db, profileToken)
    const membership = await getGroupMembership(db, groupId, profile.id)
    return Boolean(membership && MEAL_BOARD_MANAGER_ROLES.has(membership.role))
  } catch {
    return false
  }
}

export async function hasMemberAccess(
  db: any,
  groupId: string,
  profileToken?: string
): Promise<boolean> {
  if (!profileToken) return false

  try {
    const profile = await resolveProfile(db, profileToken)
    const membership = await getGroupMembership(db, groupId, profile.id)
    return Boolean(membership)
  } catch {
    return false
  }
}

export async function verifyGroupToken(
  db: any,
  groupId: string,
  groupToken?: string
): Promise<boolean> {
  if (!groupToken) return false

  const { data: group, error: groupError } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', groupId)
    .eq('group_token', groupToken)
    .maybeSingle()
  if (groupError) throw new Error(`Failed to verify circle access: ${groupError.message}`)
  return Boolean(group)
}

export async function hasGroupReadAccess(db: any, access: GroupAccessInput): Promise<boolean> {
  if (await verifyGroupToken(db, access.groupId, access.groupToken)) return true
  return hasMemberAccess(db, access.groupId, access.profileToken)
}

export function normalizeGroupAccessInput(input: string | GroupAccessInput): GroupAccessInput {
  return typeof input === 'string' ? { groupId: input } : input
}
