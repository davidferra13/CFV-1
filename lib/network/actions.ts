// Chef Network Server Actions
// Cross-tenant chef-to-chef connections (friends).
// Uses admin client for cross-tenant queries since this feature
// intentionally spans across tenant boundaries.
// Note: chef_connections table added in Layer 7 migration.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import {
  NETWORK_FEATURE_DEFINITIONS,
  NETWORK_FEATURE_KEYS,
  type NetworkFeatureKey,
} from '@/lib/network/features'
import { optimizeProfilePhoto } from '@/lib/images/optimize'

const CHEF_PROFILE_IMAGES_BUCKET = 'chef-profile-images'
const MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]
const PROFILE_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

// ============================================
// TYPES
// ============================================

export type SearchableChef = {
  id: string
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
  city: string | null
  state: string | null
  connection_status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined'
  connection_id: string | null
}

export type ChefFriend = {
  id: string
  chef_id: string
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
  city: string | null
  state: string | null
  connected_since: string
}

export type PendingRequest = {
  id: string
  direction: 'sent' | 'received'
  chef_id: string
  display_name: string | null
  business_name: string
  city: string | null
  state: string | null
  request_message: string | null
  created_at: string
}

export type NetworkFeedPost = {
  id: string
  content: string
  feature_key: NetworkFeatureKey
  created_at: string
  is_mine: boolean
  author: {
    id: string
    display_name: string | null
    business_name: string
    profile_image_url: string | null
    city: string | null
    state: string | null
  }
}

export type NetworkFeaturePreference = {
  feature_key: NetworkFeatureKey
  label: string
  description: string
  enabled: boolean
}

export type NetworkContactShare = {
  id: string
  status: 'open' | 'accepted' | 'passed'
  direction: 'sent' | 'received'
  contact_name: string
  contact_phone: string | null
  contact_email: string | null
  event_date: string | null
  location: string | null
  details: string
  response_note: string | null
  created_at: string
  responded_at: string | null
  participant: {
    chef_id: string
    display_name: string | null
    business_name: string
    profile_image_url: string | null
  }
}

export type NetworkInsights = {
  inquiries_total: number
  inquiries_converted: number
  inquiries_with_client: number
  inquiries_shared: number
  inquiries_unshared: number
  dinners_total: number
  dinners_upcoming: number
  dinners_completed: number
  dinner_dates_shared: number
  dinner_dates_unshared: number
  clients_total: number
  clients_shared: number
  clients_unshared: number
  shares_sent_total: number
  shares_received_total: number
  shares_open: number
  shares_accepted: number
  shares_passed: number
  unshared_inquiry_ids: string[]
  unshared_client_names: string[]
}

// ============================================
// VALIDATION
// ============================================

const SearchChefsSchema = z.object({
  query: z.string().trim().max(100).default(''),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(2).optional(),
})

const SendRequestSchema = z.object({
  addressee_id: z.string().uuid(),
  message: z.string().max(500).optional(),
})

const RespondSchema = z.object({
  connection_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
})

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  profile_image_url: z.string().url().optional().nullable(),
})

const GetFeedSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
})

const NetworkFeatureKeySchema = z.enum(NETWORK_FEATURE_KEYS)

const CreatePostSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  feature_key: NetworkFeatureKeySchema,
})

const UpdateFeaturePreferenceSchema = z.object({
  feature_key: NetworkFeatureKeySchema,
  enabled: z.boolean(),
})

const GetContactSharesSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
})

const CreateContactShareSchema = z.object({
  recipient_chef_id: z.string().uuid(),
  contact_name: z.string().trim().min(1).max(150),
  contact_phone: z.string().trim().max(50).optional().nullable(),
  contact_email: z.string().trim().email().max(200).optional().nullable(),
  event_date: z.string().date().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  details: z.string().trim().min(1).max(2000),
})

const RespondContactShareSchema = z.object({
  share_id: z.string().uuid(),
  action: z.enum(['accepted', 'passed']),
  response_note: z.string().trim().max(1000).optional().nullable(),
})

const HelpRequestTypeSchema = z.enum(['date_help', 'inquiry_help', 'full_handover'])

const RequestNetworkHelpSchema = z
  .object({
    recipient_chef_id: z.string().uuid(),
    help_type: HelpRequestTypeSchema,
    calendar_date: z.string().date().optional().nullable(),
    inquiry_id: z.string().uuid().optional().nullable(),
    inquiry_summary: z.string().trim().max(200).optional().nullable(),
    contact_name: z.string().trim().min(1).max(150),
    contact_phone: z.string().trim().max(50).optional().nullable(),
    contact_email: z.string().trim().email().max(200).optional().nullable(),
    location: z.string().trim().max(200).optional().nullable(),
    details: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((input, ctx) => {
    if (input.help_type === 'date_help' && !input.calendar_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['calendar_date'],
        message: 'calendar_date is required for date_help',
      })
    }

    if (input.help_type === 'inquiry_help' && !input.inquiry_id && !input.inquiry_summary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inquiry_summary'],
        message: 'Provide inquiry_id or inquiry_summary for inquiry_help',
      })
    }

    if (input.help_type === 'full_handover' && !input.details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['details'],
        message: 'Provide handover details for full_handover',
      })
    }
  })

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ============================================
// TYPE ASSERTION HELPERS
// ============================================

// chef_connections not in generated types until migration applied and types regenerated
function fromChefConnections(db: any): any {
  return db.from('chef_connections')
}

function fromChefPreferences(db: any): any {
  return db.from('chef_preferences')
}

function fromChefNetworkPosts(db: any): any {
  return db.from('chef_network_posts')
}

function fromChefNetworkFeaturePreferences(db: any): any {
  return db.from('chef_network_feature_preferences')
}

function fromChefNetworkContactShares(db: any): any {
  return db.from('chef_network_contact_shares')
}

function extractChefProfileImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${CHEF_PROFILE_IMAGES_BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  const encodedPath = url
    .slice(markerIndex + marker.length)
    .split('?')[0]
    .split('#')[0]
  if (!encodedPath) return null
  return decodeURIComponent(encodedPath)
}

async function ensureChefProfileImagesBucket(db: any) {
  const { error: createError } = await db.storage.createBucket(CHEF_PROFILE_IMAGES_BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_PROFILE_IMAGE_TYPES,
    fileSizeLimit: `${MAX_PROFILE_IMAGE_SIZE}`,
  } as any)

  if (!createError) return

  const message = String((createError as any)?.message || '').toLowerCase()
  const statusCode = Number((createError as any)?.statusCode || (createError as any)?.status || 0)
  const isConflict =
    statusCode === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('conflict')

  if (isConflict) return

  // Double-check in case create returned a non-standard error even though bucket now exists.
  const { data: buckets, error: listError } = await db.storage.listBuckets()
  if (!listError) {
    const exists = (buckets || []).some((bucket: any) => bucket.id === CHEF_PROFILE_IMAGES_BUCKET)
    if (exists) return
  }

  console.error('[ensureChefProfileImagesBucket] createBucket error:', createError)
  throw new Error(
    'Storage bucket setup failed. Please create bucket "chef-profile-images" (public) in local storage.'
  )
}

function getDefaultFeaturePreferenceMap(): Record<NetworkFeatureKey, boolean> {
  const map = {} as Record<NetworkFeatureKey, boolean>
  for (const key of NETWORK_FEATURE_KEYS) {
    map[key] = true
  }
  return map
}

async function getFeaturePreferenceMapForChef(
  db: any,
  chefId: string
): Promise<Record<NetworkFeatureKey, boolean>> {
  const map = getDefaultFeaturePreferenceMap()

  const { data, error } = await fromChefNetworkFeaturePreferences(db)
    .select('feature_key, enabled')
    .eq('chef_id', chefId)

  if (error || !data) {
    if (error) console.error('[getFeaturePreferenceMapForChef] Error:', error)
    return map
  }

  for (const row of data as any[]) {
    const key = row.feature_key as NetworkFeatureKey
    if (NETWORK_FEATURE_KEYS.includes(key)) {
      map[key] = row.enabled !== false
    }
  }

  return map
}

// ============================================
// QUERIES
// ============================================

/**
 * Search for discoverable chefs by name.
 * Returns results annotated with connection status relative to the current chef.
 */
export async function searchChefs(
  input: z.infer<typeof SearchChefsSchema>
): Promise<SearchableChef[]> {
  const user = await requireChef()
  const validated = SearchChefsSchema.parse(input)
  const db = createServerClient({ admin: true })
  const query = validated.query.trim()

  // Find discoverable chefs (optionally filtered by query)
  let chefsQuery = db
    .from('chefs')
    .select(
      `
      id,
      display_name,
      business_name,
      bio,
      profile_image_url,
      chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state, network_discoverable)
    `
    )
    .neq('id', user.entityId)
    .limit(20)

  if (query.length > 0) {
    const safeQuery = query.replace(/[%_,.()"'\\]/g, '')
    chefsQuery = chefsQuery.or(
      `business_name.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`
    )
  }

  const { data: chefs, error } = await chefsQuery

  if (error || !chefs) return []

  // Get current user's connections to annotate results
  const { data: connections } = await fromChefConnections(db)
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)

  const connectionMap = new Map<string, { status: string; direction: string; id: string }>()
  for (const conn of (connections || []) as any[]) {
    const otherId = conn.requester_id === user.entityId ? conn.addressee_id : conn.requester_id
    const direction = conn.requester_id === user.entityId ? 'sent' : 'received'
    connectionMap.set(otherId, { status: conn.status, direction, id: conn.id })
  }

  const cityFilter = validated.city?.trim().toLowerCase()
  const stateFilter = validated.state?.trim().toUpperCase()

  const visibleChefs = (chefs as any[]).filter((chef) => {
    const prefs = Array.isArray(chef.chef_preferences)
      ? chef.chef_preferences[0]
      : chef.chef_preferences
    if (prefs?.network_discoverable === false) return false
    // Apply optional location filters (case-insensitive, partial match for city)
    if (stateFilter && (prefs?.home_state?.toUpperCase() ?? '') !== stateFilter) return false
    if (cityFilter && !(prefs?.home_city?.toLowerCase() ?? '').includes(cityFilter)) return false
    return true
  })

  return visibleChefs.map((chef) => {
    const conn = connectionMap.get(chef.id)
    let connection_status: SearchableChef['connection_status'] = 'none'
    if (conn) {
      if (conn.status === 'accepted') connection_status = 'accepted'
      else if (conn.status === 'pending' && conn.direction === 'sent')
        connection_status = 'pending_sent'
      else if (conn.status === 'pending' && conn.direction === 'received')
        connection_status = 'pending_received'
      else if (conn.status === 'declined') connection_status = 'declined'
    }

    const prefs = Array.isArray(chef.chef_preferences)
      ? chef.chef_preferences[0]
      : chef.chef_preferences
    return {
      id: chef.id,
      display_name: chef.display_name,
      business_name: chef.business_name,
      bio: chef.bio,
      profile_image_url: chef.profile_image_url,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      connection_status,
      connection_id: conn?.id ?? null,
    }
  })
}

/**
 * Get all accepted connections (friends list).
 */
export async function getMyConnections(): Promise<ChefFriend[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: connections, error } = await fromChefConnections(db)
    .select('id, requester_id, addressee_id, accepted_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)
    .order('accepted_at', { ascending: false })

  if (error || !connections?.length) return []

  const friendChefIds = (connections as any[]).map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )

  const { data: chefs } = await db
    .from('chefs')
    .select(
      `
      id, display_name, business_name, bio, profile_image_url,
      chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)
    `
    )
    .in('id', friendChefIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) {
    chefMap.set(chef.id, chef)
  }

  return (connections as any[]).map((conn: any) => {
    const friendId = conn.requester_id === user.entityId ? conn.addressee_id : conn.requester_id
    const chef = chefMap.get(friendId)
    const prefs = Array.isArray(chef?.chef_preferences)
      ? chef.chef_preferences[0]
      : chef?.chef_preferences
    return {
      id: conn.id,
      chef_id: friendId,
      display_name: chef?.display_name ?? null,
      business_name: chef?.business_name ?? 'Unknown',
      bio: chef?.bio ?? null,
      profile_image_url: chef?.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      connected_since: conn.accepted_at,
    }
  })
}

/**
 * Get pending connection requests (both sent and received).
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: pending, error } = await fromChefConnections(db)
    .select('id, requester_id, addressee_id, request_message, created_at')
    .eq('status', 'pending')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)
    .order('created_at', { ascending: false })

  if (error || !pending?.length) return []

  const otherIds = (pending as any[]).map((p: any) =>
    p.requester_id === user.entityId ? p.addressee_id : p.requester_id
  )

  const { data: chefs } = await db
    .from('chefs')
    .select(
      'id, display_name, business_name, chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)'
    )
    .in('id', otherIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) chefMap.set(chef.id, chef)

  return (pending as any[]).map((p: any) => {
    const isSent = p.requester_id === user.entityId
    const otherId = isSent ? p.addressee_id : p.requester_id
    const chef = chefMap.get(otherId)
    const prefs = Array.isArray(chef?.chef_preferences)
      ? chef.chef_preferences[0]
      : chef?.chef_preferences
    return {
      id: p.id,
      direction: isSent ? ('sent' as const) : ('received' as const),
      chef_id: otherId,
      display_name: chef?.display_name ?? null,
      business_name: chef?.business_name ?? 'Unknown',
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      request_message: p.request_message,
      created_at: p.created_at,
    }
  })
}

/**
 * Get the social feed for the current chef.
 * Includes posts authored by the chef and accepted connections.
 */
export async function getNetworkFeed(
  input: z.infer<typeof GetFeedSchema> = {}
): Promise<NetworkFeedPost[]> {
  const user = await requireChef()
  const validated = GetFeedSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: connections } = await fromChefConnections(db)
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)

  const visibleAuthorIds = new Set<string>([user.entityId])
  for (const conn of (connections || []) as any[]) {
    const otherId = conn.requester_id === user.entityId ? conn.addressee_id : conn.requester_id
    visibleAuthorIds.add(otherId)
  }

  const featurePreferenceMap = await getFeaturePreferenceMapForChef(db, user.entityId)
  const enabledFeatureKeys = NETWORK_FEATURE_KEYS.filter((key) => featurePreferenceMap[key])
  if (enabledFeatureKeys.length === 0) return []

  const { data: posts, error: postsError } = await fromChefNetworkPosts(db)
    .select('id, author_chef_id, content, feature_key, created_at')
    .in('author_chef_id', Array.from(visibleAuthorIds))
    .in('feature_key', enabledFeatureKeys)
    .order('created_at', { ascending: false })
    .limit(validated.limit ?? 40)

  if (postsError || !posts?.length) return []

  const authorIds = Array.from(new Set((posts as any[]).map((p) => p.author_chef_id)))
  const { data: authors } = await db
    .from('chefs')
    .select(
      `
      id, display_name, business_name, profile_image_url,
      chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)
    `
    )
    .in('id', authorIds)

  const authorMap = new Map<string, any>()
  for (const author of (authors || []) as any[]) {
    authorMap.set(author.id, author)
  }

  return (posts as any[]).map((post: any) => {
    const author = authorMap.get(post.author_chef_id)
    const prefs = Array.isArray(author?.chef_preferences)
      ? author.chef_preferences[0]
      : author?.chef_preferences
    return {
      id: post.id,
      content: post.content,
      feature_key: post.feature_key as NetworkFeatureKey,
      created_at: post.created_at,
      is_mine: post.author_chef_id === user.entityId,
      author: {
        id: post.author_chef_id,
        display_name: author?.display_name ?? null,
        business_name: author?.business_name ?? 'Unknown',
        profile_image_url: author?.profile_image_url ?? null,
        city: prefs?.home_city ?? null,
        state: prefs?.home_state ?? null,
      },
    }
  })
}

/**
 * Get all network feature preferences for the current chef.
 * Defaults to enabled=true for any feature without an explicit row.
 */
export async function getNetworkFeaturePreferences(): Promise<NetworkFeaturePreference[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const preferenceMap = await getFeaturePreferenceMapForChef(db, user.entityId)

  return NETWORK_FEATURE_KEYS.map((key) => ({
    feature_key: key,
    label: NETWORK_FEATURE_DEFINITIONS[key].label,
    description: NETWORK_FEATURE_DEFINITIONS[key].description,
    enabled: preferenceMap[key],
  }))
}

/**
 * Get direct contact shares sent/received by the current chef.
 */
export async function getNetworkContactShares(
  input: z.infer<typeof GetContactSharesSchema> = {}
): Promise<NetworkContactShare[]> {
  const user = await requireChef()
  const validated = GetContactSharesSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: shares, error } = await fromChefNetworkContactShares(db)
    .select(
      `
      id,
      sender_chef_id,
      recipient_chef_id,
      status,
      contact_name,
      contact_phone,
      contact_email,
      event_date,
      location,
      details,
      response_note,
      created_at,
      responded_at
    `
    )
    .or(`sender_chef_id.eq.${user.entityId},recipient_chef_id.eq.${user.entityId}`)
    .order('created_at', { ascending: false })
    .limit(validated.limit ?? 80)

  if (error || !shares?.length) return []

  const otherChefIds = Array.from(
    new Set(
      (shares as any[]).map((share) =>
        share.sender_chef_id === user.entityId ? share.recipient_chef_id : share.sender_chef_id
      )
    )
  )

  const { data: chefs } = await db
    .from('chefs')
    .select('id, display_name, business_name, profile_image_url')
    .in('id', otherChefIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) {
    chefMap.set(chef.id, chef)
  }

  return (shares as any[]).map((share) => {
    const isSent = share.sender_chef_id === user.entityId
    const otherId = isSent ? share.recipient_chef_id : share.sender_chef_id
    const otherChef = chefMap.get(otherId)
    return {
      id: share.id,
      status: share.status,
      direction: isSent ? 'sent' : 'received',
      contact_name: share.contact_name,
      contact_phone: share.contact_phone,
      contact_email: share.contact_email,
      event_date: share.event_date,
      location: share.location,
      details: share.details,
      response_note: share.response_note,
      created_at: share.created_at,
      responded_at: share.responded_at,
      participant: {
        chef_id: otherId,
        display_name: otherChef?.display_name ?? null,
        business_name: otherChef?.business_name ?? 'Unknown',
        profile_image_url: otherChef?.profile_image_url ?? null,
      },
    } satisfies NetworkContactShare
  })
}

/**
 * Business-level stats across inquiries, dinners/events, clients, and sharing coverage.
 */
export async function getNetworkInsights(): Promise<NetworkInsights> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  const tenantId = user.tenantId || user.entityId

  const [inquiriesRes, eventsRes, clientsRes, sharesRes] = await Promise.all([
    db
      .from('inquiries')
      .select('id, client_id, converted_to_event_id, confirmed_date')
      .eq('tenant_id', tenantId),
    db.from('events').select('id, event_date, status').eq('tenant_id', tenantId),
    db.from('clients').select('id, full_name, email, phone').eq('tenant_id', tenantId),
    fromChefNetworkContactShares(db)
      .select(
        'id, sender_chef_id, recipient_chef_id, status, contact_email, contact_phone, event_date, details'
      )
      .or(`sender_chef_id.eq.${user.entityId},recipient_chef_id.eq.${user.entityId}`),
  ])

  const inquiries = (inquiriesRes.data || []) as Array<{
    id: string
    client_id: string | null
    converted_to_event_id: string | null
    confirmed_date: string | null
  }>
  const events = (eventsRes.data || []) as Array<{
    id: string
    event_date: string
    status: string
  }>
  const clients = (clientsRes.data || []) as Array<{
    id: string
    full_name: string
    email: string
    phone: string | null
  }>
  const shares = (sharesRes.data || []) as Array<{
    id: string
    sender_chef_id: string
    recipient_chef_id: string
    status: 'open' | 'accepted' | 'passed'
    contact_email: string | null
    contact_phone: string | null
    event_date: string | null
    details: string
  }>

  const today = new Date().toISOString().slice(0, 10)
  const inquiryIdPattern = /Inquiry ID:\s*([0-9a-f-]{36})/i

  const sharedInquiryIds = new Set<string>()
  const sharedDinnerDates = new Set<string>()
  const sharedClientIds = new Set<string>()

  const clientByEmail = new Map<string, string>()
  const clientByPhone = new Map<string, string>()
  for (const client of clients) {
    clientByEmail.set(client.email.trim().toLowerCase(), client.id)
    if (client.phone) {
      clientByPhone.set(normalizePhone(client.phone), client.id)
    }
  }

  for (const share of shares) {
    const inquiryMatch = share.details.match(inquiryIdPattern)
    if (inquiryMatch?.[1]) {
      sharedInquiryIds.add(inquiryMatch[1])
    }
    if (share.event_date) {
      sharedDinnerDates.add(share.event_date)
    }
    if (share.contact_email) {
      const clientId = clientByEmail.get(share.contact_email.trim().toLowerCase())
      if (clientId) sharedClientIds.add(clientId)
    }
    if (share.contact_phone) {
      const clientId = clientByPhone.get(normalizePhone(share.contact_phone))
      if (clientId) sharedClientIds.add(clientId)
    }
  }

  const unsharedInquiryIds = inquiries
    .map((inq) => inq.id)
    .filter((id) => !sharedInquiryIds.has(id))

  const unsharedClientNames = clients
    .filter((client) => !sharedClientIds.has(client.id))
    .map((client) => client.full_name)

  const dinnerDatesAll = new Set(events.map((event) => event.event_date))
  let completedCount = 0
  let upcomingCount = 0
  for (const event of events) {
    if (event.status === 'completed') completedCount += 1
    else if (event.event_date >= today) upcomingCount += 1
  }

  return {
    inquiries_total: inquiries.length,
    inquiries_converted: inquiries.filter((inquiry) => inquiry.converted_to_event_id != null)
      .length,
    inquiries_with_client: inquiries.filter((inquiry) => inquiry.client_id != null).length,
    inquiries_shared: sharedInquiryIds.size,
    inquiries_unshared: Math.max(0, inquiries.length - sharedInquiryIds.size),
    dinners_total: events.length,
    dinners_upcoming: upcomingCount,
    dinners_completed: completedCount,
    dinner_dates_shared: sharedDinnerDates.size,
    dinner_dates_unshared: Math.max(0, dinnerDatesAll.size - sharedDinnerDates.size),
    clients_total: clients.length,
    clients_shared: sharedClientIds.size,
    clients_unshared: Math.max(0, clients.length - sharedClientIds.size),
    shares_sent_total: shares.filter((share) => share.sender_chef_id === user.entityId).length,
    shares_received_total: shares.filter((share) => share.recipient_chef_id === user.entityId)
      .length,
    shares_open: shares.filter((share) => share.status === 'open').length,
    shares_accepted: shares.filter((share) => share.status === 'accepted').length,
    shares_passed: shares.filter((share) => share.status === 'passed').length,
    unshared_inquiry_ids: unsharedInquiryIds.slice(0, 20),
    unshared_client_names: unsharedClientNames.slice(0, 20),
  }
}

function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

/**
 * Get network discoverability setting for current chef.
 */
export async function getNetworkDiscoverable(): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefPreferences(db)
    .select('network_discoverable')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[getNetworkDiscoverable] Error:', error)
    return true
  }

  return (data as any)?.network_discoverable ?? true
}

/**
 * Get current chef's profile fields for the profile edit form.
 */
export async function getChefProfile(): Promise<{
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chefs')
    .select('display_name, business_name, bio, profile_image_url')
    .eq('id', user.entityId)
    .single()

  if (error || !data) {
    throw new Error('Failed to load profile')
  }

  return data as any
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Send a connection request to another chef.
 */
export async function sendConnectionRequest(input: z.infer<typeof SendRequestSchema>) {
  const user = await requireChef()
  const validated = SendRequestSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.addressee_id === user.entityId) {
    throw new Error('Cannot send a connection request to yourself')
  }

  // Check addressee is discoverable
  const { data: prefs } = await fromChefPreferences(db)
    .select('network_discoverable')
    .eq('chef_id', validated.addressee_id)
    .maybeSingle()

  if ((prefs as any)?.network_discoverable === false) {
    throw new Error('This chef is not accepting connection requests')
  }

  // Check for existing connection in either direction
  const { data: existing } = await fromChefConnections(db)
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.entityId},addressee_id.eq.${validated.addressee_id}),` +
        `and(requester_id.eq.${validated.addressee_id},addressee_id.eq.${user.entityId})`
    )
    .limit(1)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.status === 'accepted') throw new Error('Already connected')
    if (ex.status === 'pending') throw new Error('Connection request already pending')
    // If declined, allow re-requesting by resetting to pending
    if (ex.status === 'declined') {
      const { error } = await fromChefConnections(db)
        .update({
          status: 'pending',
          request_message: validated.message ?? null,
          declined_at: null,
        })
        .eq('id', ex.id)

      if (error) throw new Error('Failed to resend request')
      revalidatePath('/network')
      return { success: true }
    }
  }

  // Insert new connection request
  const { error } = await fromChefConnections(db).insert({
    requester_id: user.entityId,
    addressee_id: validated.addressee_id,
    request_message: validated.message ?? null,
  })

  if (error) {
    console.error('[sendConnectionRequest] Error:', error)
    throw new Error('Failed to send connection request')
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Accept or decline a connection request (addressee only).
 */
export async function respondToConnectionRequest(input: z.infer<typeof RespondSchema>) {
  const user = await requireChef()
  const validated = RespondSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Verify this request is addressed to the current chef and is pending
  const { data: connection, error: fetchError } = await fromChefConnections(db)
    .select('*')
    .eq('id', validated.connection_id)
    .eq('addressee_id', user.entityId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !connection) {
    throw new Error('Connection request not found or already responded to')
  }

  const updateData =
    validated.action === 'accept'
      ? { status: 'accepted' as const, accepted_at: new Date().toISOString() }
      : { status: 'declined' as const, declined_at: new Date().toISOString() }

  const { error } = await fromChefConnections(db)
    .update(updateData)
    .eq('id', validated.connection_id)

  if (error) {
    throw new Error(`Failed to ${validated.action} connection request`)
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Remove an existing connection (soft remove - sets to declined).
 */
export async function removeConnection(connectionId: string) {
  const user = await requireChef()
  z.string().uuid().parse(connectionId)
  const db = createServerClient({ admin: true })

  // Verify the user is part of this connection
  const { data: conn } = await fromChefConnections(db)
    .select('requester_id, addressee_id')
    .eq('id', connectionId)
    .single()

  const c = conn as any
  if (!c || (c.requester_id !== user.entityId && c.addressee_id !== user.entityId)) {
    throw new Error('Connection not found')
  }

  const { error } = await fromChefConnections(db)
    .update({ status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) throw new Error('Failed to remove connection')

  revalidatePath('/network')
  return { success: true }
}

/**
 * Toggle network discoverability on/off.
 */
export async function toggleNetworkDiscoverable(discoverable: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Upsert pattern (same as updateChefPreferences)
  const { data: existing } = await fromChefPreferences(db)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(db)
      .update({ network_discoverable: discoverable })
      .eq('chef_id', user.entityId)

    if (error) throw new Error('Failed to update discoverability')
  } else {
    const { error } = await fromChefPreferences(db).insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      network_discoverable: discoverable,
    })

    if (error) throw new Error('Failed to save discoverability')
  }

  revalidatePath('/network')
  revalidatePath('/settings')
  return { success: true }
}

/**
 * Update chef profile fields (display name, bio, image).
 */
export async function updateChefProfile(input: UpdateProfileInput) {
  const user = await requireChef()
  const validated = UpdateProfileSchema.parse(input)
  const db: any = createServerClient()

  const { error } = await db.from('chefs').update(validated).eq('id', user.entityId)

  if (error) {
    console.error('[updateChefProfile] Error:', error)
    throw new Error('Failed to update profile')
  }

  revalidatePath('/network')
  revalidatePath('/settings')
  return { success: true }
}

/**
 * Upload a chef profile image file and save the resulting public URL on the profile.
 */
export async function uploadChefProfileImage(
  formData: FormData
): Promise<{ success: true; url: string }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const file = formData.get('image') as File | null
  if (!file) {
    throw new Error('No image file provided')
  }

  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, HEIC, or WebP')
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error(
      `File too large. Maximum ${(MAX_PROFILE_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB`
    )
  }

  const { data: currentChef } = await db
    .from('chefs')
    .select('profile_image_url')
    .eq('id', user.entityId)
    .maybeSingle()

  const previousPath = extractChefProfileImagePath((currentChef as any)?.profile_image_url ?? null)

  // Optimize: resize to max 512px wide, convert to WebP (same infra as logo upload)
  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const optimized = await optimizeProfilePhoto(rawBuffer, file.type)

  const storagePath = `${user.entityId}/${Date.now()}-${crypto.randomUUID()}.${optimized.ext}`

  const uploadFile = async () =>
    db.storage.from(CHEF_PROFILE_IMAGES_BUCKET).upload(storagePath, optimized.data, {
      contentType: optimized.mimeType,
      upsert: false,
    })

  let { error: uploadError } = await uploadFile()

  if (
    uploadError &&
    String((uploadError as any).message || '')
      .toLowerCase()
      .includes('bucket')
  ) {
    await ensureChefProfileImagesBucket(db)
    const retry = await uploadFile()
    uploadError = retry.error
  }

  if (uploadError) {
    console.error('[uploadChefProfileImage] upload error:', uploadError)
    throw new Error('Failed to upload profile image')
  }

  const { data: publicUrlData } = await db.storage
    .from(CHEF_PROFILE_IMAGES_BUCKET)
    .getPublicUrl(storagePath)

  const publicUrl = publicUrlData.publicUrl
  const { error: updateError } = await db
    .from('chefs')
    .update({ profile_image_url: publicUrl })
    .eq('id', user.entityId)

  if (updateError) {
    console.error('[uploadChefProfileImage] update profile error:', updateError)
    await db.storage.from(CHEF_PROFILE_IMAGES_BUCKET).remove([storagePath])
    throw new Error('Image uploaded but failed to save profile')
  }

  if (previousPath && previousPath !== storagePath) {
    await db.storage.from(CHEF_PROFILE_IMAGES_BUCKET).remove([previousPath])
  }

  revalidatePath('/network')
  revalidatePath('/settings')
  revalidatePath('/settings/profile')
  revalidatePath('/settings/my-profile')
  revalidatePath('/settings/account')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true, url: publicUrl }
}

/**
 * Create a new chef network post.
 */
export async function createNetworkPost(input: z.infer<typeof CreatePostSchema>) {
  const user = await requireChef()
  const validated = CreatePostSchema.parse(input)
  const db = createServerClient({ admin: true })
  const featurePreferenceMap = await getFeaturePreferenceMapForChef(db, user.entityId)

  if (!featurePreferenceMap[validated.feature_key]) {
    throw new Error('That post type is currently disabled in your feed preferences')
  }

  const { data, error } = await fromChefNetworkPosts(db)
    .insert({
      author_chef_id: user.entityId,
      content: validated.content,
      feature_key: validated.feature_key,
    })
    .select('id, content, created_at')
    .single()

  if (error || !data) {
    console.error('[createNetworkPost] Error:', error)
    throw new Error('Failed to create post')
  }

  revalidatePath('/network')
  return { success: true, post: data }
}

/**
 * Opt in/out of a specific network feature.
 */
export async function updateNetworkFeaturePreference(
  input: z.infer<typeof UpdateFeaturePreferenceSchema>
) {
  const user = await requireChef()
  const validated = UpdateFeaturePreferenceSchema.parse(input)
  const db: any = createServerClient()

  const { error } = await fromChefNetworkFeaturePreferences(db).upsert(
    {
      chef_id: user.entityId,
      feature_key: validated.feature_key,
      enabled: validated.enabled,
    },
    { onConflict: 'chef_id,feature_key' }
  )

  if (error) {
    console.error('[updateNetworkFeaturePreference] Error:', error)
    throw new Error('Failed to update feature preference')
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Outreach helper for chef-to-chef assistance requests.
 * Supports: specific date help, inquiry help, and full handover.
 */
export async function requestNetworkHelp(input: z.infer<typeof RequestNetworkHelpSchema>) {
  const validated = RequestNetworkHelpSchema.parse(input)

  const helpTypeLabels: Record<z.infer<typeof HelpRequestTypeSchema>, string> = {
    date_help: 'Date Help Request',
    inquiry_help: 'Inquiry Help Request',
    full_handover: 'Full Handover Request',
  }

  const structuredLines = [`[${helpTypeLabels[validated.help_type]}]`]

  if (validated.calendar_date) {
    structuredLines.push(`Calendar Date: ${validated.calendar_date}`)
  }

  if (validated.inquiry_id) {
    structuredLines.push(`Inquiry ID: ${validated.inquiry_id}`)
  }

  if (validated.inquiry_summary) {
    structuredLines.push(`Inquiry Summary: ${validated.inquiry_summary}`)
  }

  if (validated.details) {
    structuredLines.push(`Details: ${validated.details}`)
  }

  const details = structuredLines.join('\n')

  return createNetworkContactShare({
    recipient_chef_id: validated.recipient_chef_id,
    contact_name: validated.contact_name,
    contact_phone: validated.contact_phone || null,
    contact_email: validated.contact_email || null,
    event_date: validated.calendar_date || null,
    location: validated.location || null,
    details,
  })
}

/**
 * Create a direct contact share to an accepted connection.
 */
export async function createNetworkContactShare(input: z.infer<typeof CreateContactShareSchema>) {
  const user = await requireChef()
  const validated = CreateContactShareSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.recipient_chef_id === user.entityId) {
    throw new Error('Cannot send a share to yourself')
  }

  const { data: connection } = await fromChefConnections(db)
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${user.entityId},addressee_id.eq.${validated.recipient_chef_id}),` +
        `and(requester_id.eq.${validated.recipient_chef_id},addressee_id.eq.${user.entityId})`
    )
    .limit(1)
    .maybeSingle()

  if (!connection) {
    throw new Error('You can only share contacts with accepted connections')
  }

  const { error } = await fromChefNetworkContactShares(db).insert({
    sender_chef_id: user.entityId,
    recipient_chef_id: validated.recipient_chef_id,
    contact_name: validated.contact_name,
    contact_phone: validated.contact_phone || null,
    contact_email: validated.contact_email || null,
    event_date: validated.event_date || null,
    location: validated.location || null,
    details: validated.details,
  })

  if (error) {
    console.error('[createNetworkContactShare] Error:', error)
    throw new Error('Failed to share contact')
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Recipient can accept/pass a direct contact share.
 */
export async function respondToNetworkContactShare(
  input: z.infer<typeof RespondContactShareSchema>
) {
  const user = await requireChef()
  const validated = RespondContactShareSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: share, error: shareError } = await fromChefNetworkContactShares(db)
    .select('id, recipient_chef_id, status')
    .eq('id', validated.share_id)
    .single()

  if (shareError || !share) {
    throw new Error('Share not found')
  }
  if ((share as any).recipient_chef_id !== user.entityId) {
    throw new Error('Only the recipient can respond to this share')
  }
  if ((share as any).status !== 'open') {
    throw new Error('This share has already been responded to')
  }

  const { error } = await fromChefNetworkContactShares(db)
    .update({
      status: validated.action,
      response_note: validated.response_note || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', validated.share_id)

  if (error) {
    console.error('[respondToNetworkContactShare] Error:', error)
    throw new Error('Failed to update share response')
  }

  revalidatePath('/network')
  return { success: true }
}
