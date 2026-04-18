/**
 * Shared component for token-gated public pages when the link
 * is expired, revoked, or not found. Replaces generic Next.js 404
 * with a clear, branded message that tells the visitor what happened.
 *
 * Usage:
 *   <TokenExpiredPage reason="expired" noun="worksheet" />
 *   <TokenExpiredPage reason="not_found" noun="availability link" />
 */

type TokenPageReason = 'expired' | 'not_found'

interface TokenExpiredPageProps {
  /** Why the page can't be shown */
  reason: TokenPageReason
  /** What the link was for, e.g. "feedback form", "worksheet", "event" */
  noun?: string
}

const CLOCK_ICON = (
  <svg
    className="h-7 w-7 text-stone-300"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
)

const LINK_ICON = (
  <svg
    className="h-7 w-7 text-stone-300"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.314a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757"
    />
  </svg>
)

const copy: Record<
  TokenPageReason,
  { icon: React.ReactNode; title: string; body: (noun: string) => string }
> = {
  expired: {
    icon: CLOCK_ICON,
    title: 'Link Expired',
    body: (noun) => `This ${noun} link has expired. Please contact your chef for a new one.`,
  },
  not_found: {
    icon: LINK_ICON,
    title: 'Link Not Found',
    body: (noun) =>
      `This ${noun} link is invalid or has been revoked. Please contact your chef for an updated link.`,
  },
}

export function TokenExpiredPage({ reason, noun = 'page' }: TokenExpiredPageProps) {
  const c = copy[reason]
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800">
          {c.icon}
        </div>
        <h1 className="text-xl font-bold text-stone-100">{c.title}</h1>
        <p className="text-sm text-stone-400 mt-2">{c.body(noun)}</p>
      </div>
    </div>
  )
}
