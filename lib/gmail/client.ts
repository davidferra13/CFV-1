// Gmail API Client
// Pure utility functions for interacting with the Gmail API.
// All functions require a valid access token (use getGoogleAccessToken() first).

import type { ParsedEmail } from './types'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

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
    throw new Error(`Gmail API list messages failed: ${err}`)
  }

  const data = await response.json()
  return data.messages || []
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
    // 404 means the historyId is too old — need full resync
    if (response.status === 404) {
      return { messageIds: [], latestHistoryId: '' }
    }
    const err = await response.text()
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

export async function getFullMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail> {
  const response = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gmail API get message failed: ${err}`)
  }

  const message = await response.json()
  const headers = message.payload?.headers || []

  const getHeader = (name: string): string =>
    headers.find((h: { name: string; value: string }) =>
      h.name.toLowerCase() === name.toLowerCase()
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

  // Multipart — prefer text/plain, fall back to text/html
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
