/**
 * Shared MBOX parsing utilities.
 *
 * Extracted from build-private-platform-reference.ts so that multiple
 * build scripts (platform reference, GOLDMINE, future datasets) can
 * share the same MIME decoding and record parsing logic.
 */

import { createHash } from 'crypto'
import type { ParsedEmail } from '../../lib/google/types.ts'

// ─── MBOX Splitting ──────────────────────────────────────────────────────

export function splitMbox(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const records: string[] = []
  let buffer: string[] = []

  for (const line of lines) {
    if (line.startsWith('From ') && buffer.length > 0) {
      records.push(buffer.join('\n'))
      buffer = [line]
      continue
    }
    buffer.push(line)
  }

  if (buffer.length > 0) {
    records.push(buffer.join('\n'))
  }

  return records.filter((r) => r.trim().length > 0)
}

// ─── Header Parsing ──────────────────────────────────────────────────────

export function parseHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = headerText.split('\n')
  let currentKey: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, '')
    if (!line) continue

    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ` ${line.trim()}`
      continue
    }

    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    headers[key] = value
    currentKey = key
  }

  return headers
}

// ─── MIME Decoding ───────────────────────────────────────────────────────

export function decodeMimeWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toLowerCase() === 'b') {
        return Buffer.from(data, 'base64').toString(charset)
      }

      // Q-encoding variant used in headers.
      const qp = data
        .replace(/_/g, ' ')
        .replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      return Buffer.from(qp, 'binary').toString(charset)
    } catch {
      return data
    }
  })
}

export function decodeQuotedPrintable(value: string): string {
  const softLineBreaksRemoved = value.replace(/=\r?\n/g, '')
  return softLineBreaksRemoved.replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function decodePartBody(body: string, transferEncoding: string | undefined): string {
  const enc = (transferEncoding || '').toLowerCase()
  if (enc.includes('base64')) {
    try {
      const compact = body.replace(/\s+/g, '')
      return Buffer.from(compact, 'base64').toString('utf-8')
    } catch {
      return body
    }
  }
  if (enc.includes('quoted-printable')) {
    return decodeQuotedPrintable(body)
  }
  return body
}

// ─── MIME Entity Parsing ─────────────────────────────────────────────────

export function parseMimeEntity(raw: string): { headers: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n')
  const splitIndex = normalized.indexOf('\n\n')
  if (splitIndex < 0) {
    return { headers: {}, body: normalized }
  }
  const headerText = normalized.slice(0, splitIndex)
  const body = normalized.slice(splitIndex + 2)
  return { headers: parseHeaders(headerText), body }
}

export function extractBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null
  const match = contentType.match(/boundary="?([^";]+)"?/i)
  return match?.[1] ?? null
}

export function extractTextFromEntity(entity: {
  headers: Record<string, string>
  body: string
}): string {
  const contentType = (entity.headers['content-type'] || 'text/plain').toLowerCase()
  const transfer = entity.headers['content-transfer-encoding']

  if (contentType.startsWith('multipart/')) {
    const boundary = extractBoundary(entity.headers['content-type'])
    if (!boundary) return ''

    const marker = `--${boundary}`
    const endMarker = `--${boundary}--`
    const rawParts = entity.body
      .split(marker)
      .map((p) => p.trim())
      .filter((p) => p && p !== '--' && p !== endMarker.replace(marker, '').trim())

    const parsedParts = rawParts
      .map((part) => part.replace(/^\n+|\n+$/g, ''))
      .filter((part) => !part.startsWith('--'))
      .map((part) => parseMimeEntity(part))

    const inlineParts = parsedParts.filter((p) => {
      const dispo = (p.headers['content-disposition'] || '').toLowerCase()
      return !dispo.includes('attachment')
    })

    const plain = inlineParts.find((p) =>
      (p.headers['content-type'] || '').toLowerCase().startsWith('text/plain')
    )
    if (plain) {
      return extractTextFromEntity(plain)
    }

    const html = inlineParts.find((p) =>
      (p.headers['content-type'] || '').toLowerCase().startsWith('text/html')
    )
    if (html) {
      return stripHtml(extractTextFromEntity(html))
    }

    for (const part of inlineParts) {
      const nested = extractTextFromEntity(part)
      if (nested.trim()) return nested
    }
    return ''
  }

  const decoded = decodePartBody(entity.body, transfer)
  if (contentType.startsWith('text/html')) {
    return stripHtml(decoded)
  }
  return decoded
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Address Parsing ─────────────────────────────────────────────────────

export function parseAddress(rawHeader: string): { name: string; email: string } {
  const decoded = decodeMimeWords(rawHeader || '').trim()
  const emailMatch = decoded.match(/<([^>]+)>/)
  if (emailMatch) {
    const email = emailMatch[1].trim().toLowerCase()
    const name = decoded
      .replace(emailMatch[0], '')
      .replace(/(^"|"$)/g, '')
      .trim()
    return { name, email }
  }

  const bareEmailMatch = decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (bareEmailMatch) {
    const email = bareEmailMatch[0].trim().toLowerCase()
    const name = decoded.replace(email, '').replace(/[()"]/g, '').trim()
    return { name, email }
  }

  return { name: decoded, email: '' }
}

// ─── Full Record Parsing ─────────────────────────────────────────────────

export function parseRecord(recordRaw: string, sourceFile: string): ParsedEmail | null {
  // Strip the mailbox separator line.
  const withoutFromLine = recordRaw.replace(/^From .*\n?/, '')
  const splitIndex = withoutFromLine.indexOf('\n\n')
  if (splitIndex < 0) return null

  const headerText = withoutFromLine.slice(0, splitIndex)
  const rawBody = withoutFromLine.slice(splitIndex + 2)
  const headers = parseHeaders(headerText)
  const rootEntity = {
    headers,
    body: rawBody,
  }

  const from = parseAddress(headers['from'] || '')
  const subject = decodeMimeWords(headers['subject'] || '')
  const textBody = extractTextFromEntity(rootEntity).trim()

  const rawMessageId = (headers['message-id'] || '').trim()
  const messageId =
    rawMessageId.replace(/[<>]/g, '') ||
    createHash('sha1')
      .update(`${sourceFile}:${subject}:${textBody.slice(0, 256)}`)
      .digest('hex')

  const labelIds = (headers['x-gmail-labels'] || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  const threadId = headers['x-gm-thrid'] || messageId

  const snippet = textBody.slice(0, 180)
  return {
    messageId,
    threadId,
    from,
    to: decodeMimeWords(headers['to'] || ''),
    subject,
    body: textBody,
    date: headers['date'] || '',
    snippet,
    labelIds,
    listUnsubscribe: headers['list-unsubscribe'] || '',
    precedence: headers['precedence'] || '',
  }
}

// ─── Analysis Helpers ────────────────────────────────────────────────────

export type FrequencyMap = Map<string, number>

export function increment(map: FrequencyMap, key: string) {
  const k = key.trim()
  if (!k) return
  map.set(k, (map.get(k) ?? 0) + 1)
}

export function topN(map: FrequencyMap, n: number) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

export const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'from',
  'that',
  'this',
  'with',
  'you',
  'your',
  'are',
  'was',
  'were',
  'have',
  'has',
  'had',
  'will',
  'would',
  'there',
  'their',
  'they',
  'them',
  'into',
  'our',
  'out',
  'about',
  'just',
  'can',
  'could',
  'should',
  'a',
  'an',
  'to',
  'in',
  'on',
  'of',
  'at',
  'or',
  'if',
  'is',
  'it',
  'be',
  'as',
  'by',
  'we',
  'us',
  'me',
  'my',
  'i',
  'hi',
  'hello',
  'thanks',
  'thank',
  'regards',
  'best',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
}

export function normalizeSubjectForPattern(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/\b\d+\b/g, '{n}')
    .replace(/\s+/g, ' ')
    .trim()
}
