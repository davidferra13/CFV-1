import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'

export type PublicPlatformTestimonial = {
  id: string
  client_name: string
  display_name: string | null
  rating: number | null
  content: string
  event_type: string | null
  is_featured: boolean
  submitted_at: string | null
}

async function _getPublicPlatformTestimonials(): Promise<PublicPlatformTestimonial[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('testimonials' as any)
    .select('id, client_name, display_name, rating, content, event_type, is_featured, submitted_at')
    .eq('is_approved', true)
    .eq('is_public', true)
    .not('submitted_at', 'is', null)
    .not('content', 'is', null)
    .order('is_featured', { ascending: false })
    .order('submitted_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('[getPublicPlatformTestimonials] Error:', error)
    return []
  }

  return (data ?? []) as PublicPlatformTestimonial[]
}

export const getPublicPlatformTestimonials = unstable_cache(
  _getPublicPlatformTestimonials,
  ['public-platform-testimonials'],
  { revalidate: 300, tags: ['public-platform-testimonials'] }
)
