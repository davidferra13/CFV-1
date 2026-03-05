import { Fragment, type ReactNode } from 'react'

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi

const QUOTED_THREAD_PATTERNS = [
  /\nOn .+?wrote:\n/i,
  /\n-{2,}\s*Original Message\s*-{2,}/i,
  /\nFrom:\s.+\nSent:\s.+\nTo:\s.+\nSubject:\s.+/i,
]

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\uFFFD/g, ''],
  [/’/g, "'"],
  [/‘/g, "'"],
  [/“/g, '"'],
  [/\u00E2\u20AC\u009D/g, '"'],
  [/–/g, '-'],
  [/—/g, '-'],
  [/…/g, '...'],
  [/•/g, '-'],
  [/™/g, '(TM)'],
  [/🆕/g, '[NEW]'],
  [/👇/g, ''],
  [/💰/g, '$'],
  [/🤫/g, ''],
  [/🧑‍🍳/g, 'chef'],
]

function decodeBasicEntities(text: string): string {
  const decoded = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  return decoded.replace(/&#(\d+);/g, (match, code) => {
    const parsed = Number(code)
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : match
  })
}

function normalizeMojibake(text: string): string {
  let out = text
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

export function cleanCommunicationContent(raw: string): string {
  let text = raw || ''
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  text = text.replace(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/gi, '')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1: $2')
  text = text.replace(/<https?:\/\/[^>]+>/gi, (m) => m.slice(1, -1))
  text = text.replace(/<[^>]+>/g, ' ')
  text = decodeBasicEntities(text)
  text = normalizeMojibake(text)
  text = text.replace(/[ \t]+\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function splitQuotedContent(text: string): { main: string; quoted: string | null } {
  let earliestIndex = -1
  for (const pattern of QUOTED_THREAD_PATTERNS) {
    const match = pattern.exec(text)
    if (!match || match.index < 0) continue
    if (earliestIndex === -1 || match.index < earliestIndex) earliestIndex = match.index
  }

  if (earliestIndex <= 0) return { main: text, quoted: null }

  const main = text.slice(0, earliestIndex).trim()
  const quoted = text.slice(earliestIndex).trim()

  // Keep quoted content inline when the "main" body is too short to be useful.
  if (main.length < 20) return { main: text, quoted: null }

  return { main, quoted: quoted || null }
}

function renderLinkifiedText(text: string, linkClassName: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0

  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? -1
    if (start < 0) continue

    const rawUrl = match[0]
    if (start > last) nodes.push(<Fragment key={`t-${key++}`}>{text.slice(last, start)}</Fragment>)

    const cleanUrl = rawUrl.replace(/[),.;!?]+$/g, '')
    const trailing = rawUrl.slice(cleanUrl.length)

    nodes.push(
      <a
        key={`u-${key++}`}
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        {cleanUrl}
      </a>
    )

    if (trailing) nodes.push(<Fragment key={`p-${key++}`}>{trailing}</Fragment>)
    last = start + rawUrl.length
  }

  if (last < text.length) nodes.push(<Fragment key={`t-${key++}`}>{text.slice(last)}</Fragment>)
  return nodes
}

export function getCommunicationPreviewText(raw: string, maxChars = 220): string {
  const cleaned = cleanCommunicationContent(raw)
  const { main } = splitQuotedContent(cleaned)
  const singleLine = main.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= maxChars) return singleLine
  return `${singleLine.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}

export function FormattedCommunicationContent({
  content,
  compact = false,
  className = 'text-sm text-stone-200 whitespace-pre-wrap break-words leading-relaxed',
  linkClassName = 'underline underline-offset-2 text-brand-400 hover:text-brand-300',
  showQuotedToggle = true,
  quotedContainerClassName = 'mt-2 rounded-md border border-stone-700/70 bg-stone-900/70',
  quotedSummaryClassName = 'cursor-pointer select-none px-2 py-1 text-xs text-stone-400 hover:text-stone-300',
  quotedContentClassName = 'px-2 pb-2 text-xs text-stone-400 whitespace-pre-wrap break-words leading-relaxed',
}: {
  content: string
  compact?: boolean
  className?: string
  linkClassName?: string
  showQuotedToggle?: boolean
  quotedContainerClassName?: string
  quotedSummaryClassName?: string
  quotedContentClassName?: string
}) {
  const cleaned = cleanCommunicationContent(content)
  const { main, quoted } = splitQuotedContent(cleaned)
  const body = main || cleaned
  const bodyClass = compact ? `${className} line-clamp-3` : className

  return (
    <div>
      <p className={bodyClass}>{renderLinkifiedText(body, linkClassName)}</p>
      {!compact && showQuotedToggle && quoted ? (
        <details className={quotedContainerClassName}>
          <summary className={quotedSummaryClassName}>Show quoted thread</summary>
          <div className={quotedContentClassName}>{renderLinkifiedText(quoted, linkClassName)}</div>
        </details>
      ) : null}
    </div>
  )
}
