'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { encryptOAuthToken, decryptOAuthToken } from '@/lib/integrations/core/token-crypto'

// Square OAuth 2.0 + Payments API client.
// For in-person payment processing at events via Square Terminal/Reader.
// Uses integration_connections table for token storage.
// Tokens encrypted at rest via AES-256-GCM (see token-crypto.ts).

const SQ_AUTH_URL = 'https://connect.squareup.com/oauth2/authorize'
const SQ_TOKEN_URL = 'https://connect.squareup.com/oauth2/token'
const SQ_API_BASE = 'https://connect.squareup.com/v2'
const SQ_SANDBOX_AUTH_URL = 'https://connect.squareupsandbox.com/oauth2/authorize'
const SQ_SANDBOX_TOKEN_URL = 'https://connect.squareupsandbox.com/oauth2/token'
const SQ_SANDBOX_API_BASE = 'https://connect.squareupsandbox.com/v2'

function isSandbox() {
  return process.env.SQUARE_SANDBOX === 'true'
}

function getClientId() {
  const id = process.env.SQUARE_APPLICATION_ID
  if (!id) throw new Error('SQUARE_APPLICATION_ID is not configured')
  return id
}

function getClientSecret() {
  const secret = process.env.SQUARE_APPLICATION_SECRET
  if (!secret) throw new Error('SQUARE_APPLICATION_SECRET is not configured')
  return secret
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
  return `${base}/api/integrations/square/callback`
}

function getAuthUrl() {
  return isSandbox() ? SQ_SANDBOX_AUTH_URL : SQ_AUTH_URL
}

function getTokenUrl() {
  return isSandbox() ? SQ_SANDBOX_TOKEN_URL : SQ_TOKEN_URL
}

function getApiBase() {
  return isSandbox() ? SQ_SANDBOX_API_BASE : SQ_API_BASE
}

export async function initiateSquareConnect(): Promise<{ redirectUrl: string }> {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  const state = crypto.randomUUID()

  await supabase.from('social_oauth_states').insert({
    id: crypto.randomUUID(),
    tenant_id: user.entityId,
    platform: 'square',
    state,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  const params = new URLSearchParams({
    client_id: getClientId(),
    scope: 'PAYMENTS_WRITE PAYMENTS_READ ORDERS_WRITE ORDERS_READ MERCHANT_PROFILE_READ ITEMS_READ',
    session: 'false',
    state,
  })

  return { redirectUrl: `${getAuthUrl()}?${params.toString()}` }
}

export async function exchangeSquareCode(code: string, tenantId: string): Promise<void> {
  const response = await fetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Square token exchange failed: ${error}`)
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: string
    merchant_id: string
  }

  // Fetch merchant info
  const merchantRes = await fetch(`${getApiBase()}/merchants/${tokens.merchant_id}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Square-Version': '2024-01-18',
    },
  })

  let merchantName = `Square Merchant ${tokens.merchant_id}`
  if (merchantRes.ok) {
    const merchant = (await merchantRes.json()) as {
      merchant: { id: string; business_name: string }
    }
    merchantName = merchant.merchant?.business_name || merchantName
  }

  const supabase: any = createServerClient({ admin: true })

  await supabase.from('integration_connections').upsert(
    {
      id: crypto.randomUUID(),
      chef_id: tenantId,
      tenant_id: tenantId,
      provider: 'square',
      auth_type: 'oauth2',
      status: 'connected',
      external_account_id: tokens.merchant_id,
      external_account_name: merchantName,
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: tokens.expires_at,
      config: { merchant_id: tokens.merchant_id },
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,provider' }
  )
}

async function refreshSquareToken(tenantId: string): Promise<string> {
  const supabase: any = createServerClient({ admin: true })

  const { data: conn } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'square')
    .eq('status', 'connected')
    .single()

  if (!conn?.refresh_token) throw new Error('Square not connected')

  // Check if token is still valid (1-day buffer — Square tokens last 30 days)
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime()
    if (Date.now() < expiresAt - 24 * 60 * 60 * 1000) {
      return decryptOAuthToken(conn.access_token)
    }
  }

  const decryptedRefreshToken = decryptOAuthToken(conn.refresh_token)

  const response = await fetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    await supabase
      .from('integration_connections')
      .update({ status: 'reauth_required', last_error: 'Token refresh failed' })
      .eq('tenant_id', tenantId)
      .eq('provider', 'square')
    throw new Error('Square token refresh failed')
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: string
  }

  await supabase
    .from('integration_connections')
    .update({
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: tokens.expires_at,
      error_count: 0,
      last_error: null,
    })
    .eq('tenant_id', tenantId)
    .eq('provider', 'square')

  return tokens.access_token // Return plaintext for immediate use
}

// Create a payment link for in-person or online collection
export async function createSquarePaymentLink(
  tenantId: string,
  input: {
    amountCents: number
    description: string
    eventId?: string
    clientId?: string
  }
) {
  const supabase: any = createServerClient({ admin: true })
  const { data: conn } = await supabase
    .from('integration_connections')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'square')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('Square not connected')

  const accessToken = await refreshSquareToken(tenantId)

  const response = await fetch(`${getApiBase()}/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name: input.description,
        price_money: {
          amount: input.amountCents,
          currency: 'USD',
        },
        location_id: 'main', // Will use default location
      },
      payment_note: [
        input.eventId ? `Event: ${input.eventId}` : '',
        input.clientId ? `Client: ${input.clientId}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Square payment link failed: ${error}`)
  }

  const result = (await response.json()) as {
    payment_link: { url: string; id: string; order_id: string }
  }

  return {
    url: result.payment_link.url,
    linkId: result.payment_link.id,
    orderId: result.payment_link.order_id,
  }
}

export async function getSquareConnectionStatus(tenantId: string) {
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('integration_connections')
    .select('status, external_account_name, connected_at, last_sync_at, last_error, config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'square')
    .single()

  if (!data) return { connected: false }

  return {
    connected: data.status === 'connected',
    status: data.status,
    merchantName: data.external_account_name,
    merchantId: (data.config as Record<string, unknown>)?.merchant_id,
    connectedAt: data.connected_at,
    lastError: data.last_error,
  }
}

export async function disconnectSquare() {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  // Revoke token with Square
  const { data: conn } = await supabase
    .from('integration_connections')
    .select('access_token')
    .eq('tenant_id', user.entityId)
    .eq('provider', 'square')
    .single()

  if (conn?.access_token) {
    try {
      await fetch(`${getApiBase()}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify({
          client_id: getClientId(),
          access_token: decryptOAuthToken(conn.access_token),
        }),
      })
    } catch {
      // Non-blocking — continue with disconnect even if revocation fails
    }
  }

  await supabase
    .from('integration_connections')
    .update({ status: 'disconnected' })
    .eq('tenant_id', user.entityId)
    .eq('provider', 'square')

  return { success: true }
}
