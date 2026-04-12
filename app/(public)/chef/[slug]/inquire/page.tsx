// Public Inquiry Form Page
// No authentication required - anyone can submit an inquiry to a chef
// Two-column layout on desktop: form on the left, chef proof context on the right.
// Mobile: context card stacks above the form.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { ReviewShowcase } from '@/components/public/review-showcase'
import { DietaryTrustStrip } from '@/components/public/dietary-trust-strip'
import { ExternalLink } from '@/components/ui/icons'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'
import {
  getPublicAchievements,
  getPublicCharityImpact,
  getPublicWorkHistory,
} from '@/lib/credentials/actions'
import { createServerClient } from '@/lib/db/server'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const slug = data.chef.inquiry_slug || data.chef.public_slug || params.slug

  return {
    title: `Inquire with ${data.chef.display_name}`,
    description: `Share your event details with ${data.chef.display_name}.`,
    alternates: {
      canonical: `${baseUrl}/chef/${slug}/inquire`,
    },
  }
}

export default async function InquirePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const publicSlug = data.chef.public_slug || params.slug
  const inquirySlug = data.chef.inquiry_slug || publicSlug
  const primaryColor = data.chef.portal_primary_color || '#1c1917'
  const backgroundColor = data.chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = data.chef.portal_background_image_url
  const pageBackgroundStyle = backgroundImageUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.92)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' as const,
      }
    : { backgroundColor }

  const hasWebsiteLink = Boolean(data.chef.website_url && data.chef.show_website_on_public_profile)

  const [reviewFeed, availabilitySignals, workHistory, achievements, charityImpact, chefCredRow] =
    await Promise.all([
      getPublicChefReviewFeed(data.chef.id),
      data.chef.show_availability_signals
        ? getPublicAvailabilitySignals(data.chef.id)
        : Promise.resolve([]),
      getPublicWorkHistory(data.chef.id).catch(() => []),
      getPublicAchievements(data.chef.id).catch(() => []),
      getPublicCharityImpact(data.chef.id).catch(() => ({
        totalHours: 0,
        totalEntries: 0,
        uniqueOrgs: 0,
        verified501cOrgs: 0,
        publicCharityPercent: null,
        publicCharityNote: null,
        showPublicCharity: false,
        organizations: [],
      })),
      (async () => {
        try {
          const db: any = createServerClient({ admin: true })
          const { data: chefRow } = await db
            .from('chefs')
            .select('show_resume_available_note')
            .eq('id', data.chef.id)
            .single()
          return { showResumeAvailableNote: chefRow?.show_resume_available_note ?? false }
        } catch {
          return { showResumeAvailableNote: false }
        }
      })(),
    ])

  const nextSignals = availabilitySignals.slice(0, 3)
  const topWorkHistory = workHistory.slice(0, 2)
  const topAchievements = achievements.slice(0, 2)
  const showCompactCharity =
    charityImpact.showPublicCharity &&
    (charityImpact.totalHours > 0 ||
      charityImpact.publicCharityPercent !== null ||
      Boolean(charityImpact.publicCharityNote) ||
      charityImpact.organizations.length > 0)
  const hasCompactCredentials =
    topWorkHistory.length > 0 ||
    topAchievements.length > 0 ||
    showCompactCharity ||
    chefCredRow.showResumeAvailableNote

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
        {data.chef.discovery.accepting_inquiries ? (
          <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-start">
            {/* Left column: inquiry form */}
            <div className="flex-1 min-w-0">
              <PublicInquiryForm
                chefSlug={inquirySlug}
                chefName={data.chef.display_name}
                primaryColor={primaryColor}
              />
            </div>

            {/* Right column: sticky chef proof/context card */}
            <div className="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-8">
              <div className="rounded-2xl border border-stone-700 bg-stone-900/90 overflow-hidden">
                {/* Chef identity */}
                <div className="p-5 border-b border-stone-800">
                  <div className="flex items-center gap-3 mb-3">
                    {data.chef.profile_image_url ? (
                      <Image
                        src={getOptimizedAvatar(data.chef.profile_image_url, 64)}
                        alt={data.chef.display_name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-stone-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-stone-400">
                          {data.chef.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-100 truncate">
                        {data.chef.display_name}
                      </p>
                      {data.chef.tagline && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate">
                          {data.chef.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  {reviewFeed.stats.totalReviews > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <svg
                        className="h-4 w-4 text-amber-400 fill-current flex-shrink-0"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold text-stone-100">
                        {reviewFeed.stats.averageRating.toFixed(1)}
                      </span>
                      <span className="text-stone-400">
                        ({reviewFeed.stats.totalReviews}{' '}
                        {reviewFeed.stats.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Dietary trust context */}
                {data.chef.dietaryTrust && (
                  <div className="p-5 border-b border-stone-800">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                      Dietary handling
                    </p>
                    <DietaryTrustStrip summary={data.chef.dietaryTrust} compact maxChips={4} />
                  </div>
                )}

                {/* Review excerpts */}
                {reviewFeed.reviews.length > 0 && (
                  <div className="p-5 border-b border-stone-800">
                    <ReviewShowcase
                      reviews={reviewFeed.reviews}
                      stats={reviewFeed.stats}
                      compact
                      maxCompact={2}
                    />
                  </div>
                )}

                {/* Availability signals */}
                {nextSignals.length > 0 && (
                  <div className="p-5 border-b border-stone-800">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                      Available dates
                    </p>
                    <div className="space-y-2">
                      {nextSignals.map((signal) => {
                        const dateLabel = new Date(
                          `${signal.start_date}T00:00:00`
                        ).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                        return (
                          <div
                            key={signal.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-stone-300 font-medium">{dateLabel}</span>
                            {signal.public_note && (
                              <span className="text-stone-500 truncate ml-2">
                                {signal.public_note}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {hasCompactCredentials && (
                  <div className="p-5 border-b border-stone-800">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                      Professional background
                    </p>

                    <div className="space-y-3 text-xs text-stone-300">
                      {topWorkHistory.length > 0 && (
                        <div className="space-y-2">
                          {topWorkHistory.map((entry) => (
                            <div key={entry.id}>
                              <p className="font-medium text-stone-200">{entry.role_title}</p>
                              <p className="text-stone-500">
                                {entry.organization_name}
                                {entry.location_label ? ` · ${entry.location_label}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {topAchievements.length > 0 && (
                        <div className="space-y-1">
                          {topAchievements.map((achievement: any) => (
                            <p key={achievement.id} className="text-stone-400">
                              {achievement.title}
                            </p>
                          ))}
                        </div>
                      )}

                      {showCompactCharity && (
                        <div className="rounded-lg border border-stone-700 bg-stone-800/70 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                            Community impact
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {charityImpact.publicCharityPercent !== null && (
                              <span className="rounded-full border border-emerald-700/50 bg-emerald-950/40 px-2 py-1 text-[11px] font-medium text-emerald-300">
                                {charityImpact.publicCharityPercent}% donated
                              </span>
                            )}
                            {charityImpact.totalHours > 0 && (
                              <span className="rounded-full border border-stone-600 bg-stone-900 px-2 py-1 text-[11px] text-stone-300">
                                {charityImpact.totalHours} volunteer hour
                                {charityImpact.totalHours === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          {charityImpact.publicCharityNote && (
                            <p className="mt-2 text-stone-500">{charityImpact.publicCharityNote}</p>
                          )}
                          {charityImpact.organizations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {charityImpact.organizations.slice(0, 2).map((organization) => {
                                const href =
                                  organization.links.websiteUrl ||
                                  organization.links.mapsUrl ||
                                  organization.links.verificationUrl

                                return href ? (
                                  <a
                                    key={`${organization.id ?? organization.organizationName}-inquire`}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-stone-600 bg-stone-900 px-2 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
                                  >
                                    {organization.organizationName}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span
                                    key={`${organization.id ?? organization.organizationName}-inquire`}
                                    className="rounded-full border border-stone-600 bg-stone-900 px-2 py-1 text-[11px] text-stone-300"
                                  >
                                    {organization.organizationName}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {chefCredRow.showResumeAvailableNote && (
                        <p className="text-stone-400">
                          Resume available upon request through ChefFlow.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Direct links */}
                <div className="p-5 flex flex-col gap-2">
                  <Link
                    href={`/chef/${publicSlug}`}
                    className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to profile
                  </Link>

                  {data.chef.google_review_url && (
                    <a
                      href={data.chef.google_review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="#4285F4"
                        />
                      </svg>
                      Google reviews
                    </a>
                  )}

                  {hasWebsiteLink && (
                    <a
                      href={data.chef.website_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Website
                    </a>
                  )}

                  {/* Social links */}
                  {data.chef.social_links &&
                    Object.values(data.chef.social_links).some(Boolean) && (
                      <div className="flex items-center gap-3 pt-1">
                        {data.chef.social_links.instagram && (
                          <a
                            href={data.chef.social_links.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-500 hover:text-stone-300 transition-colors"
                            aria-label="Instagram"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                          </a>
                        )}
                        {data.chef.social_links.tiktok && (
                          <a
                            href={data.chef.social_links.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-500 hover:text-stone-300 transition-colors"
                            aria-label="TikTok"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-3.77-1.82 4.83 4.83 0 003.77-2.77z" />
                            </svg>
                          </a>
                        )}
                        {data.chef.social_links.youtube && (
                          <a
                            href={data.chef.social_links.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-500 hover:text-stone-300 transition-colors"
                            aria-label="YouTube"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-stone-900/90 p-8 text-center">
              <h1 className="text-2xl font-semibold text-stone-100">Inquiries are paused</h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-300">
                {data.chef.display_name} is not currently accepting new public inquiries.
                {data.chef.discovery.next_available_date
                  ? ` Next opening: ${new Date(
                      `${data.chef.discovery.next_available_date}T00:00:00`
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}.`
                  : ' Please check back soon for updated availability.'}
              </p>
              <div className="mt-6">
                <Link
                  href={`/chef/${publicSlug}`}
                  className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Back to profile
                </Link>
              </div>
              <PublicSecondaryEntryCluster
                links={PUBLIC_SECONDARY_ENTRY_CONFIG.single_chef_inquiry}
                heading="Other options"
                theme="dark"
              />
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}
