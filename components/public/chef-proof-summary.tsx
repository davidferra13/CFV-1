// Chef Proof Summary - reusable proof block for public chef profile and inquiry page.
// Shows aggregated rating, source chips, and direct-action CTAs.
// Only renders when there is real proof data. Never shows fake or placeholder stats.

import Link from 'next/link'

export type ChefProofSummaryProps = {
  slug: string
  stats: {
    totalReviews: number
    averageRating: number
    platformBreakdown: { platform: string; count: number; avgRating: number }[]
  }
  googleReviewUrl: string | null
  websiteUrl: string | null
  showWebsite: boolean
  acceptingInquiries: boolean
  preferWebsite: boolean
  preferChefFlow: boolean
}

export function ChefProofSummary({
  slug,
  stats,
  googleReviewUrl,
  websiteUrl,
  showWebsite,
  acceptingInquiries,
  preferWebsite,
}: ChefProofSummaryProps) {
  const hasReviews = stats.totalReviews > 0
  const hasWebsiteLink = Boolean(websiteUrl && showWebsite)
  // Mirror the CTA logic from the public profile page: show inquiry CTA unless chef
  // exclusively prefers their website and it is actually visible.
  const showInquiryCta = acceptingInquiries && (!preferWebsite || !hasWebsiteLink)

  if (!hasReviews && !googleReviewUrl && !hasWebsiteLink) return null

  return (
    <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-6 mb-8">
      {hasReviews && (
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-5 w-5 text-amber-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-2xl font-bold text-stone-100">
              {stats.averageRating.toFixed(1)}
            </span>
            <span className="text-stone-400 text-sm">
              ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {stats.platformBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {stats.platformBreakdown.map((p) => (
                <span
                  key={p.platform}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-800 text-stone-300 border border-stone-700"
                >
                  {p.platform}
                  <span className="text-stone-500">{p.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasReviews && (
          <Link
            href={`/chef/${slug}#reviews`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Read all reviews
          </Link>
        )}

        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-700 transition-colors"
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
            href={websiteUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-700 transition-colors"
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

        {showInquiryCta && (
          <Link
            href={`/chef/${slug}/inquire`}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white gradient-accent transition-opacity hover:opacity-90"
          >
            Start inquiry
          </Link>
        )}
      </div>
    </div>
  )
}
