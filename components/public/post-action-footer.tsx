// Post-Action Footer for public token-based pages
// Eliminates dead ends by providing forward paths after form submission.
// Pattern from /share/[token] (gold standard): chef profile, account CTA, branding link.

import Link from 'next/link'

interface PostActionFooterProps {
  /** Chef's public profile slug (e.g., "chef-david") */
  chefSlug?: string | null
  /** Chef's display name */
  chefName?: string | null
  /** Optional cross-link (e.g., "Leave a review" from tip page) */
  crossLink?: { href: string; label: string } | null
}

export function PostActionFooter({ chefSlug, chefName, crossLink }: PostActionFooterProps) {
  const hasChefLink = chefSlug && chefSlug.length > 0

  return (
    <div className="mt-8 space-y-4">
      {/* Forward paths */}
      {(hasChefLink || crossLink) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasChefLink && (
            <Link
              href={`/chef/${chefSlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
            >
              {chefName ? `View ${chefName}'s Profile` : 'View Chef Profile'}
            </Link>
          )}
          {crossLink && (
            <Link
              href={crossLink.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
            >
              {crossLink.label}
            </Link>
          )}
        </div>
      )}

      {/* Powered by ChefFlow */}
      <div className="text-center pt-2">
        <a
          href="https://cheflowhq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
        >
          Powered by <span className="font-semibold">ChefFlow</span>
        </a>
      </div>
    </div>
  )
}
