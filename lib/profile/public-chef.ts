export async function findChefByPublicSlug<T>(
  db: any,
  slug: string,
  select: string
): Promise<{ data: T | null; matchedOn: 'slug' | 'booking_slug' | null; error: any }> {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) {
    return { data: null, matchedOn: null, error: null }
  }

  // Run both lookups in parallel instead of sequentially
  const [bySlug, byBookingSlug] = await Promise.all([
    db.from('chefs').select(select).eq('slug', normalizedSlug).maybeSingle(),
    db.from('chefs').select(select).eq('booking_slug', normalizedSlug).maybeSingle(),
  ])

  // Prefer slug match over booking_slug match
  if (bySlug.data) {
    return { data: bySlug.data as T, matchedOn: 'slug', error: null }
  }
  if (byBookingSlug.data) {
    return { data: byBookingSlug.data as T, matchedOn: 'booking_slug', error: null }
  }

  return {
    data: null,
    matchedOn: null,
    error: bySlug.error ?? byBookingSlug.error ?? null,
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
