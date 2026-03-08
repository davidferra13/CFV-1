type ChefLookupRow = Record<string, unknown>

const CHEF_PUBLIC_SLUG_COLUMNS = ['booking_slug', 'slug', 'public_slug'] as const

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message ?? '')
}

/**
 * Resolve a chef by any currently-supported public slug column.
 * The codebase still has multiple generations of public identifiers in flight:
 * - booking_slug for /book/[chefSlug]
 * - slug for /chef/[slug]
 * - public_slug in older client-portal paths
 */
export async function resolveChefByPublicSlug<T extends ChefLookupRow>(
  supabase: any,
  rawSlug: string,
  select: string
): Promise<T | null> {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) return null

  for (const column of CHEF_PUBLIC_SLUG_COLUMNS) {
    const { data, error } = await supabase
      .from('chefs')
      .select(select)
      .eq(column as any, slug)
      .maybeSingle()

    if (error) {
      if (isMissingColumnError(error)) continue
      throw error
    }

    if (data) return data as T
  }

  return null
}
