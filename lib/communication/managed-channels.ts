import { createServerClient } from '@/lib/db/server'
import { normalizePhone, isValidE164 } from '@/lib/calling/phone-utils'
import { decryptCredential } from '@/lib/comms/credential-crypto'
import { getOrCreateEmailChannel } from '@/lib/comms/email-channel'

const INBOUND_EMAIL_DOMAIN = (process.env.INBOUND_EMAIL_DOMAIN || 'cheflowhq.com')
  .trim()
  .toLowerCase()

type ManagedEmailRecord = {
  tenantId: string
  address: string
  mailboxId?: string | null
}

type ManagedTwilioRecord = {
  tenantId: string
  phoneNumber: string
  accountSid: string
  authToken: string
}

export type ManagedChannelResolution = {
  tenantId: string
  channel: 'email' | 'sms' | 'whatsapp'
  provider: 'chef_email_alias' | 'google_mailbox' | 'google_connection' | 'twilio'
  managedAddress: string
  mailboxId?: string | null
  accountSid?: string | null
  authToken?: string | null
}

export type ManagedInboundChannelInput = {
  channel: 'email' | 'sms' | 'whatsapp'
  address: string
}

export type ManagedOutboundChannelInput = {
  tenantId: string
  channel: 'email' | 'sms' | 'whatsapp'
}

export type ManagedMailboxHealth = {
  id: string
  address: string
  isPrimary: boolean
  isActive: boolean
  gmailConnected: boolean
  lastSyncAt: string | null
  syncErrors: number
  historicalScanEnabled: boolean
  historicalScanStatus: string
}

export type ManagedCommunicationControlPlaneSummary = {
  inboundEmailAlias: {
    alias: string
    address: string
  }
  email: {
    outboundOwner: {
      address: string
      provider: 'google_mailbox' | 'google_connection'
      mailboxId: string | null
    } | null
    mailboxes: ManagedMailboxHealth[]
    legacyConnection: {
      address: string | null
      gmailConnected: boolean
      lastSyncAt: string | null
      syncErrors: number
    } | null
  }
  twilio: {
    connected: boolean
    phoneNumber: string | null
    accountSid: string | null
    inboundWebhookUrl: string
    statusCallbackUrl: string
  }
}

export interface ManagedChannelRepository {
  findEmailAlias(alias: string): Promise<ManagedEmailRecord | null>
  findGoogleMailbox(address: string): Promise<ManagedEmailRecord | null>
  findGoogleConnection(address: string): Promise<ManagedEmailRecord | null>
  findTwilioCredentialByPhone(phone: string): Promise<ManagedTwilioRecord | null>
  getPrimaryGoogleMailboxForTenant(tenantId: string): Promise<ManagedEmailRecord | null>
  getGoogleConnectionForTenant(tenantId: string): Promise<ManagedEmailRecord | null>
  getTwilioCredentialForTenant(tenantId: string): Promise<ManagedTwilioRecord | null>
}

function getDb() {
  return createServerClient({ admin: true }) as any
}

function getTwilioStatusCallbackUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://app.cheflowhq.com'

  return `${base.replace(/\/+$/, '')}/api/webhooks/twilio`
}

const managedChannelRepository: ManagedChannelRepository = {
  async findEmailAlias(alias) {
    const db = getDb()
    const { data } = await db
      .from('chef_email_channels')
      .select('chef_id, inbound_alias')
      .eq('inbound_alias', alias)
      .maybeSingle()

    if (!data?.chef_id || !data?.inbound_alias) return null

    return {
      tenantId: data.chef_id,
      address: `${data.inbound_alias}@${INBOUND_EMAIL_DOMAIN}`,
    }
  },

  async findGoogleMailbox(address) {
    const db = getDb()
    const { data } = await db
      .from('google_mailboxes')
      .select('id, tenant_id, normalized_email')
      .eq('normalized_email', address)
      .eq('gmail_connected', true)
      .eq('is_active', true)
      .maybeSingle()

    if (!data?.tenant_id || !data?.normalized_email) return null

    return {
      tenantId: data.tenant_id,
      address: data.normalized_email,
      mailboxId: data.id || null,
    }
  },

  async findGoogleConnection(address) {
    const db = getDb()
    let { data } = await db
      .from('google_connections')
      .select('tenant_id, connected_email')
      .eq('connected_email', address)
      .eq('gmail_connected', true)
      .maybeSingle()

    if (!data) {
      const { data: activeRows } = await db
        .from('google_connections')
        .select('tenant_id, connected_email')
        .eq('gmail_connected', true)

      data =
        (activeRows || []).find(
          (row: any) =>
            String(row.connected_email || '')
              .trim()
              .toLowerCase() === address
        ) || null
    }

    if (!data?.tenant_id || !data?.connected_email) return null

    return {
      tenantId: data.tenant_id,
      address: String(data.connected_email).trim().toLowerCase(),
    }
  },

  async findTwilioCredentialByPhone(phone) {
    const db = getDb()
    let { data } = await db
      .from('chef_twilio_credentials')
      .select('chef_id, phone_number, account_sid, auth_token_enc')
      .eq('phone_number', phone)
      .eq('is_active', true)
      .maybeSingle()

    if (!data) {
      const { data: activeRows } = await db
        .from('chef_twilio_credentials')
        .select('chef_id, phone_number, account_sid, auth_token_enc')
        .eq('is_active', true)

      data =
        (activeRows || []).find(
          (row: any) => normalizeManagedPhoneAddress(row.phone_number) === phone
        ) || null
    }

    if (!data?.chef_id || !data?.phone_number || !data?.account_sid || !data?.auth_token_enc) {
      return null
    }

    let authToken: string
    try {
      authToken = decryptCredential(data.auth_token_enc)
    } catch {
      return null
    }

    return {
      tenantId: data.chef_id,
      phoneNumber: normalizeManagedPhoneAddress(data.phone_number) || data.phone_number,
      accountSid: data.account_sid,
      authToken,
    }
  },

  async getPrimaryGoogleMailboxForTenant(tenantId) {
    const db = getDb()
    const { data } = await db
      .from('google_mailboxes')
      .select('id, tenant_id, normalized_email')
      .eq('tenant_id', tenantId)
      .eq('gmail_connected', true)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!data?.tenant_id || !data?.normalized_email) return null

    return {
      tenantId: data.tenant_id,
      address: data.normalized_email,
      mailboxId: data.id || null,
    }
  },

  async getGoogleConnectionForTenant(tenantId) {
    const db = getDb()
    const { data } = await db
      .from('google_connections')
      .select('tenant_id, connected_email')
      .eq('tenant_id', tenantId)
      .eq('gmail_connected', true)
      .maybeSingle()

    if (!data?.tenant_id || !data?.connected_email) return null

    return {
      tenantId: data.tenant_id,
      address: String(data.connected_email).trim().toLowerCase(),
    }
  },

  async getTwilioCredentialForTenant(tenantId) {
    const db = getDb()
    const { data } = await db
      .from('chef_twilio_credentials')
      .select('chef_id, phone_number, account_sid, auth_token_enc')
      .eq('chef_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!data?.chef_id || !data?.phone_number || !data?.account_sid || !data?.auth_token_enc) {
      return null
    }

    let authToken: string
    try {
      authToken = decryptCredential(data.auth_token_enc)
    } catch {
      return null
    }

    return {
      tenantId: data.chef_id,
      phoneNumber: normalizeManagedPhoneAddress(data.phone_number) || data.phone_number,
      accountSid: data.account_sid,
      authToken,
    }
  },
}

export function normalizeManagedEmailAddress(address: string | null | undefined): string | null {
  const normalized = String(address || '')
    .trim()
    .toLowerCase()

  return normalized.includes('@') ? normalized : null
}

export function normalizeManagedPhoneAddress(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(String(phone || '').trim())
  if (!normalized) return null
  return isValidE164(normalized) ? normalized : null
}

export function extractChefFlowAlias(
  address: string | null | undefined,
  domain = INBOUND_EMAIL_DOMAIN
): string | null {
  const normalized = normalizeManagedEmailAddress(address)
  if (!normalized) return null
  const suffix = `@${domain}`
  if (!normalized.endsWith(suffix)) return null
  const alias = normalized.slice(0, -suffix.length).trim()
  return alias || null
}

export async function resolveManagedInboundChannel(
  input: ManagedInboundChannelInput,
  repository: ManagedChannelRepository = managedChannelRepository
): Promise<ManagedChannelResolution | null> {
  if (input.channel === 'email') {
    const normalizedAddress = normalizeManagedEmailAddress(input.address)
    if (!normalizedAddress) return null

    const alias = extractChefFlowAlias(normalizedAddress)
    if (alias) {
      const aliasRecord = await repository.findEmailAlias(alias)
      if (aliasRecord) {
        return {
          tenantId: aliasRecord.tenantId,
          channel: 'email',
          provider: 'chef_email_alias',
          managedAddress: aliasRecord.address,
        }
      }
    }

    const mailboxRecord = await repository.findGoogleMailbox(normalizedAddress)
    if (mailboxRecord) {
      return {
        tenantId: mailboxRecord.tenantId,
        channel: 'email',
        provider: 'google_mailbox',
        managedAddress: mailboxRecord.address,
        mailboxId: mailboxRecord.mailboxId || null,
      }
    }

    const connectionRecord = await repository.findGoogleConnection(normalizedAddress)
    if (connectionRecord) {
      return {
        tenantId: connectionRecord.tenantId,
        channel: 'email',
        provider: 'google_connection',
        managedAddress: connectionRecord.address,
      }
    }

    return null
  }

  const normalizedPhone = normalizeManagedPhoneAddress(input.address)
  if (!normalizedPhone) return null

  const twilioRecord = await repository.findTwilioCredentialByPhone(normalizedPhone)
  if (!twilioRecord) return null

  return {
    tenantId: twilioRecord.tenantId,
    channel: input.channel,
    provider: 'twilio',
    managedAddress: twilioRecord.phoneNumber,
    accountSid: twilioRecord.accountSid,
    authToken: twilioRecord.authToken,
  }
}

export async function getManagedOutboundChannel(
  input: ManagedOutboundChannelInput,
  repository: ManagedChannelRepository = managedChannelRepository
): Promise<ManagedChannelResolution | null> {
  if (input.channel === 'email') {
    const mailboxRecord = await repository.getPrimaryGoogleMailboxForTenant(input.tenantId)
    if (mailboxRecord) {
      return {
        tenantId: mailboxRecord.tenantId,
        channel: 'email',
        provider: 'google_mailbox',
        managedAddress: mailboxRecord.address,
        mailboxId: mailboxRecord.mailboxId || null,
      }
    }

    const connectionRecord = await repository.getGoogleConnectionForTenant(input.tenantId)
    if (connectionRecord) {
      return {
        tenantId: connectionRecord.tenantId,
        channel: 'email',
        provider: 'google_connection',
        managedAddress: connectionRecord.address,
      }
    }

    return null
  }

  const twilioRecord = await repository.getTwilioCredentialForTenant(input.tenantId)
  if (!twilioRecord) return null

  return {
    tenantId: twilioRecord.tenantId,
    channel: input.channel,
    provider: 'twilio',
    managedAddress: twilioRecord.phoneNumber,
    accountSid: twilioRecord.accountSid,
    authToken: twilioRecord.authToken,
  }
}

export function buildManagedCommunicationControlPlaneSummary(input: {
  inboundEmailAlias: {
    alias: string
    address: string
  }
  mailboxes: ManagedMailboxHealth[]
  legacyConnection: {
    address: string | null
    gmailConnected: boolean
    lastSyncAt: string | null
    syncErrors: number
  } | null
  twilio: {
    connected: boolean
    phoneNumber: string | null
    accountSid: string | null
  }
}): ManagedCommunicationControlPlaneSummary {
  const outboundMailbox =
    input.mailboxes.find(
      (mailbox) => mailbox.gmailConnected && mailbox.isActive && mailbox.isPrimary
    ) ||
    input.mailboxes.find((mailbox) => mailbox.gmailConnected && mailbox.isActive) ||
    null

  return {
    inboundEmailAlias: input.inboundEmailAlias,
    email: {
      outboundOwner: outboundMailbox
        ? {
            address: outboundMailbox.address,
            provider: 'google_mailbox',
            mailboxId: outboundMailbox.id,
          }
        : input.legacyConnection?.gmailConnected && input.legacyConnection.address
          ? {
              address: input.legacyConnection.address,
              provider: 'google_connection',
              mailboxId: null,
            }
          : null,
      mailboxes: input.mailboxes,
      legacyConnection: input.legacyConnection,
    },
    twilio: {
      connected: input.twilio.connected,
      phoneNumber: input.twilio.phoneNumber,
      accountSid: input.twilio.accountSid,
      inboundWebhookUrl: getTwilioStatusCallbackUrl(),
      statusCallbackUrl: getTwilioStatusCallbackUrl(),
    },
  }
}

export async function getManagedCommunicationControlPlaneSummary(input: {
  chefId: string
  tenantId: string
}): Promise<ManagedCommunicationControlPlaneSummary> {
  const db = getDb()
  const inboundEmailAlias = await getOrCreateEmailChannel(input.chefId)

  const [mailboxesResult, legacyConnectionResult, twilioResult] = await Promise.all([
    db
      .from('google_mailboxes')
      .select(
        'id, email, normalized_email, gmail_connected, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_status, is_primary, is_active'
      )
      .eq('tenant_id', input.tenantId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    db
      .from('google_connections')
      .select('connected_email, gmail_connected, gmail_last_sync_at, gmail_sync_errors')
      .eq('tenant_id', input.tenantId)
      .maybeSingle(),
    db
      .from('chef_twilio_credentials')
      .select('phone_number, account_sid, is_active')
      .eq('chef_id', input.chefId)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const mailboxes: ManagedMailboxHealth[] = (mailboxesResult.data || []).map((mailbox: any) => ({
    id: String(mailbox.id),
    address: String(mailbox.normalized_email || mailbox.email || '')
      .trim()
      .toLowerCase(),
    isPrimary: mailbox.is_primary === true,
    isActive: mailbox.is_active !== false,
    gmailConnected: mailbox.gmail_connected === true,
    lastSyncAt: mailbox.gmail_last_sync_at || null,
    syncErrors: Number(mailbox.gmail_sync_errors || 0),
    historicalScanEnabled: mailbox.historical_scan_enabled === true,
    historicalScanStatus: String(mailbox.historical_scan_status || 'idle'),
  }))

  return buildManagedCommunicationControlPlaneSummary({
    inboundEmailAlias: {
      alias: inboundEmailAlias.alias,
      address: inboundEmailAlias.address,
    },
    mailboxes,
    legacyConnection: legacyConnectionResult.data
      ? {
          address:
            normalizeManagedEmailAddress(legacyConnectionResult.data.connected_email) || null,
          gmailConnected: legacyConnectionResult.data.gmail_connected === true,
          lastSyncAt: legacyConnectionResult.data.gmail_last_sync_at || null,
          syncErrors: Number(legacyConnectionResult.data.gmail_sync_errors || 0),
        }
      : null,
    twilio: {
      connected: twilioResult.data?.is_active === true,
      phoneNumber: twilioResult.data?.phone_number || null,
      accountSid: twilioResult.data?.account_sid || null,
    },
  })
}

export async function sendManagedTwilioMessage(input: {
  tenantId: string
  channel: 'sms' | 'whatsapp'
  to: string
  body: string
  statusCallbackUrl?: string | null
  repository?: ManagedChannelRepository
  fetchImpl?: typeof fetch
}): Promise<{
  success: boolean
  provider: 'twilio'
  providerMessageId?: string
  managedAddress?: string
  providerStatus?: string | null
  error?: string
}> {
  const repository = input.repository || managedChannelRepository
  const fetchImpl = input.fetchImpl || fetch

  const channel = await getManagedOutboundChannel(
    { tenantId: input.tenantId, channel: input.channel },
    repository
  )

  if (!channel?.accountSid || !channel.authToken) {
    return {
      success: false,
      provider: 'twilio',
      error: 'No active managed Twilio channel is configured for this tenant.',
    }
  }

  const normalizedTo = normalizeManagedPhoneAddress(input.to)
  if (!normalizedTo) {
    return {
      success: false,
      provider: 'twilio',
      error: 'Recipient phone number must be valid E.164.',
    }
  }

  const twilioTo = input.channel === 'whatsapp' ? `whatsapp:${normalizedTo}` : normalizedTo
  const twilioFrom =
    input.channel === 'whatsapp'
      ? `whatsapp:${channel.managedAddress}`
      : String(channel.managedAddress || '')
  const statusCallbackUrl = input.statusCallbackUrl || getTwilioStatusCallbackUrl()

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${channel.accountSid}/Messages.json`
    const auth = Buffer.from(`${channel.accountSid}:${channel.authToken}`).toString('base64')

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: twilioTo,
        From: twilioFrom,
        Body: input.body,
        StatusCallback: statusCallbackUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        success: false,
        provider: 'twilio',
        managedAddress: channel.managedAddress,
        error: payload?.message || `Twilio error: ${response.status}`,
      }
    }

    return {
      success: true,
      provider: 'twilio',
      providerMessageId: payload?.sid,
      managedAddress: channel.managedAddress,
      providerStatus: typeof payload?.status === 'string' ? payload.status : null,
    }
  } catch (error) {
    return {
      success: false,
      provider: 'twilio',
      managedAddress: channel.managedAddress,
      error: error instanceof Error ? error.message : 'Twilio send failed',
    }
  }
}
