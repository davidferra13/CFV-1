// Social Share Card Page - Public, no auth required
// Beautiful branded display of a dinner circle experience snapshot
// Optimized OG tags for social media link previews

import { getShareCard } from '@/lib/hub/share-card-actions'
import type { ShareCardSnapshot } from '@/lib/hub/share-card-actions'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface PageProps {
  params: { shareToken: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const card = await getShareCard(params.shareToken)
  if (!card) return { title: 'Experience Not Found' }

  const s = card.snapshot as ShareCardSnapshot
  const title = s.group_name || 'A Private Chef Experience'
  const description = buildDescription(s)
  const ogImageUrl = `/api/og/experience?token=${params.shareToken}`

  return {
    title: `${title} | ChefFlow`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      siteName: 'ChefFlow',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

function buildDescription(s: ShareCardSnapshot): string {
  const parts: string[] = []
  if (s.occasion) parts.push(s.occasion)
  if (s.chef_name) parts.push(`by ${s.chef_name}`)
  if (s.courses.length > 0) parts.push(`${s.courses.length} courses`)
  if (parts.length === 0) return 'A private chef dining experience on ChefFlow.'
  return parts.join(' - ') + ' on ChefFlow.'
}

export default async function ExperienceSharePage({ params }: PageProps) {
  const card = await getShareCard(params.shareToken)
  if (!card) notFound()

  const s = card.snapshot as ShareCardSnapshot
  const primaryColor = s.theme_colors?.primary ?? '#e88f47'

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-8 text-center">
          {s.group_emoji && <span className="mb-3 block text-5xl">{s.group_emoji}</span>}
          <h1 className="text-3xl font-bold text-stone-100 sm:text-4xl">{s.group_name}</h1>

          {s.theme_name && (
            <p className="mt-2 text-sm font-medium" style={{ color: primaryColor }}>
              {s.theme_name}
            </p>
          )}

          <div className="mt-3 flex items-center justify-center gap-4 text-sm text-stone-400">
            {s.occasion && <span>{s.occasion}</span>}
            {s.event_date && (
              <span>
                {new Date(s.event_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {s.guest_count && <span>{s.guest_count} guests</span>}
          </div>
        </div>

        {/* Chef */}
        {s.chef_name && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/80 px-6 py-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {s.chef_name[0]?.toUpperCase()}
              </div>
              <div className="text-left">
                <p className="font-semibold text-stone-100">{s.chef_name}</p>
                {s.chef_business && s.chef_business !== s.chef_name && (
                  <p className="text-xs text-stone-500">{s.chef_business}</p>
                )}
                <p className="text-xs text-stone-600">Private Chef</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        {s.courses.length > 0 && (
          <div className="mb-8 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 sm:p-8">
            <h2 className="mb-6 text-center text-xl font-semibold text-stone-100">The Menu</h2>
            <div className="space-y-6">
              {s.courses.map((course, i) => (
                <div key={i} className="text-center">
                  <h3
                    className="mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: primaryColor }}
                  >
                    {course.name}
                  </h3>
                  <div className="space-y-1">
                    {course.dishes.map((dish, j) => (
                      <p key={j} className="text-sm text-stone-300">
                        {dish}
                      </p>
                    ))}
                  </div>
                  {i < s.courses.length - 1 && (
                    <div className="mx-auto mt-4 h-px w-16 bg-stone-800" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {s.photos.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-center text-xl font-semibold text-stone-100">Moments</h2>
            <div
              className={`grid gap-3 ${
                s.photos.length === 1
                  ? 'grid-cols-1'
                  : s.photos.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {s.photos.map((photo, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-xl border border-stone-800 ${
                    s.photos.length === 1 ? 'aspect-video' : 'aspect-square'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {photo.caption && (
                    <div className="bg-stone-900 px-3 py-2">
                      <p className="text-xs text-stone-400">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cover image fallback if no photos but has cover */}
        {s.photos.length === 0 && s.cover_image_url && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.cover_image_url}
              alt={s.group_name}
              className="h-64 w-full object-cover sm:h-80"
            />
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 text-center">
          <p className="mb-1 text-lg font-semibold text-stone-100">
            Want your own private chef experience?
          </p>
          <p className="mb-4 text-sm text-stone-500">
            Book a personal chef for your next dinner party, celebration, or date night.
          </p>
          <a
            href="https://cheflowhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: primaryColor }}
          >
            Explore ChefFlow
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="https://cheflowhq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-600 transition hover:text-stone-400"
          >
            Powered by <span className="font-semibold" style={{ color: primaryColor }}>ChefFlow</span>
          </a>
        </div>
      </div>
    </div>
  )
}
