/**
 * Email Snapshot and Portal Strategy types.
 *
 * Supports the A/B email strategy: snapshot-heavy (full inline details)
 * vs portal-link (teased details with Dinner Circle link).
 */

/** The two A/B variants for outgoing client emails */
export type EmailVariant = 'snapshot-heavy' | 'portal-link'

/** A/B assignment record for a client within a tenant */
export type ABAssignment = {
  id: string
  clientId: string
  tenantId: string
  variant: EmailVariant
  assignedAt: string
  lastEmailAt: string | null
  clickCount: number
}

/** A single dish reference, kept exactly as the client named it */
export type DiscussedDish = {
  name: string
}

/** Rich inline summary appended after the chef sign-off */
export type EmailSnapshot = {
  /** Computed title, e.g. "Gunjan's Anniversary Dinner" */
  eventTitle: string
  /** Host contact name */
  hostName: string | null
  /** Confirmed guest count */
  guestCount: number | null
  /** Occasion label */
  occasion: string | null
  /** Confirmed or tentative date (ISO string or partial month) */
  eventDate: string | null
  /** City-level or full address */
  location: string | null
  /** Joined dietary restriction strings */
  dietaryNotes: string | null
  /** Dishes discussed, listed exactly as client named them */
  discussedDishes: DiscussedDish[]
  /** Course tier under consideration */
  selectedTier: string | null
  /** Whether the menu is confirmed */
  menuConfirmed: boolean
  /** Next action CTA text */
  nextActionCta: string
  /** Formatted plain-text block ready to append */
  formattedText: string
}

/** Portal deep link with UTM tracking for attribution */
export type PortalDeepLink = {
  /** Full URL including UTM params */
  url: string
  /** The base path before UTM params */
  basePath: string
  /** UTM source, e.g. 'chef_email' */
  utmSource: string
  /** UTM medium, e.g. 'email' */
  utmMedium: string
  /** UTM campaign, e.g. 'first_response' */
  utmCampaign: string
  /** UTM content for variant identification */
  utmContent: string
}

/** Aggregated A/B stats for a single variant */
export type ABVariantStats = {
  variant: EmailVariant
  assignmentCount: number
  totalEmails: number
  totalClicks: number
  clickThroughRate: number
}
