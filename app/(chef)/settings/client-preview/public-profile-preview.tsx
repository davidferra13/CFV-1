// Public Profile Preview — inline render of the /chef/[slug] page content.
// We render inline (not via iframe) because next.config.js sets X-Frame-Options: DENY
// globally, which would cause any same-origin iframe to be blocked by the browser.
// This component mirrors the exact markup of app/(public)/chef/[slug]/page.tsx.

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { PartnerShowcase } from '@/components/public/partner-showcase'

type PublicProfileData = {
  chef: {
    display_name: string
    profile_image_url: string | null
    logo_url: string | null
    tagline: string | null
    bio: string | null
    website_url: string | null
    show_website_on_public_profile: boolean
    preferred_inquiry_destination: string | null
    portal_primary_color: string | null
    portal_background_color: string | null
    portal_background_image_url: string | null
  }
  partners: any[]
} | null

type Props = {
  slug: string | null
  publicProfileData: PublicProfileData
  deviceFrame: 'desktop' | 'mobile'
}

export function PublicProfilePreview({ slug, publicProfileData, deviceFrame }: Props) {
  if (!slug) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-16 text-center">
        <div className="text-stone-300 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="font-medium text-stone-700">No public profile URL set</p>
        <p className="text-sm text-stone-500 mt-2">
          Set up your profile URL to preview your public page.
        </p>
        <Link
          href="/settings/my-profile"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Go to My Profile →
        </Link>
      </div>
    )
  }

  if (!publicProfileData) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-16 text-center">
        <p className="text-stone-500 text-sm">Could not load public profile preview.</p>
      </div>
    )
  }

  const { chef, partners } = publicProfileData
  const primaryColor = chef.portal_primary_color || '#1c1917'
  const backgroundColor = chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = chef.portal_background_image_url
  const hasWebsiteLink = Boolean(chef.website_url && chef.show_website_on_public_profile)
  const preferWebsite = chef.preferred_inquiry_destination === 'website_only'

  const pageBackgroundStyle: CSSProperties = backgroundImageUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.92)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor }

  const isMobile = deviceFrame === 'mobile'

  return (
    <div className={isMobile ? 'flex justify-center' : undefined}>
      <div
        className={[
          'rounded-xl border-2 border-stone-200 overflow-y-auto',
          isMobile ? 'w-[390px]' : 'w-full',
        ].join(' ')}
        style={{ maxHeight: '680px' }}
      >
        {/* Mirrors app/(public)/chef/[slug]/page.tsx exactly */}
        <div className="min-h-screen" style={pageBackgroundStyle}>
          {/* Hero Section */}
          <section className="py-16 md:py-24 bg-white/70 backdrop-blur-[1px]">
            <div className="max-w-4xl mx-auto px-6 text-center">
              {chef.logo_url && (
                <div className="flex justify-center mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chef.logo_url}
                    alt={`${chef.display_name} logo`}
                    className="max-h-16 max-w-[220px] object-contain"
                  />
                </div>
              )}

              {chef.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={chef.profile_image_url}
                  alt={chef.display_name}
                  className="w-28 h-28 rounded-full object-cover mx-auto mb-6 ring-4 ring-white shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-6 ring-4 ring-white shadow-lg">
                  <span className="text-3xl font-bold text-stone-500">
                    {chef.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-bold text-stone-900">
                {chef.display_name}
              </h1>

              {chef.tagline && (
                <p className="text-lg md:text-xl text-stone-600 mt-3 max-w-2xl mx-auto">
                  {chef.tagline}
                </p>
              )}

              {chef.bio && (
                <p className="text-stone-500 mt-6 max-w-xl mx-auto leading-relaxed">
                  {chef.bio}
                </p>
              )}
            </div>
          </section>

          {/* Partner Showcase */}
          {partners.length > 0 && (
            <section className="py-16 px-6 bg-white/70">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-stone-900">Where I Cook</h2>
                  <p className="text-stone-600 mt-3 max-w-xl mx-auto">
                    Book one of these amazing venues and enjoy a private dining experience with a personal chef
                  </p>
                </div>
                <PartnerShowcase partners={partners as any} chefName={chef.display_name} />
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="py-16 px-6 bg-white/75">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-stone-900">Ready to Book?</h2>
              <p className="text-stone-600 mt-3">
                Choose a venue above and hire {chef.display_name} for an unforgettable dining experience.
                Or tell us about your event and we&apos;ll be in touch.
              </p>
              {(!preferWebsite || !hasWebsiteLink) && slug && (
                <a
                  href={`/chef/${slug}/inquire`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-6 px-8 py-3 text-white rounded-lg font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Inquire About an Event
                </a>
              )}
              {hasWebsiteLink && (
                <a
                  href={chef.website_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block px-8 py-3 rounded-lg font-medium border transition-colors ${preferWebsite ? 'mt-6' : 'mt-3'}`}
                  style={{
                    borderColor: primaryColor,
                    color: primaryColor,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  Visit Official Website
                </a>
              )}
              <div className="mt-4">
                <a
                  href="/auth/client-signup"
                  className="text-sm font-medium hover:opacity-80"
                  style={{ color: primaryColor }}
                >
                  Create client account
                </a>
              </div>
              {slug && (
                <div className="mt-2">
                  <a
                    href={`/chef/${slug}/partner-signup`}
                    className="text-sm font-medium hover:opacity-80"
                    style={{ color: primaryColor }}
                  >
                    Create partner profile
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
