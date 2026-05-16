import type {
  BusinessHistoryFinding,
  BusinessHistoryFindingCategory,
  BusinessHistorySummary,
  DuplicateHint,
  ExistingClientHint,
  ExistingEventHint,
} from './types'
import { getProposedDestinationForCategory } from './gmail-recovery'

export function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9@.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

function nameTokens(value: string | null | undefined): string[] {
  return normalizeComparableText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !token.includes('@'))
}

export function findDuplicateHints(
  finding: Pick<
    BusinessHistoryFinding,
    'id' | 'fromAddress' | 'summary' | 'subject' | 'receivedAt'
  >,
  clients: ExistingClientHint[],
  events: ExistingEventHint[],
  staged: Array<Pick<BusinessHistoryFinding, 'id' | 'fromAddress' | 'summary' | 'subject'>>
): DuplicateHint[] {
  const hints: DuplicateHint[] = []
  const findingEmail = extractEmail(finding.fromAddress)
  const findingText = normalizeComparableText(`${finding.subject ?? ''} ${finding.summary}`)
  const tokens = nameTokens(findingText)

  for (const client of clients) {
    const clientEmail = extractEmail(client.email)
    if (findingEmail && clientEmail && findingEmail === clientEmail) {
      hints.push({
        entityType: 'client',
        entityId: client.id,
        label: client.fullName || client.email || 'Existing client',
        reason: 'Sender email matches an existing client',
        strength: 'exact',
      })
      continue
    }

    const clientTokens = nameTokens(client.fullName)
    if (clientTokens.length > 0 && clientTokens.some((token) => tokens.includes(token))) {
      hints.push({
        entityType: 'client',
        entityId: client.id,
        label: client.fullName || 'Existing client',
        reason: 'Name appears in the staged finding',
        strength: 'weak',
      })
    }
  }

  for (const event of events) {
    const eventText = normalizeComparableText(`${event.occasion ?? ''} ${event.clientName ?? ''}`)
    const sameDate =
      Boolean(finding.receivedAt && event.eventDate) &&
      String(finding.receivedAt).slice(0, 10) === String(event.eventDate).slice(0, 10)
    if (sameDate || (eventText && findingText.includes(eventText))) {
      hints.push({
        entityType: 'event',
        entityId: event.id,
        label: [event.occasion, event.clientName].filter(Boolean).join(' - ') || 'Existing event',
        reason: sameDate ? 'Email date matches an existing event date' : 'Event text overlaps',
        strength: sameDate ? 'strong' : 'weak',
      })
    }
  }

  for (const other of staged) {
    if (other.id === finding.id) continue
    const otherEmail = extractEmail(other.fromAddress)
    const otherText = normalizeComparableText(`${other.subject ?? ''} ${other.summary}`)
    if ((findingEmail && otherEmail && findingEmail === otherEmail) || otherText === findingText) {
      hints.push({
        entityType: 'finding',
        entityId: other.id,
        label: other.subject || other.fromAddress || 'Similar staged finding',
        reason: findingEmail === otherEmail ? 'Same sender in staged queue' : 'Same staged text',
        strength: findingEmail === otherEmail ? 'strong' : 'exact',
      })
    }
  }

  return hints.slice(0, 5)
}

export function mapGmailFindingRow(row: any): BusinessHistoryFinding {
  const category = (row.classification || 'inquiry') as BusinessHistoryFindingCategory
  return {
    id: row.id,
    source: 'gmail',
    sourceLabel: 'Gmail history',
    sourceUrl: row.gmail_message_id
      ? `https://mail.google.com/mail/u/0/#inbox/${row.gmail_message_id}`
      : null,
    category,
    proposedDestination: getProposedDestinationForCategory(category),
    confidence: row.confidence || 'low',
    status: row.status || 'pending',
    summary: row.subject || row.ai_reasoning || row.body_preview || 'Untitled email finding',
    detail: row.body_preview || null,
    fromAddress: row.from_address || null,
    subject: row.subject || null,
    receivedAt: row.received_at || null,
    reviewedAt: row.reviewed_at || null,
    importedInquiryId: row.imported_inquiry_id || null,
    duplicateHints: [],
  }
}

export function buildUnifiedReviewQueue(input: {
  gmailRows: any[]
  existingClients: ExistingClientHint[]
  existingEvents: ExistingEventHint[]
}): BusinessHistoryFinding[] {
  const findings = input.gmailRows.map(mapGmailFindingRow)
  return findings.map((finding) => ({
    ...finding,
    duplicateHints: findDuplicateHints(
      finding,
      input.existingClients,
      input.existingEvents,
      findings
    ),
  }))
}

export function buildBusinessHistorySummary(input: {
  findings: Array<Pick<BusinessHistoryFinding, 'category' | 'status'>>
  canonicalCounts: BusinessHistorySummary['counts']
  scan: BusinessHistorySummary['scan']
  importLogCount: number
}): BusinessHistorySummary {
  const byCategoryMap = new Map<string, { pending: number; imported: number; dismissed: number }>()
  for (const finding of input.findings) {
    const entry = byCategoryMap.get(finding.category) ?? {
      pending: 0,
      imported: 0,
      dismissed: 0,
    }
    if (finding.status === 'pending') entry.pending += 1
    if (finding.status === 'imported') entry.imported += 1
    if (finding.status === 'dismissed') entry.dismissed += 1
    byCategoryMap.set(finding.category, entry)
  }

  const staged = input.findings.filter((finding) => finding.status === 'pending').length
  const nextActions: BusinessHistorySummary['nextActions'] = []
  if (staged > 0) {
    nextActions.push({ label: `Review ${staged} staged records`, href: '#review', tone: 'primary' })
  }
  nextActions.push({ label: 'Import organized files', href: '/import?mode=csv', tone: 'secondary' })
  nextActions.push({
    label: 'Check Gmail recovery',
    href: '/settings/connections',
    tone: 'secondary',
  })

  return {
    counts: {
      ...input.canonicalCounts,
      staged,
      imported: input.findings.filter((finding) => finding.status === 'imported').length,
      dismissed: input.findings.filter((finding) => finding.status === 'dismissed').length,
    },
    byCategory: Array.from(byCategoryMap.entries()).map(([category, counts]) => ({
      category: category as BusinessHistoryFindingCategory,
      ...counts,
    })),
    scan: input.scan,
    importLogCount: input.importLogCount,
    nextActions,
  }
}
