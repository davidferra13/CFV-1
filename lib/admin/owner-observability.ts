'use server'

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'

type PaginationInput = {
  page?: number
  limit?: number
}

type PaginationResult = {
  page: number
  limit: number
  hasMore: boolean
}

type DateRangeInput = {
  from?: string
  to?: string
}

function normalizeSearchTerm(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().replace(/,/g, ' ')
  return normalized.length > 0 ? normalized : null
}

function normalizePagination(input: PaginationInput | undefined) {
  const rawPage = Number(input?.page ?? 1)
  const rawLimit = Number(input?.limit ?? 50)
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.floor(rawLimit))) : 50
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}

export type GlobalConversationListItem = {
  id: string
  tenantId: string
  tenantName: string | null
  contextType: string
  eventId: string | null
  inquiryId: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
  updatedAt: string
}

export type GlobalConversationListResult = PaginationResult & {
  items: GlobalConversationListItem[]
}

export async function getGlobalConversationList(
  input: PaginationInput &
    DateRangeInput & {
      q?: string
      tenantId?: string
    } = {}
): Promise<GlobalConversationListResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  let query = db
    .from('conversations')
    .select(
      'id, tenant_id, context_type, event_id, inquiry_id, last_message_at, last_message_preview, created_at, updated_at'
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (input.tenantId) query = query.eq('tenant_id', input.tenantId)
  if (input.from) query = query.gte('created_at', input.from)
  if (input.to) query = query.lte('created_at', input.to)
  if (q) {
    query = query.or(`id.ilike.%${q}%,tenant_id.ilike.%${q}%,last_message_preview.ilike.%${q}%`)
  }

  const { data, error } = await query.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load conversations: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    tenant_id: string
    context_type: string
    event_id: string | null
    inquiry_id: string | null
    last_message_at: string | null
    last_message_preview: string | null
    created_at: string
    updated_at: string
  }>

  const tenantIds = Array.from(new Set(rows.map((row) => row.tenant_id)))
  const { data: chefs } = tenantIds.length
    ? await db.from('chefs').select('id, display_name, business_name').in('id', tenantIds)
    : { data: [] }
  const chefNameById = new Map<string, string | null>()
  for (const chef of (chefs ?? []) as Array<{
    id: string
    display_name?: string | null
    business_name?: string | null
  }>) {
    chefNameById.set(chef.id, chef.display_name ?? chef.business_name ?? null)
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: rows.length === pagination.limit,
    items: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: chefNameById.get(row.tenant_id) ?? null,
      contextType: row.context_type,
      eventId: row.event_id,
      inquiryId: row.inquiry_id,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }
}

export type ConversationTranscriptMessage = {
  id: string
  senderId: string
  senderRole: string | null
  senderEntityId: string | null
  senderDisplayName: string | null
  messageType: string
  body: string | null
  referencedEventId: string | null
  systemEventType: string | null
  createdAt: string
  deletedAt: string | null
}

export type ConversationTranscriptResult = PaginationResult & {
  conversation: GlobalConversationListItem | null
  messages: ConversationTranscriptMessage[]
}

export async function getConversationTranscript(
  conversationId: string,
  input: PaginationInput & { q?: string; includeDeleted?: boolean } = {}
): Promise<ConversationTranscriptResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  const { data: conversation } = await db
    .from('conversations')
    .select(
      'id, tenant_id, context_type, event_id, inquiry_id, last_message_at, last_message_preview, created_at, updated_at'
    )
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation) {
    return {
      page: pagination.page,
      limit: pagination.limit,
      hasMore: false,
      conversation: null,
      messages: [],
    }
  }

  const { data: chef } = await db
    .from('chefs')
    .select('id, display_name, business_name')
    .eq('id', conversation.tenant_id)
    .maybeSingle()

  let messageQuery = db
    .from('chat_messages')
    .select(
      'id, sender_id, message_type, body, referenced_event_id, system_event_type, created_at, deleted_at'
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })

  if (!input.includeDeleted) {
    messageQuery = messageQuery.is('deleted_at', null)
  }
  if (q) {
    messageQuery = messageQuery.ilike('body', `%${q}%`)
  }

  const { data: messages, error } = await messageQuery.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load conversation transcript: ${error.message}`)

  const messageRows = (messages ?? []) as Array<{
    id: string
    sender_id: string
    message_type: string
    body: string | null
    referenced_event_id: string | null
    system_event_type: string | null
    created_at: string
    deleted_at: string | null
  }>

  const senderIds = Array.from(new Set(messageRows.map((row) => row.sender_id).filter(Boolean)))
  const { data: senderRoles } = senderIds.length
    ? await db
        .from('user_roles')
        .select('auth_user_id, role, entity_id')
        .in('auth_user_id', senderIds)
    : { data: [] }

  const roleBySenderId = new Map<
    string,
    {
      role: string
      entityId: string
    }
  >()
  for (const row of (senderRoles ?? []) as Array<{
    auth_user_id: string
    role: string
    entity_id: string
  }>) {
    if (!roleBySenderId.has(row.auth_user_id)) {
      roleBySenderId.set(row.auth_user_id, { role: row.role, entityId: row.entity_id })
    }
  }

  const chefEntityIds = Array.from(
    new Set(
      Array.from(roleBySenderId.values())
        .filter((row) => row.role === 'chef')
        .map((row) => row.entityId)
    )
  )
  const clientEntityIds = Array.from(
    new Set(
      Array.from(roleBySenderId.values())
        .filter((row) => row.role === 'client')
        .map((row) => row.entityId)
    )
  )

  const [chefRows, clientRows] = await Promise.all([
    chefEntityIds.length
      ? db.from('chefs').select('id, display_name, business_name').in('id', chefEntityIds)
      : Promise.resolve({ data: [] }),
    clientEntityIds.length
      ? db.from('clients').select('id, full_name, email').in('id', clientEntityIds)
      : Promise.resolve({ data: [] }),
  ])

  const senderNameByEntityId = new Map<string, string | null>()
  for (const row of (chefRows.data ?? []) as Array<{
    id: string
    display_name?: string | null
    business_name?: string | null
  }>) {
    senderNameByEntityId.set(row.id, row.display_name ?? row.business_name ?? null)
  }
  for (const row of (clientRows.data ?? []) as Array<{
    id: string
    full_name?: string | null
    email?: string | null
  }>) {
    senderNameByEntityId.set(row.id, row.full_name ?? row.email ?? null)
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: messageRows.length === pagination.limit,
    conversation: {
      id: conversation.id,
      tenantId: conversation.tenant_id,
      tenantName: chef?.display_name ?? chef?.business_name ?? null,
      contextType: conversation.context_type,
      eventId: conversation.event_id,
      inquiryId: conversation.inquiry_id,
      lastMessageAt: conversation.last_message_at,
      lastMessagePreview: conversation.last_message_preview,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    },
    messages: messageRows.map((row) => {
      const senderRole = roleBySenderId.get(row.sender_id)
      return {
        id: row.id,
        senderId: row.sender_id,
        senderRole: senderRole?.role ?? null,
        senderEntityId: senderRole?.entityId ?? null,
        senderDisplayName: senderRole?.entityId
          ? (senderNameByEntityId.get(senderRole.entityId) ?? null)
          : null,
        messageType: row.message_type,
        body: row.body,
        referencedEventId: row.referenced_event_id,
        systemEventType: row.system_event_type,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
      }
    }),
  }
}

export type GlobalSocialPost = {
  id: string
  chefId: string
  chefName: string | null
  channelId: string | null
  postType: string
  visibility: string
  content: string
  reactionsCount: number
  commentsCount: number
  sharesCount: number
  createdAt: string
  updatedAt: string
}

export type GlobalSocialFeedResult = PaginationResult & {
  items: GlobalSocialPost[]
}

export async function getGlobalSocialFeed(
  input: PaginationInput &
    DateRangeInput & {
      q?: string
      chefId?: string
    } = {}
): Promise<GlobalSocialFeedResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  let query = db
    .from('chef_social_posts')
    .select(
      'id, chef_id, channel_id, post_type, visibility, content, reactions_count, comments_count, shares_count, created_at, updated_at'
    )
    .order('created_at', { ascending: false })

  if (input.chefId) query = query.eq('chef_id', input.chefId)
  if (input.from) query = query.gte('created_at', input.from)
  if (input.to) query = query.lte('created_at', input.to)
  if (q) query = query.ilike('content', `%${q}%`)

  const { data, error } = await query.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load social feed: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    chef_id: string
    channel_id: string | null
    post_type: string
    visibility: string
    content: string
    reactions_count: number
    comments_count: number
    shares_count: number
    created_at: string
    updated_at: string
  }>

  const chefIds = Array.from(new Set(rows.map((row) => row.chef_id)))
  const { data: chefs } = chefIds.length
    ? await db.from('chefs').select('id, display_name, business_name').in('id', chefIds)
    : { data: [] }
  const chefNameById = new Map<string, string | null>()
  for (const row of (chefs ?? []) as Array<{
    id: string
    display_name?: string | null
    business_name?: string | null
  }>) {
    chefNameById.set(row.id, row.display_name ?? row.business_name ?? null)
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: rows.length === pagination.limit,
    items: rows.map((row) => ({
      id: row.id,
      chefId: row.chef_id,
      chefName: chefNameById.get(row.chef_id) ?? null,
      channelId: row.channel_id,
      postType: row.post_type,
      visibility: row.visibility,
      content: row.content,
      reactionsCount: row.reactions_count ?? 0,
      commentsCount: row.comments_count ?? 0,
      sharesCount: row.shares_count ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }
}

export type GlobalHubGroup = {
  id: string
  tenantId: string | null
  tenantName: string | null
  name: string
  description: string | null
  visibility: string
  isActive: boolean
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export type GlobalHubGroupsResult = PaginationResult & {
  items: GlobalHubGroup[]
}

export async function getGlobalHubGroups(
  input: PaginationInput &
    DateRangeInput & {
      q?: string
      tenantId?: string
    } = {}
): Promise<GlobalHubGroupsResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  let query = db
    .from('hub_groups')
    .select(
      'id, tenant_id, name, description, visibility, is_active, message_count, last_message_at, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })

  if (input.tenantId) query = query.eq('tenant_id', input.tenantId)
  if (input.from) query = query.gte('created_at', input.from)
  if (input.to) query = query.lte('created_at', input.to)
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)

  const { data, error } = await query.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load hub groups: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    tenant_id: string | null
    name: string
    description: string | null
    visibility: string
    is_active: boolean
    message_count: number
    last_message_at: string | null
    created_at: string
    updated_at: string
  }>

  const tenantIds = Array.from(
    new Set(rows.map((row) => row.tenant_id).filter(Boolean))
  ) as string[]
  const { data: chefs } = tenantIds.length
    ? await db.from('chefs').select('id, display_name, business_name').in('id', tenantIds)
    : { data: [] }
  const chefNameById = new Map<string, string | null>()
  for (const row of (chefs ?? []) as Array<{
    id: string
    display_name?: string | null
    business_name?: string | null
  }>) {
    chefNameById.set(row.id, row.display_name ?? row.business_name ?? null)
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: rows.length === pagination.limit,
    items: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_id ? (chefNameById.get(row.tenant_id) ?? null) : null,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      isActive: row.is_active,
      messageCount: row.message_count ?? 0,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }
}

export type HubTranscriptMessage = {
  id: string
  authorProfileId: string
  authorDisplayName: string | null
  isAnonymous: boolean
  messageType: string
  body: string | null
  systemEventType: string | null
  createdAt: string
  deletedAt: string | null
}

export type HubTranscriptResult = PaginationResult & {
  group: GlobalHubGroup | null
  messages: HubTranscriptMessage[]
}

export async function getHubGroupTranscript(
  groupId: string,
  input: PaginationInput & { q?: string; includeDeleted?: boolean } = {}
): Promise<HubTranscriptResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  const { data: group } = await db
    .from('hub_groups')
    .select(
      'id, tenant_id, name, description, visibility, is_active, message_count, last_message_at, created_at, updated_at'
    )
    .eq('id', groupId)
    .maybeSingle()

  if (!group) {
    return {
      page: pagination.page,
      limit: pagination.limit,
      hasMore: false,
      group: null,
      messages: [],
    }
  }

  let messageQuery = db
    .from('hub_messages')
    .select(
      'id, author_profile_id, is_anonymous, message_type, body, system_event_type, created_at, deleted_at'
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (!input.includeDeleted) {
    messageQuery = messageQuery.is('deleted_at', null)
  }
  if (q) {
    messageQuery = messageQuery.ilike('body', `%${q}%`)
  }

  const { data: messages, error } = await messageQuery.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load hub transcript: ${error.message}`)

  const messageRows = (messages ?? []) as Array<{
    id: string
    author_profile_id: string
    is_anonymous: boolean
    message_type: string
    body: string | null
    system_event_type: string | null
    created_at: string
    deleted_at: string | null
  }>

  const profileIds = Array.from(new Set(messageRows.map((row) => row.author_profile_id)))
  const { data: profiles } = profileIds.length
    ? await db.from('hub_guest_profiles').select('id, display_name, email').in('id', profileIds)
    : { data: [] }
  const profileNameById = new Map<string, string | null>()
  for (const row of (profiles ?? []) as Array<{
    id: string
    display_name?: string | null
    email?: string | null
  }>) {
    profileNameById.set(row.id, row.display_name ?? row.email ?? null)
  }

  let tenantName: string | null = null
  if (group.tenant_id) {
    const { data: chef } = await db
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', group.tenant_id)
      .maybeSingle()
    tenantName = chef?.display_name ?? chef?.business_name ?? null
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: messageRows.length === pagination.limit,
    group: {
      id: group.id,
      tenantId: group.tenant_id,
      tenantName,
      name: group.name,
      description: group.description,
      visibility: group.visibility,
      isActive: group.is_active,
      messageCount: group.message_count ?? 0,
      lastMessageAt: group.last_message_at,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
    },
    messages: messageRows.map((row) => ({
      id: row.id,
      authorProfileId: row.author_profile_id,
      authorDisplayName: profileNameById.get(row.author_profile_id) ?? null,
      isAnonymous: row.is_anonymous,
      messageType: row.message_type,
      body: row.body,
      systemEventType: row.system_event_type,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    })),
  }
}

export type GlobalNotificationFeedItem = {
  id: string
  tenantId: string
  tenantName: string | null
  recipientId: string
  category: string
  action: string
  title: string
  body: string | null
  actionUrl: string | null
  readAt: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export type GlobalNotificationFeedResult = PaginationResult & {
  items: GlobalNotificationFeedItem[]
}

export async function getGlobalNotificationFeed(
  input: PaginationInput &
    DateRangeInput & {
      q?: string
      tenantId?: string
      category?: string
      action?: string
      recipientId?: string
    } = {}
): Promise<GlobalNotificationFeedResult> {
  await requireAdmin()
  const db: any = createAdminClient()
  const pagination = normalizePagination(input)
  const q = normalizeSearchTerm(input.q)

  let query = db
    .from('notifications')
    .select(
      'id, tenant_id, recipient_id, category, action, title, body, action_url, metadata, read_at, created_at'
    )
    .neq('action', 'account_access_alert')
    .order('created_at', { ascending: false })

  if (input.tenantId) query = query.eq('tenant_id', input.tenantId)
  if (input.recipientId) query = query.eq('recipient_id', input.recipientId)
  if (input.category) query = query.eq('category', input.category)
  if (input.action) query = query.eq('action', input.action)
  if (input.from) query = query.gte('created_at', input.from)
  if (input.to) query = query.lte('created_at', input.to)
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`)

  const { data, error } = await query.range(pagination.from, pagination.to)
  if (error) throw new Error(`Failed to load notification feed: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    tenant_id: string
    recipient_id: string
    category: string
    action: string
    title: string
    body: string | null
    action_url: string | null
    metadata: Record<string, unknown> | null
    read_at: string | null
    created_at: string
  }>

  const tenantIds = Array.from(new Set(rows.map((row) => row.tenant_id)))
  const { data: chefs } = tenantIds.length
    ? await db.from('chefs').select('id, display_name, business_name').in('id', tenantIds)
    : { data: [] }
  const chefNameById = new Map<string, string | null>()
  for (const row of (chefs ?? []) as Array<{
    id: string
    display_name?: string | null
    business_name?: string | null
  }>) {
    chefNameById.set(row.id, row.display_name ?? row.business_name ?? null)
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    hasMore: rows.length === pagination.limit,
    items: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: chefNameById.get(row.tenant_id) ?? null,
      recipientId: row.recipient_id,
      category: row.category,
      action: row.action,
      title: row.title,
      body: row.body,
      actionUrl: row.action_url,
      readAt: row.read_at,
      createdAt: row.created_at,
      metadata: row.metadata,
    })),
  }
}
