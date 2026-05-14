import Image from 'next/image'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { ScrollReveal } from './scroll-reveal'

interface FeaturedChefSpotlightProps {
  chefs: Array<{
    slug: string
    displayName: string
    primaryCuisine: string | null
    city: string | null
    state: string | null
    profileImageUrl?: string | null
  }>
}

export function FeaturedChefSpotlight({ chefs }: FeaturedChefSpotlightProps) {
  const ranked = chefs
    .filter((c) => c.profileImageUrl)
    .map((c) => ({
      ...c,
      score: (c.profileImageUrl ? 1 : 0) + (c.city ? 1 : 0) + (c.primaryCuisine ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)

  const chef = ranked[0]
  if (!chef) return null

  const location = [chef.city, chef.state].filter(Boolean).join(', ')
  const subtitle = [chef.primaryCuisine, location].filter(Boolean).join(' · ')

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <ScrollReveal>
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#5c3520]/50 bg-gradient-to-r from-[#1e0f08]/80 via-[#2a1510]/60 to-[#1e0f08]/80 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl">
              <Image
                src={getOptimizedAvatar(chef.profileImageUrl!, 120)}
                alt={chef.displayName}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <p className="text-xs uppercase tracking-widest text-[#e8a96b]">Featured Chef</p>
              <h3 className="mt-1 font-display-serif text-2xl font-bold text-white sm:text-3xl">
                {chef.displayName}
              </h3>
              {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
              <TrackedLink
                href={`/chef/${chef.slug}`}
                analyticsName="home_featured_chef_spotlight"
                className="gradient-accent mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold text-white"
              >
                View profile
              </TrackedLink>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
