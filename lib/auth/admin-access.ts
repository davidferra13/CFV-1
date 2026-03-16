export type AdminAccessLevel = 'admin' | 'owner'

type SupabaseReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: unknown
      ) => {
        eq: (
          column: string,
          value: unknown
        ) => {
          maybeSingle: () => Promise<{
            data: {
              auth_user_id: string
              email: string | null
              access_level: AdminAccessLevel
            } | null
            error: { message: string } | null
          }>
        }
      }
    }
  }
}

export type PersistedAdminAccess = {
  authUserId: string
  email: string | null
  accessLevel: AdminAccessLevel
}

export async function getPersistedAdminAccessForAuthUser(
  supabase: SupabaseReader,
  authUserId: string
): Promise<PersistedAdminAccess | null> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('auth_user_id, email, access_level')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    authUserId: data.auth_user_id,
    email: data.email,
    accessLevel: data.access_level,
  }
}

export async function hasPersistedAdminAccessForAuthUser(
  supabase: SupabaseReader,
  authUserId: string
): Promise<boolean> {
  const access = await getPersistedAdminAccessForAuthUser(supabase, authUserId)
  return access !== null
}
