import type { UniversalRailRole } from '../universal-rail-types'

/**
 * Metadata map returned by a resolver.
 * Keys are item definition IDs (e.g., 'chef.inquiry_new').
 * Values are template variable maps (e.g., { clientName: 'Alice', inquiryId: '123' }).
 *
 * Items present in the map are considered ACTIVE and will have templates hydrated.
 * Items absent from the map keep their static labels.
 */
export type RailResolverResult = Record<string, Record<string, unknown>>

/**
 * A resolver function fetches live data for a role and returns
 * metadata keyed by definition ID for template hydration.
 */
export type RailResolver = (
  userId: string,
  tenantId: string | undefined
) => Promise<RailResolverResult>

/**
 * Registry of resolvers per role.
 */
export type RailResolverRegistry = Partial<Record<UniversalRailRole, RailResolver>>
