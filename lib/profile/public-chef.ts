export async function findChefByPublicSlug<T>(
  supabase: any,
  slug: string,
  select: string
): Promise<{ data: T | null; matchedOn: 'slug' | 'booking_slug' | null; error: any }> {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) {
    return { data: null, matchedOn: null, error: null }
  }

  const bySlug = await supabase
    .from('chefs')
    .select(select)
    .eq('slug', normalizedSlug)
    .maybeSingle()
  if (bySlug.data) {
    return { data: bySlug.data as T, matchedOn: 'slug', error: null }
  }
  if (bySlug.error && bySlug.error.code !== 'PGRST116') {
    return { data: null, matchedOn: null, error: bySlug.error }
  }

  const byBookingSlug = await supabase
    .from('chefs')
    .select(select)
    .eq('booking_slug', normalizedSlug)
    .maybeSingle()

  if (byBookingSlug.data) {
    return { data: byBookingSlug.data as T, matchedOn: 'booking_slug', error: null }
  }

  return {
    data: null,
    matchedOn: null,
    error: byBookingSlug.error ?? bySlug.error ?? null,
  }
}

export function getPublicChefPathSlug(chef: {
  slug?: string | null
  booking_slug?: string | null
}) {
  return chef.slug?.trim() || chef.booking_slug?.trim() || null
}

export function getPublicInquirySlug(chef: { booking_slug?: string | null; slug?: string | null }) {
  return chef.booking_slug?.trim() || chef.slug?.trim() || null
}
