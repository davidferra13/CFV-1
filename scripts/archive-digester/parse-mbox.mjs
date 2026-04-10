/**
 * MBOX Parser
 *
 * Reads the Dinner Email Export.mbox and outputs structured JSON.
 * Each entry = one email with: id, date, from, to, subject, body, inReplyTo, messageId.
 *
 * Usage: node scripts/archive-digester/parse-mbox.mjs
 * Output: scripts/archive-digester/parsed-emails.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MBOX_PATH =
  process.env.MBOX_PATH ||
  'C:/Users/david/Documents/EmailGOLDMINE2/Takeout/Mail/Dinner Email Export.mbox'

const OUT_PATH = path.join(__dirname, 'parsed-emails.json')

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function decodeBase64(str) {
  try {
    return Buffer.from(str.replace(/\s/g, ''), 'base64').toString('utf8')
  } catch {
    return str
  }
}

function decodeEncodedWord(str) {
  if (!str) return ''
  // RFC 2047: =?charset?encoding?text?=
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, text) => {
    if (enc.toLowerCase() === 'b') return decodeBase64(text)
    if (enc.toLowerCase() === 'q') return decodeQuotedPrintable(text.replace(/_/g, ' '))
    return text
  })
}

function extractBody(rawMessage) {
  const parts = rawMessage.split(/\r?\n\r?\n/)
  if (parts.length < 2) return ''

  const headerBlock = parts[0]
  const bodyParts = parts.slice(1).join('\n\n')

  // Find Content-Transfer-Encoding
  const cteMatch = headerBlock.match(/Content-Transfer-Encoding:\s*(\S+)/i)
  const cte = cteMatch ? cteMatch[1].toLowerCase() : 'none'

  // Find Content-Type for boundary extraction
  const contentTypeMatch = headerBlock.match(/Content-Type:\s*([^\r\n;]+)/i)
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : ''

  if (contentType.includes('multipart')) {
    const boundaryMatch = headerBlock.match(/boundary="?([^"\r\n;]+)"?/i)
    if (boundaryMatch) {
      const boundary = boundaryMatch[1].trim()
      const sections = bodyParts.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'))
      for (const section of sections) {
        if (section.includes('Content-Type: text/plain') || section.toLowerCase().includes('content-type: text/plain')) {
          const sectionParts = section.split(/\r?\n\r?\n/).slice(1).join('\n\n')
          const sectionCte = section.match(/Content-Transfer-Encoding:\s*(\S+)/i)
          if (sectionCte?.[1]?.toLowerCase() === 'base64') return decodeBase64(sectionParts)
          if (sectionCte?.[1]?.toLowerCase() === 'quoted-printable') return decodeQuotedPrintable(sectionParts)
          return sectionParts.trim()
        }
      }
    }
  }

  if (cte === 'base64') return decodeBase64(bodyParts)
  if (cte === 'quoted-printable') return decodeQuotedPrintable(bodyParts)
  return bodyParts
}

function parseHeaders(headerBlock) {
  const headers = {}
  // Unfold headers (lines starting with whitespace are continuations)
  const unfolded = headerBlock.replace(/\r?\n([ \t])/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':')
    if (colonIdx < 1) continue
    const key = line.slice(0, colonIdx).trim().toLowerCase()
    const value = line.slice(colonIdx + 1).trim()
    if (!headers[key]) headers[key] = value
  }
  return headers
}

function cleanBody(body) {
  if (!body) return ''
  return body
    .replace(/<[^>]+>/g, ' ')       // strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')     // collapse multiple blank lines
    .trim()
    .slice(0, 3000)                  // cap length
}

function parseAddress(addr) {
  if (!addr) return { name: '', email: '' }
  addr = decodeEncodedWord(addr)
  const match = addr.match(/^"?([^"<]*)"?\s*<?([^>@\s]+@[^>]+)>?$/)
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() }
  const emailOnly = addr.match(/([^\s@<>]+@[^\s@<>]+)/)
  if (emailOnly) return { name: '', email: emailOnly[1].toLowerCase() }
  return { name: addr, email: '' }
}

// ----------------------------------------------------------------
// Parse the mbox file
// ----------------------------------------------------------------

console.log('Reading mbox file...')
const raw = fs.readFileSync(MBOX_PATH, 'latin1') // mbox is typically latin1

// Split on "From " envelope lines at the start of each message
const rawMessages = raw.split(/^From [^\n]+\n/m).filter(s => s.trim().length > 0)
console.log(`Found ${rawMessages.length} raw messages`)

const emails = []

for (const rawMsg of rawMessages) {
  const headerEnd = rawMsg.search(/\r?\n\r?\n/)
  if (headerEnd < 0) continue

  const headerBlock = rawMsg.slice(0, headerEnd)
  const headers = parseHeaders(headerBlock)

  const date = headers['date'] ? new Date(headers['date']) : null
  if (date && isNaN(date.getTime())) continue // skip malformed dates

  const from = parseAddress(headers['from'] || '')
  const to = parseAddress(headers['to'] || '')
  const subject = decodeEncodedWord(headers['subject'] || '').trim()
  const messageId = (headers['message-id'] || '').replace(/[<>]/g, '').trim()
  const inReplyTo = (headers['in-reply-to'] || headers['references'] || '').replace(/[<>]/g, '').trim()

  const bodyRaw = rawMsg.slice(headerEnd)
  const body = cleanBody(extractBody(headerBlock + '\n\n' + bodyRaw))

  emails.push({
    messageId: messageId || `gen-${emails.length}`,
    date: date ? date.toISOString() : null,
    from,
    to,
    subject,
    body,
    inReplyTo: inReplyTo || null,
    isFromChef: from.email.includes('dfprivatechef') || from.email.includes('davidferra13'),
  })
}

// Sort by date
emails.sort((a, b) => {
  if (!a.date) return 1
  if (!b.date) return -1
  return new Date(a.date) - new Date(b.date)
})

console.log(`Parsed ${emails.length} emails`)
console.log(`Date range: ${emails[0]?.date?.slice(0, 10)} to ${emails[emails.length - 1]?.date?.slice(0, 10)}`)
console.log(`From chef: ${emails.filter(e => e.isFromChef).length}`)
console.log(`From clients: ${emails.filter(e => !e.isFromChef).length}`)

// Group into threads by subject (normalize)
const threads = {}
for (const email of emails) {
  const normalSubject = email.subject.replace(/^(re:|fwd?:)\s*/i, '').trim().toLowerCase()
  const key = normalSubject || email.from.email
  if (!threads[key]) threads[key] = []
  threads[key].push(email)
}
console.log(`Grouped into ${Object.keys(threads).length} threads`)

fs.writeFileSync(OUT_PATH, JSON.stringify({ emails, threads }, null, 2))
console.log(`Written to ${OUT_PATH}`)
