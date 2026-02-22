// Branded SVG Illustrations — warm, culinary-themed empty state visuals
// Uses only brand palette colors: #eda86b, #e88f47, #d47530, #fef9f3, #f5f3ef, #f8ddc0
// No external dependencies — pure inline SVG React components.

interface IllustrationProps {
  className?: string
}

/** Checkmark in a warm circle — for "all caught up" / inbox zero states */
export function AllCaughtUpIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#fef9f3" />
      <circle cx="60" cy="60" r="44" fill="#f8ddc0" opacity="0.5" />
      <circle cx="60" cy="60" r="32" fill="#eda86b" opacity="0.2" />
      <path
        d="M42 62l12 12 24-28"
        stroke="#d47530"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** Calendar with a warm accent — for empty events lists */
export function NoEventsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect
        x="20"
        y="30"
        width="80"
        height="70"
        rx="10"
        fill="#fef9f3"
        stroke="#eda86b"
        strokeWidth="2"
      />
      <rect x="20" y="30" width="80" height="20" rx="10" fill="#eda86b" opacity="0.2" />
      <rect x="20" y="40" width="80" height="10" fill="#eda86b" opacity="0.2" />
      {/* Calendar pins */}
      <rect x="38" y="24" width="4" height="14" rx="2" fill="#d47530" />
      <rect x="78" y="24" width="4" height="14" rx="2" fill="#d47530" />
      {/* Grid dots */}
      <circle cx="42" cy="66" r="3" fill="#eda86b" opacity="0.4" />
      <circle cx="60" cy="66" r="3" fill="#eda86b" opacity="0.4" />
      <circle cx="78" cy="66" r="3" fill="#eda86b" opacity="0.4" />
      <circle cx="42" cy="82" r="3" fill="#eda86b" opacity="0.4" />
      <circle cx="60" cy="82" r="3" fill="#e88f47" />
      <circle cx="78" cy="82" r="3" fill="#eda86b" opacity="0.4" />
    </svg>
  )
}

/** Person silhouette with a warm glow — for empty clients lists */
export function NoClientsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Person silhouette */}
      <circle cx="60" cy="44" r="14" fill="#eda86b" opacity="0.3" />
      <path d="M36 88c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#eda86b" opacity="0.2" />
      {/* Plus accent */}
      <circle cx="88" cy="36" r="12" fill="#d47530" opacity="0.15" />
      <path d="M88 30v12M82 36h12" stroke="#d47530" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** Open recipe book — for empty recipe lists */
export function NoRecipesIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      {/* Book pages */}
      <path d="M60 30 L26 38 L26 92 L60 84 Z" fill="#fef9f3" stroke="#eda86b" strokeWidth="1.5" />
      <path d="M60 30 L94 38 L94 92 L60 84 Z" fill="#fef9f3" stroke="#eda86b" strokeWidth="1.5" />
      {/* Spine */}
      <line x1="60" y1="30" x2="60" y2="84" stroke="#d47530" strokeWidth="2" />
      {/* Text lines on left page */}
      <line
        x1="34"
        y1="50"
        x2="52"
        y2="47"
        stroke="#eda86b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="34"
        y1="58"
        x2="50"
        y2="55"
        stroke="#eda86b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="34"
        y1="66"
        x2="48"
        y2="63"
        stroke="#eda86b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.2"
      />
      {/* Fork/spoon on right page */}
      <path d="M72 48 L72 70" stroke="#e88f47" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M72 48 C72 42, 80 42, 80 48 L80 54 L72 54"
        stroke="#e88f47"
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="84"
        y1="44"
        x2="84"
        y2="70"
        stroke="#e88f47"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Inbox tray with warm glow — for empty inquiry pipeline */
export function NoInquiriesIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Inbox tray */}
      <path
        d="M30 56 L42 56 L48 68 L72 68 L78 56 L90 56 L90 86 L30 86 Z"
        fill="#eda86b"
        opacity="0.15"
        stroke="#eda86b"
        strokeWidth="1.5"
      />
      {/* Envelope dropping in */}
      <rect
        x="46"
        y="34"
        width="28"
        height="20"
        rx="3"
        fill="white"
        stroke="#d47530"
        strokeWidth="1.5"
      />
      <path
        d="M46 37 L60 48 L74 37"
        stroke="#d47530"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sparkle */}
      <circle cx="84" cy="40" r="2" fill="#e88f47" />
      <circle cx="36" cy="44" r="1.5" fill="#eda86b" opacity="0.6" />
    </svg>
  )
}

/** Bullseye target with warm accent — for empty goals state */
export function NoGoalsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      <circle cx="60" cy="60" r="36" fill="none" stroke="#eda86b" strokeWidth="2" opacity="0.3" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="#eda86b" strokeWidth="2" opacity="0.5" />
      <circle cx="60" cy="60" r="12" fill="#eda86b" opacity="0.2" />
      <circle cx="60" cy="60" r="5" fill="#d47530" />
      {/* Arrow */}
      <line
        x1="82"
        y1="38"
        x2="64"
        y2="56"
        stroke="#e88f47"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M82 38 L76 40 L80 44 Z" fill="#e88f47" />
    </svg>
  )
}

/** Menu/document with warm lines — for empty menus list */
export function NoMenusIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Document */}
      <rect
        x="36"
        y="24"
        width="48"
        height="72"
        rx="6"
        fill="white"
        stroke="#eda86b"
        strokeWidth="1.5"
      />
      {/* Header line */}
      <rect x="44" y="34" width="32" height="4" rx="2" fill="#d47530" opacity="0.4" />
      {/* Divider */}
      <line x1="44" y1="46" x2="76" y2="46" stroke="#eda86b" strokeWidth="1" opacity="0.3" />
      {/* Menu items */}
      <circle cx="48" cy="56" r="2" fill="#e88f47" opacity="0.5" />
      <rect x="54" y="54" width="20" height="3" rx="1.5" fill="#eda86b" opacity="0.3" />
      <circle cx="48" cy="66" r="2" fill="#e88f47" opacity="0.5" />
      <rect x="54" y="64" width="16" height="3" rx="1.5" fill="#eda86b" opacity="0.3" />
      <circle cx="48" cy="76" r="2" fill="#e88f47" opacity="0.5" />
      <rect x="54" y="74" width="22" height="3" rx="1.5" fill="#eda86b" opacity="0.3" />
    </svg>
  )
}

/** Star/sparkles — for empty search results or generic "no data" */
export function SearchEmptyIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Magnifying glass */}
      <circle cx="52" cy="52" r="20" fill="none" stroke="#eda86b" strokeWidth="2.5" />
      <line
        x1="66"
        y1="66"
        x2="84"
        y2="84"
        stroke="#d47530"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Question sparkles inside lens */}
      <circle cx="46" cy="48" r="2" fill="#e88f47" opacity="0.4" />
      <circle cx="56" cy="44" r="1.5" fill="#e88f47" opacity="0.3" />
      <circle cx="50" cy="58" r="1.5" fill="#e88f47" opacity="0.3" />
    </svg>
  )
}

/** Stars and sparkle — for getting started / onboarding states */
export function GettingStartedIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Central star */}
      <path
        d="M60 30 L66 50 L86 50 L70 62 L76 82 L60 70 L44 82 L50 62 L34 50 L54 50 Z"
        fill="#eda86b"
        opacity="0.2"
        stroke="#d47530"
        strokeWidth="1.5"
      />
      {/* Smaller sparkles */}
      <circle cx="88" cy="36" r="3" fill="#e88f47" opacity="0.4" />
      <circle cx="32" cy="38" r="2" fill="#eda86b" opacity="0.3" />
      <circle cx="86" cy="76" r="2.5" fill="#eda86b" opacity="0.3" />
      <circle cx="34" cy="80" r="2" fill="#e88f47" opacity="0.2" />
    </svg>
  )
}

/** Quote document with price tag — for empty quotes list */
export function NoQuotesIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Document */}
      <rect
        x="34"
        y="26"
        width="44"
        height="60"
        rx="5"
        fill="white"
        stroke="#eda86b"
        strokeWidth="1.5"
      />
      {/* Dollar sign */}
      <text
        x="56"
        y="58"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fill="#d47530"
        opacity="0.3"
      >
        $
      </text>
      {/* Lines */}
      <rect x="42" y="66" width="28" height="3" rx="1.5" fill="#eda86b" opacity="0.25" />
      <rect x="42" y="74" width="20" height="3" rx="1.5" fill="#eda86b" opacity="0.2" />
      {/* Price tag */}
      <circle cx="82" cy="36" r="14" fill="#d47530" opacity="0.12" />
      <path d="M76 36h12M82 30v12" stroke="#d47530" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Clipboard with checkmarks — for empty reviews / AAR */
export function NoReviewsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#fef9f3" />
      {/* Clipboard */}
      <rect
        x="36"
        y="30"
        width="48"
        height="64"
        rx="6"
        fill="white"
        stroke="#eda86b"
        strokeWidth="1.5"
      />
      {/* Clip */}
      <rect x="50" y="24" width="20" height="12" rx="4" fill="#d47530" opacity="0.3" />
      {/* Check rows */}
      <path
        d="M44 52l4 4 8-8"
        stroke="#e88f47"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.4"
      />
      <rect x="62" y="50" width="16" height="3" rx="1.5" fill="#eda86b" opacity="0.3" />
      <path
        d="M44 66l4 4 8-8"
        stroke="#e88f47"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      <rect x="62" y="64" width="12" height="3" rx="1.5" fill="#eda86b" opacity="0.25" />
      <path
        d="M44 80l4 4 8-8"
        stroke="#eda86b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.2"
      />
      <rect x="62" y="78" width="14" height="3" rx="1.5" fill="#eda86b" opacity="0.2" />
    </svg>
  )
}
