'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { encryptOAuthToken, decryptOAuthToken } from '@/lib/integrations/core/token-crypto'

// QuickBooks Online OAuth 2.0 + REST API client.
// Uses integration_connections table for token storage.
// Tokens encrypted at rest via AES-256-GCM (see token-crypto.ts).

const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3'
const QB_SANDBOX_API_BASE = 'https://sandbox-quickbooks.api.intuit.com/v3'

function getClientId() {
  const id = process.env.QUICKBOOKS_CLIENT_ID
  if (!id) throw new Error('QUICKBOOKS_CLIENT_ID is not configured')
  return id
}

function getClientSecret() {
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET
  if (!secret) throw new Error('QUICKBOOKS_CLIENT_SECRET is not configured')
  return secret
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  return `${base}/api/integrations/quickbooks/callback`
}

function getApiBase() {
  return process.env.QUICKBOOKS_SANDBOX === 'true' ? QB_SANDBOX_API_BASE : QB_API_BASE
}

export async function initiateQuickBooksConnect(): Promise<{ redirectUrl: string }> {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  // Generate CSRF state
  const state = crypto.randomUUID()

  // Store state temporarily
  await supabase.from('social_oauth_states').insert({
    id: crypto.randomUUID(),
    tenant_id: user.entityId,
    platform: 'quickbooks',
    state,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })

  return { redirectUrl: `${QB_AUTH_URL}?${params.toString()}` }
}

export async function exchangeQuickBooksCode(
  code: string,
  realmId: string,
  tenantId: string
): Promise<void> {
  const basicAuth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')

  const response = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks token exchange failed: ${error}`)
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const supabase: any = createServerClient({ admin: true })

  // Upsert connection (tokens encrypted at rest)
  await supabase.from('integration_connections').upsert(
    {
      id: crypto.randomUUID(),
      chef_id: tenantId,
      tenant_id: tenantId,
      provider: 'quickbooks',
      auth_type: 'oauth2',
      status: 'connected',
      external_account_id: realmId,
      external_account_name: `QuickBooks Company ${realmId}`,
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      config: { realm_id: realmId },
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,provider' }
  )
}

async function refreshQuickBooksToken(tenantId: string): Promise<string> {
  const supabase: any = createServerClient({ admin: true })

  const { data: conn } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'quickbooks')
    .eq('status', 'connected')
    .single()

  if (!conn?.refresh_token) {
    throw new Error('QuickBooks not connected or missing refresh token')
  }

  // Check if token is still valid (5-min buffer)
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime()
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return decryptOAuthToken(conn.access_token)
    }
  }

  const decryptedRefreshToken = decryptOAuthToken(conn.refresh_token)
  const basicAuth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')

  const response = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
    }),
  })

  if (!response.ok) {
    // Mark connection as needing reauth
    await supabase
      .from('integration_connections')
      .update({ status: 'reauth_required', last_error: 'Token refresh failed' })
      .eq('tenant_id', tenantId)
      .eq('provider', 'quickbooks')

    throw new Error('QuickBooks token refresh failed — reconnection required')
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  await supabase
    .from('integration_connections')
    .update({
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      error_count: 0,
      last_error: null,
    })
    .eq('tenant_id', tenantId)
    .eq('provider', 'quickbooks')

  return tokens.access_token // Return plaintext for immediate use
}

async function qbApiCall(
  tenantId: string,
  realmId: string,
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
) {
  const accessToken = await refreshQuickBooksToken(tenantId)
  const apiBase = getApiBase()

  const response = await fetch(`${apiBase}/company/${realmId}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks API error (${response.status}): ${error}`)
  }

  return response.json()
}

// ── Sync functions ──

export async function syncInvoiceToQuickBooks(
  tenantId: string,
  invoiceData: {
    clientName: string
    clientEmail: string
    lineItems: Array<{ description: string; amountCents: number; quantity: number }>
    dueDate?: string
  }
) {
  const supabase: any = createServerClient({ admin: true })
  const { data: conn } = await supabase
    .from('integration_connections')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'quickbooks')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('QuickBooks not connected')
  const realmId = (conn.config as Record<string, unknown>)?.realm_id as string
  if (!realmId) throw new Error('QuickBooks realm ID missing')

  // Create or find customer
  const customerResult = await qbApiCall(
    tenantId,
    realmId,
    `/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE PrimaryEmailAddr = '${invoiceData.clientEmail}'`)}`
  )

  let customerId: string
  const customers = (customerResult as any)?.QueryResponse?.Customer
  if (customers && customers.length > 0) {
    customerId = customers[0].Id
  } else {
    const newCustomer = await qbApiCall(tenantId, realmId, '/customer', {
      method: 'POST',
      body: {
        DisplayName: invoiceData.clientName,
        PrimaryEmailAddr: { Address: invoiceData.clientEmail },
      },
    })
    customerId = (newCustomer as any).Customer.Id
  }

  // Create invoice
  const invoice = await qbApiCall(tenantId, realmId, '/invoice', {
    method: 'POST',
    body: {
      CustomerRef: { value: customerId },
      DueDate: invoiceData.dueDate || undefined,
      Line: invoiceData.lineItems.map((item) => ({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amountCents / 100,
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.amountCents / 100 / item.quantity,
        },
      })),
    },
  })

  return invoice
}

export async function syncExpenseToQuickBooks(
  tenantId: string,
  expenseData: {
    vendorName: string
    amountCents: number
    description: string
    date: string
    category?: string
  }
) {
  const supabase: any = createServerClient({ admin: true })
  const { data: conn } = await supabase
    .from('integration_connections')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'quickbooks')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('QuickBooks not connected')
  const realmId = (conn.config as Record<string, unknown>)?.realm_id as string
  if (!realmId) throw new Error('QuickBooks realm ID missing')

  // Find or create vendor
  const vendorResult = await qbApiCall(
    tenantId,
    realmId,
    `/query?query=${encodeURIComponent(`SELECT * FROM Vendor WHERE DisplayName = '${expenseData.vendorName.replace(/'/g, "\\'")}'`)}`
  )

  let vendorId: string
  const vendors = (vendorResult as any)?.QueryResponse?.Vendor
  if (vendors && vendors.length > 0) {
    vendorId = vendors[0].Id
  } else {
    const newVendor = await qbApiCall(tenantId, realmId, '/vendor', {
      method: 'POST',
      body: { DisplayName: expenseData.vendorName },
    })
    vendorId = (newVendor as any).Vendor.Id
  }

  // Create purchase (expense)
  const purchase = await qbApiCall(tenantId, realmId, '/purchase', {
    method: 'POST',
    body: {
      PaymentType: 'Cash',
      TxnDate: expenseData.date,
      EntityRef: { value: vendorId, type: 'Vendor' },
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: expenseData.amountCents / 100,
          Description: expenseData.description,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: '1' }, // Default expense account
          },
        },
      ],
    },
  })

  return purchase
}

export async function getQuickBooksConnectionStatus(tenantId: string) {
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('integration_connections')
    .select('status, external_account_name, connected_at, last_sync_at, last_error, config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'quickbooks')
    .single()

  if (!data) return { connected: false }

  return {
    connected: data.status === 'connected',
    status: data.status,
    companyName: data.external_account_name,
    realmId: (data.config as Record<string, unknown>)?.realm_id,
    connectedAt: data.connected_at,
    lastSyncAt: data.last_sync_at,
    lastError: data.last_error,
  }
}

export async function disconnectQuickBooks() {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })

  await supabase
    .from('integration_connections')
    .update({ status: 'disconnected' })
    .eq('tenant_id', user.entityId)
    .eq('provider', 'quickbooks')

  return { success: true }
}
