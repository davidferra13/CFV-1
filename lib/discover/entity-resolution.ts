import { normalizeUsStateCode } from './constants'

export type DirectoryListingMatch = {
  id: string
  name: string
  slug: string
  state: string | null
  status: string
  lead_score: number | null
}

export type DirectoryListingAccountLinkConfidence = 'high' | 'medium'

export type DirectoryListingAccountLinkReason =
  | 'claimed_email_exact'
  | 'listing_email_exact'
  | 'website_location_exact'
  | 'name_location_exact'

type DirectoryListingAccountLinkCandidate = {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  status: string
  claimed_by_email: string | null
  email: string | null
  website_url: string | null
  linked_chef_id: string | null
}

type ChefDirectoryLinkInput = {
  chefId: string
  email?: string | null
  businessName?: string | null
  displayName?: string | null
  websiteUrl?: string | null
  city?: string | null
  state?: string | null
}

type DirectoryListingAccountLinkDecision = {
  listingId: string
  slug: string
  confidence: DirectoryListingAccountLinkConfidence
  reason: DirectoryListingAccountLinkReason
  score: number
}

const DIRECTORY_MATCH_SELECT = 'id, name, slug, state, status, lead_score'
const DIRECTORY_MATCH_STATUS_PRIORITY: Record<string, number> = {
  verified: 4,
  claimed: 3,
  discovered: 2,
  pending_submission: 1,
}

function normalizeComparableText(value: string | null | undefined) {
  return value?.trim().toLowerCase() || ''
}

function normalizeMatchName(value: string) {
  return value.replace(/['’]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function normalizeComparableWebsiteHost(value: string | null | undefined) {
  if (!value) return ''

  try {
    const withProtocol = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function cityMatches(
  candidateCity: string | null | undefined,
  expectedCity: string | null | undefined
) {
  if (!expectedCity) return true
  return normalizeComparableText(candidateCity) === normalizeComparableText(expectedCity)
}

function stateMatches(
  candidateState: string | null | undefined,
  expectedState: string | null | undefined
) {
  if (!expectedState) return true
  return normalizeUsStateCode(candidateState) === normalizeUsStateCode(expectedState)
}

function isLocationCompatible(
  candidate: Pick<DirectoryListingAccountLinkCandidate, 'city' | 'state'>,
  input: ChefDirectoryLinkInput
) {
  return cityMatches(candidate.city, input.city) && stateMatches(candidate.state, input.state)
}

export function filterMatchesByState(matches: DirectoryListingMatch[], state?: string | null) {
  const normalizedState = normalizeUsStateCode(state)
  if (!normalizedState) return matches

  return matches.filter((match) => normalizeUsStateCode(match.state) === normalizedState)
}

export function sortDirectoryMatches(a: DirectoryListingMatch, b: DirectoryListingMatch) {
  const statusDelta =
    (DIRECTORY_MATCH_STATUS_PRIORITY[b.status] ?? 0) -
    (DIRECTORY_MATCH_STATUS_PRIORITY[a.status] ?? 0)
  if (statusDelta !== 0) return statusDelta

  const leadScoreDelta = (b.lead_score ?? 0) - (a.lead_score ?? 0)
  if (leadScoreDelta !== 0) return leadScoreDelta

  return a.name.localeCompare(b.name)
}

export async function findDirectoryListingMatch(
  db: any,
  input: {
    businessName: string
    city: string
    state?: string | null
  }
): Promise<DirectoryListingMatch | null> {
  const name = input.businessName.trim()
  const city = input.city.trim()
  const normalizedName = normalizeMatchName(name)

  const { data: exactMatches } = await db
    .from('directory_listings')
    .select(DIRECTORY_MATCH_SELECT)
    .neq('status', 'removed')
    .ilike('name', name)
    .ilike('city', city)
    .limit(10)

  const exactFiltered = filterMatchesByState(
    (exactMatches || []) as DirectoryListingMatch[],
    input.state
  )
  if (exactFiltered.length > 0) {
    exactFiltered.sort(sortDirectoryMatches)
    return exactFiltered[0]
  }

  const { data: looseMatches } = await db
    .from('directory_listings')
    .select(DIRECTORY_MATCH_SELECT)
    .neq('status', 'removed')
    .ilike('city', city)
    .limit(50)

  const looseFiltered = filterMatchesByState(
    (looseMatches || []) as DirectoryListingMatch[],
    input.state
  ).filter((match) => normalizeMatchName(match.name) === normalizedName)

  if (looseFiltered.length === 0) {
    return null
  }

  looseFiltered.sort(sortDirectoryMatches)
  return looseFiltered[0]
}

function scoreDirectoryListingAccountLink(
  candidate: DirectoryListingAccountLinkCandidate,
  input: ChefDirectoryLinkInput
): DirectoryListingAccountLinkDecision | null {
  if (candidate.linked_chef_id && candidate.linked_chef_id !== input.chefId) {
    return null
  }

  const normalizedEmail = normalizeComparableText(input.email)
  if (normalizedEmail && normalizeComparableText(candidate.claimed_by_email) === normalizedEmail) {
    return {
      listingId: candidate.id,
      slug: candidate.slug,
      confidence: 'high',
      reason: 'claimed_email_exact',
      score: 400,
    }
  }

  if (normalizedEmail && normalizeComparableText(candidate.email) === normalizedEmail) {
    return {
      listingId: candidate.id,
      slug: candidate.slug,
      confidence: 'high',
      reason: 'listing_email_exact',
      score: 350,
    }
  }

  const sameLocation = isLocationCompatible(candidate, input)
  const expectedHost = normalizeComparableWebsiteHost(input.websiteUrl)
  if (
    expectedHost &&
    sameLocation &&
    normalizeComparableWebsiteHost(candidate.website_url) === expectedHost
  ) {
    return {
      listingId: candidate.id,
      slug: candidate.slug,
      confidence: 'high',
      reason: 'website_location_exact',
      score: 300 + (DIRECTORY_MATCH_STATUS_PRIORITY[candidate.status] ?? 0),
    }
  }

  const expectedName = normalizeMatchName(input.businessName || input.displayName || '')
  if (!expectedName || !sameLocation || normalizeMatchName(candidate.name) !== expectedName) {
    return null
  }

  // Name/location-only matches should never auto-link a listing that already carries owner contact.
  if (
    (candidate.status === 'claimed' || candidate.status === 'verified') &&
    (normalizeComparableText(candidate.claimed_by_email) ||
      normalizeComparableText(candidate.email))
  ) {
    return null
  }

  return {
    listingId: candidate.id,
    slug: candidate.slug,
    confidence: 'medium',
    reason: 'name_location_exact',
    score: 200 + (DIRECTORY_MATCH_STATUS_PRIORITY[candidate.status] ?? 0),
  }
}

export function chooseDirectoryListingAccountLinkCandidate(
  candidates: DirectoryListingAccountLinkCandidate[],
  input: ChefDirectoryLinkInput
): Omit<DirectoryListingAccountLinkDecision, 'score'> | null {
  let best: DirectoryListingAccountLinkDecision | null = null

  for (const candidate of candidates) {
    const scored = scoreDirectoryListingAccountLink(candidate, input)
    if (!scored) continue

    if (!best || scored.score > best.score) {
      best = scored
      continue
    }

    if (best && scored.score === best.score && scored.slug.localeCompare(best.slug) < 0) {
      best = scored
    }
  }

  if (!best) return null

  return {
    listingId: best.listingId,
    slug: best.slug,
    confidence: best.confidence,
    reason: best.reason,
  }
}

function dedupeCandidates(candidates: DirectoryListingAccountLinkCandidate[]) {
  const seen = new Set<string>()
  const unique: DirectoryListingAccountLinkCandidate[] = []

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue
    seen.add(candidate.id)
    unique.push(candidate)
  }

  return unique
}

export async function findChefAccountIdByEmail(db: any, email: string) {
  const normalizedEmail = email.trim()
  if (!normalizedEmail) return null

  const { data } = await db.from('chefs').select('id').eq('email', normalizedEmail).maybeSingle()

  return (data as { id: string } | null)?.id ?? null
}

export async function resolveChefDirectoryListingLink(
  db: any,
  input: ChefDirectoryLinkInput
): Promise<Omit<DirectoryListingAccountLinkDecision, 'score'> | null> {
  const candidateSets: DirectoryListingAccountLinkCandidate[][] = []

  const email = input.email?.trim()
  if (email) {
    const [claimedByEmail, listingEmail] = await Promise.all([
      db
        .from('directory_listings')
        .select(
          'id, name, slug, city, state, status, claimed_by_email, email, website_url, linked_chef_id'
        )
        .neq('status', 'removed')
        .eq('claimed_by_email', email)
        .limit(20),
      db
        .from('directory_listings')
        .select(
          'id, name, slug, city, state, status, claimed_by_email, email, website_url, linked_chef_id'
        )
        .neq('status', 'removed')
        .eq('email', email)
        .limit(20),
    ])

    candidateSets.push(
      ((claimedByEmail.data as DirectoryListingAccountLinkCandidate[] | null) ?? []).slice(),
      ((listingEmail.data as DirectoryListingAccountLinkCandidate[] | null) ?? []).slice()
    )
  }

  const city = input.city?.trim()
  if (city) {
    const { data } = await db
      .from('directory_listings')
      .select(
        'id, name, slug, city, state, status, claimed_by_email, email, website_url, linked_chef_id'
      )
      .neq('status', 'removed')
      .ilike('city', city)
      .limit(50)

    candidateSets.push(((data as DirectoryListingAccountLinkCandidate[] | null) ?? []).slice())
  } else if (input.websiteUrl?.trim()) {
    const { data } = await db
      .from('directory_listings')
      .select(
        'id, name, slug, city, state, status, claimed_by_email, email, website_url, linked_chef_id'
      )
      .neq('status', 'removed')
      .eq('website_url', input.websiteUrl.trim())
      .limit(20)

    candidateSets.push(((data as DirectoryListingAccountLinkCandidate[] | null) ?? []).slice())
  }

  const candidates = dedupeCandidates(candidateSets.flat())
  if (candidates.length === 0) return null

  return chooseDirectoryListingAccountLinkCandidate(candidates, input)
}

export async function linkDirectoryListingToChefAccount(
  db: any,
  input: {
    listingId: string
    chefId: string
    confidence: DirectoryListingAccountLinkConfidence
    reason: DirectoryListingAccountLinkReason
  }
): Promise<
  | { status: 'linked'; listingId: string }
  | { status: 'already_linked'; listingId: string }
  | { status: 'listing_conflict' }
  | { status: 'chef_conflict' }
> {
  const { data: listing } = await db
    .from('directory_listings')
    .select('id, linked_chef_id')
    .eq('id', input.listingId)
    .maybeSingle()

  const linkedChefId =
    (listing as { linked_chef_id?: string | null } | null)?.linked_chef_id ?? null
  if (!listing) return { status: 'listing_conflict' }
  if (linkedChefId === input.chefId) {
    return { status: 'already_linked', listingId: input.listingId }
  }
  if (linkedChefId && linkedChefId !== input.chefId) {
    return { status: 'listing_conflict' }
  }

  const { data: existingChefLink } = await db
    .from('directory_listings')
    .select('id')
    .eq('linked_chef_id', input.chefId)
    .neq('id', input.listingId)
    .limit(1)

  if (((existingChefLink as Array<{ id: string }> | null) ?? []).length > 0) {
    return { status: 'chef_conflict' }
  }

  const linkedAt = new Date().toISOString()
  const { error: updateError } = await db
    .from('directory_listings')
    .update({
      linked_chef_id: input.chefId,
      linked_chef_confidence: input.confidence,
      linked_chef_reason: input.reason,
      linked_chef_at: linkedAt,
    })
    .eq('id', input.listingId)

  if (updateError) {
    throw updateError
  }

  const { error: eventError } = await db.from('directory_listing_account_link_events').insert({
    listing_id: input.listingId,
    chef_id: input.chefId,
    confidence: input.confidence,
    reason: input.reason,
    linked_at: linkedAt,
  })

  if (eventError) {
    throw eventError
  }

  return { status: 'linked', listingId: input.listingId }
}
