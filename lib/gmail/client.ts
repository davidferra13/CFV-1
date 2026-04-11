// Gmail API Client
// Pure utility functions for interacting with the Gmail API.
// All functions require a valid access token (use getGoogleAccessToken() first).

import type { ParsedEmail } from './types'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

// ─── Scope Error Detection ─────────────────────────────────────────────────

export class GmailScopeError extends Error {
  constructor(method: string) {
    super(
      `Gmail permissions are insufficient for ${method}. ` +
        `Please disconnect and reconnect your Gmail in Settings to grant the required permissions.`
    )
    this.name = 'GmailScopeError'
  }
}

function checkScopeError(status: number, body: string): boolean {
  if (status !== 403) return false
  return (
    body.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || body.includes('insufficientPermissions')
  )
}

// ─── List Messages ──────────────────────────────────────────────────────────

interface ListMessagesOptions {
  maxResults?: number
  query?: string
}

interface GmailMessageRef {
  id: string
  threadId: string
}

export async function listRecentMessages(
  accessToken: string,
  options: ListMessagesOptions = {}
): Promise<GmailMessageRef[]> {
  const { maxResults = 50, query } = options

  const params = new URLSearchParams({
    maxResults: String(maxResults),
  })
  if (query) params.set('q', query)

  const response = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('list messages')
    throw new Error(`Gmail API list messages failed: ${err}`)
  }

  const data = await response.json()
  return data.messages || []
}

// ─── List Messages Page (paginated - for historical scan) ───────────────────

interface ListMessagesPageOptions {
  pageToken?: string
  query?: string
  maxResults?: number
}

interface ListMessagesPageResult {
  messages: GmailMessageRef[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

export async function listMessagesPage(
  accessToken: string,
  options: ListMessagesPageOptions = {}
): Promise<ListMessagesPageResult> {
  const { pageToken, query, maxResults = 100 } = options

  const params = new URLSearchParams({
    maxResults: String(maxResults),
  })
  if (query) params.set('q', query)
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('list messages page')
    throw new Error(`Gmail API list messages page failed: ${err}`)
  }

  const data = await response.json()
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate:
      typeof data.resultSizeEstimate === 'number' ? data.resultSizeEstimate : undefined,
  }
}

// ─── List Messages via History (incremental sync) ───────────────────────────

export async function listMessagesSinceHistory(
  accessToken: string,
  startHistoryId: string,
  maxResults = 100
): Promise<{ messageIds: string[]; latestHistoryId: string }> {
  const params = new URLSearchParams({
    startHistoryId,
    maxResults: String(maxResults),
    historyTypes: 'messageAdded',
  })

  const response = await fetch(`${GMAIL_API}/history?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    // 404 means the historyId is too old - need full resync
    if (response.status === 404) {
      return { messageIds: [], latestHistoryId: '' }
    }
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('history list')
    throw new Error(`Gmail API history list failed: ${err}`)
  }

  const data = await response.json()
  const messageIds: string[] = []

  if (data.history) {
    for (const historyItem of data.history) {
      if (historyItem.messagesAdded) {
        for (const added of historyItem.messagesAdded) {
          messageIds.push(added.message.id)
        }
      }
    }
  }

  return {
    messageIds: [...new Set(messageIds)], // deduplicate
    latestHistoryId: data.historyId || startHistoryId,
  }
}

// ─── Get Full Message ───────────────────────────────────────────────────────

export async function getFullMessage(accessToken: string, messageId: string): Promise<ParsedEmail> {
  const response = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('get message')
    throw new Error(`Gmail API get message failed: ${err}`)
  }

  const message = await response.json()
  const headers = message.payload?.headers || []

  const getHeader = (name: string): string =>
    headers.find(
      (h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase()
    )?.value || ''

  const from = extractSenderInfo(getHeader('From'))
  const body = extractEmailBody(message.payload)

  return {
    messageId: message.id,
    threadId: message.threadId,
    from,
    to: getHeader('To'),
    subject: getHeader('Subject'),
    body,
    date: getHeader('Date'),
    snippet: message.snippet || '',
    labelIds: (message.labelIds as string[]) || [],
    listUnsubscribe: getHeader('List-Unsubscribe'),
    precedence: getHeader('Precedence'),
  }
}

// ─── Get Gmail Profile ──────────────────────────────────────────────────────

export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string; historyId: string }> {
  const response = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('get profile')
    throw new Error(`Gmail API get profile failed: ${err}`)
  }

  const data = await response.json()
  return {
    emailAddress: data.emailAddress,
    historyId: data.historyId,
  }
}

// ─── Extract Email Body ─────────────────────────────────────────────────────

function extractEmailBody(payload: Record<string, unknown>): string {
  if (!payload) return ''

  // Simple body (no parts)
  const body = payload.body as { data?: string; size?: number } | undefined
  if (body?.data) {
    return decodeBase64Url(body.data)
  }

  // Multipart - prefer text/plain, fall back to text/html
  const parts = payload.parts as Array<Record<string, unknown>> | undefined
  if (!parts) return ''

  let textPlain = ''
  let textHtml = ''

  for (const part of parts) {
    const mimeType = part.mimeType as string
    const partBody = part.body as { data?: string } | undefined

    if (mimeType === 'text/plain' && partBody?.data) {
      textPlain = decodeBase64Url(partBody.data)
    } else if (mimeType === 'text/html' && partBody?.data) {
      textHtml = decodeBase64Url(partBody.data)
    }

    // Recursively check nested multipart
    if (part.parts) {
      const nested = extractEmailBody(part as Record<string, unknown>)
      if (nested) {
        if (!textPlain) textPlain = nested
      }
    }
  }

  if (textPlain) return textPlain
  if (textHtml) return stripHtmlTags(textHtml)
  return ''
}

// ─── Extract Sender Info ────────────────────────────────────────────────────

export function extractSenderInfo(fromHeader: string): { name: string; email: string } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const match = fromHeader.match(/^(?:"?(.+?)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?$/)
  if (match) {
    return {
      name: (match[1] || '').trim(),
      email: match[2].toLowerCase(),
    }
  }
  return { name: '', email: fromHeader.toLowerCase().trim() }
}

// ─── Send Email (new compose) ──────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  inReplyTo?: string // Message-ID header for threading
  references?: string // References header for threading
  threadId?: string // Gmail thread ID to keep message in same thread
}

export async function sendEmail(
  accessToken: string,
  options: SendEmailOptions
): Promise<{ messageId: string; threadId: string }> {
  const { to, subject, body, inReplyTo, references, threadId } = options

  // Build RFC 2822 email message
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ]

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`)
  }
  if (references) {
    headers.push(`References: ${references}`)
  }

  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body

  // Gmail API expects URL-safe base64 encoding
  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const requestBody: Record<string, unknown> = { raw: encoded }
  if (threadId) {
    requestBody.threadId = threadId
  }

  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('send email')
    throw new Error(`Gmail API send failed: ${err}`)
  }

  const data = await response.json()
  return {
    messageId: data.id,
    threadId: data.threadId,
  }
}

// ─── Get Message Headers (for reply threading) ────────────────────────────

export async function getMessageHeaders(
  accessToken: string,
  messageId: string
): Promise<{ messageIdHeader: string; subject: string; threadId: string }> {
  const response = await fetch(
    `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    const err = await response.text()
    if (checkScopeError(response.status, err)) throw new GmailScopeError('get headers')
    throw new Error(`Gmail API get headers failed: ${err}`)
  }

  const data = await response.json()
  const headers = data.payload?.headers || []
  const getHeader = (name: string): string =>
    headers.find(
      (h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase()
    )?.value || ''

  return {
    messageIdHeader: getHeader('Message-Id'),
    subject: getHeader('Subject'),
    threadId: data.threadId || '',
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64 (- instead of +, _ instead of /)
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
