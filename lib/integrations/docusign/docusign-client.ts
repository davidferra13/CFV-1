'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { encryptOAuthToken, decryptOAuthToken } from '@/lib/integrations/core/token-crypto'

// DocuSign OAuth 2.0 + eSignature REST API client.
// Uses integration_connections table for token storage.
// Tokens encrypted at rest via AES-256-GCM (see token-crypto.ts).

const DS_AUTH_URL = 'https://account-d.docusign.com/oauth/auth' // demo; prod: account.docusign.com
const DS_TOKEN_URL = 'https://account-d.docusign.com/oauth/token'
const DS_API_BASE = 'https://demo.docusign.net/restapi/v2.1' // demo; prod: varies per account

function getClientId() {
  const id = process.env.DOCUSIGN_CLIENT_ID
  if (!id) throw new Error('DOCUSIGN_CLIENT_ID is not configured')
  return id
}

function getClientSecret() {
  const secret = process.env.DOCUSIGN_CLIENT_SECRET
  if (!secret) throw new Error('DOCUSIGN_CLIENT_SECRET is not configured')
  return secret
}

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  return `${base}/api/integrations/docusign/callback`
}

function getApiBase() {
  return process.env.DOCUSIGN_API_BASE || DS_API_BASE
}

export async function initiateDocuSignConnect(): Promise<{ redirectUrl: string }> {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const state = crypto.randomUUID()

  await db.from('social_oauth_states').insert({
    id: crypto.randomUUID(),
    tenant_id: user.entityId,
    platform: 'docusign',
    state,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  const authUrl = process.env.DOCUSIGN_AUTH_URL || DS_AUTH_URL
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'signature',
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    state,
  })

  return { redirectUrl: `${authUrl}?${params.toString()}` }
}

export async function exchangeDocuSignCode(code: string, tenantId: string): Promise<void> {
  const basicAuth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')

  const response = await fetch(DS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DocuSign token exchange failed: ${error}`)
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Fetch user info to get account ID
  const userInfoRes = await fetch('https://account-d.docusign.com/oauth/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = (await userInfoRes.json()) as {
    accounts: Array<{
      account_id: string
      account_name: string
      base_uri: string
      is_default: boolean
    }>
    name: string
    email: string
  }

  const defaultAccount = userInfo.accounts.find((a) => a.is_default) || userInfo.accounts[0]
  if (!defaultAccount) throw new Error('No DocuSign account found')

  const db: any = createServerClient({ admin: true })

  await db.from('integration_connections').upsert(
    {
      id: crypto.randomUUID(),
      chef_id: tenantId,
      tenant_id: tenantId,
      provider: 'docusign',
      auth_type: 'oauth2',
      status: 'connected',
      external_account_id: defaultAccount.account_id,
      external_account_name: defaultAccount.account_name,
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      config: {
        account_id: defaultAccount.account_id,
        base_uri: defaultAccount.base_uri,
        user_name: userInfo.name,
        user_email: userInfo.email,
      },
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,provider' }
  )
}

async function refreshDocuSignToken(tenantId: string): Promise<string> {
  const db: any = createServerClient({ admin: true })

  const { data: conn } = await db
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'docusign')
    .eq('status', 'connected')
    .single()

  if (!conn?.refresh_token) throw new Error('DocuSign not connected')

  // Check if token is still valid
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime()
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return decryptOAuthToken(conn.access_token)
    }
  }

  const decryptedRefreshToken = decryptOAuthToken(conn.refresh_token)
  const basicAuth = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')

  const response = await fetch(DS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
    }),
  })

  if (!response.ok) {
    await db
      .from('integration_connections')
      .update({ status: 'reauth_required', last_error: 'Token refresh failed' })
      .eq('tenant_id', tenantId)
      .eq('provider', 'docusign')
    throw new Error('DocuSign token refresh failed')
  }

  const tokens = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  await db
    .from('integration_connections')
    .update({
      access_token: encryptOAuthToken(tokens.access_token),
      refresh_token: encryptOAuthToken(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      error_count: 0,
      last_error: null,
    })
    .eq('tenant_id', tenantId)
    .eq('provider', 'docusign')

  return tokens.access_token // Return plaintext for immediate use
}

export async function sendContractForSignature(
  tenantId: string,
  contractData: {
    contractId: string
    signerName: string
    signerEmail: string
    documentBase64: string
    documentName: string
    emailSubject?: string
    emailBody?: string
  }
) {
  const db: any = createServerClient({ admin: true })

  const { data: conn } = await db
    .from('integration_connections')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'docusign')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('DocuSign not connected')
  const config = conn.config as Record<string, unknown>
  const accountId = config.account_id as string
  const baseUri = (config.base_uri as string) || getApiBase()

  const accessToken = await refreshDocuSignToken(tenantId)

  // Create envelope with document
  const envelopeResponse = await fetch(`${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailSubject: contractData.emailSubject || 'Please sign your contract - ChefFlow',
      emailBlurb: contractData.emailBody || 'Please review and sign the attached contract.',
      documents: [
        {
          documentBase64: contractData.documentBase64,
          name: contractData.documentName,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: contractData.signerEmail,
            name: contractData.signerName,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '1',
                  anchorString: '/sig/',
                  anchorUnits: 'pixels',
                  anchorYOffset: '-10',
                },
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  pageNumber: '1',
                  anchorString: '/date/',
                  anchorUnits: 'pixels',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    }),
  })

  if (!envelopeResponse.ok) {
    const error = await envelopeResponse.text()
    throw new Error(`DocuSign envelope creation failed: ${error}`)
  }

  const envelope = (await envelopeResponse.json()) as {
    envelopeId: string
    status: string
  }

  // Update contract record with DocuSign envelope info
  await db
    .from('contracts' as any)
    .update({
      docusign_envelope_id: envelope.envelopeId,
      docusign_status: envelope.status,
      docusign_sent_at: new Date().toISOString(),
    })
    .eq('id', contractData.contractId)
    .eq('tenant_id', tenantId)

  return { envelopeId: envelope.envelopeId, status: envelope.status }
}

export async function getEnvelopeStatus(tenantId: string, envelopeId: string) {
  const db: any = createServerClient({ admin: true })

  const { data: conn } = await db
    .from('integration_connections')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'docusign')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('DocuSign not connected')
  const config = conn.config as Record<string, unknown>
  const accountId = config.account_id as string
  const baseUri = (config.base_uri as string) || getApiBase()

  const accessToken = await refreshDocuSignToken(tenantId)

  const response = await fetch(
    `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) throw new Error(`DocuSign status check failed: ${response.status}`)

  return response.json() as Promise<{ status: string; statusChangedDateTime: string }>
}

export async function getDocuSignConnectionStatus(tenantId: string) {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('integration_connections')
    .select('status, external_account_name, connected_at, last_error, config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'docusign')
    .single()

  if (!data) return { connected: false }

  return {
    connected: data.status === 'connected',
    status: data.status,
    accountName: data.external_account_name,
    userName: (data.config as Record<string, unknown>)?.user_name,
    connectedAt: data.connected_at,
    lastError: data.last_error,
  }
}

export async function disconnectDocuSign() {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  await db
    .from('integration_connections')
    .update({ status: 'disconnected' })
    .eq('tenant_id', user.entityId)
    .eq('provider', 'docusign')

  return { success: true }
}
