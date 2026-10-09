import type { Sql } from 'postgres'

export interface HistoricalInquirySource {
  gmailMessageId: string
  gmailThreadId: string | null
  mailboxId: string | null
  fromAddress: string
  subject: string | null
  bodyPreview: string | null
  receivedAt: string | Date | null
  classification: string
}

export interface HistoricalInquiryFields {
  firstContactAt: string | Date | null
  confirmedDate?: string | null
  confirmedGuestCount?: number | null
  confirmedLocation?: string | null
  confirmedOccasion?: string | null
  confirmedBudgetCents?: number | null
  confirmedDietaryRestrictions?: string[] | null
  confirmedServiceExpectations?: string | null
}

interface FindingRow {
  id: string
  tenant_id: string
  gmail_message_id: string
  gmail_thread_id: string | null
  mailbox_id: string | null
  from_address: string
  subject: string | null
  body_preview: string | null
  received_at: string | Date | null
  classification: string
  status: string
  imported_inquiry_id: string | null
}

interface InquiryRow {
  id: string
  client_id: string | null
}
interface MessageRow {
  id: string
  inquiry_id: string | null
  body: string
  subject: string | null
  gmail_thread_id: string | null
  sent_at: string | Date | null
}

function sourceInstant(value: string | Date | null): string | null {
  if (value == null) return null
  const instant = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(instant.getTime())) throw new Error('Invalid historical source date')
  return instant.toISOString()
}

function matchesExpectedSource(finding: FindingRow, expected: HistoricalInquirySource): boolean {
  return (
    finding.gmail_message_id === expected.gmailMessageId &&
    finding.gmail_thread_id === expected.gmailThreadId &&
    finding.mailbox_id === expected.mailboxId &&
    finding.from_address === expected.fromAddress &&
    finding.subject === expected.subject &&
    finding.body_preview === expected.bodyPreview &&
    finding.classification === expected.classification &&
    sourceInstant(finding.received_at) === sourceInstant(expected.receivedAt)
  )
}

/**
 * Auth is checked by the calling server action. Each database operation enforces
 * the same tenant, and the finding lock serializes import/retry/dismiss races.
 * No outward messages or payments are sent by this persistence transaction.
 */
export async function persistHistoricalInquiry<TTypes extends Record<string, unknown>>(
  client: Pick<Sql<TTypes>, 'begin'>,
  input: {
    tenantId: string
    findingId: string
    expectedSource: HistoricalInquirySource
    inquiryFields: HistoricalInquiryFields
    clientId?: string | null
    clientLead?: { email: string; fullName?: string | null }
  }
): Promise<{ inquiryId: string }> {
  return client.begin(async (transaction) => {
    // postgres.js TransactionSql uses Omit, which drops its callable overloads.
    // Runtime transactions retain the parameterized SQL tag and value helpers.
    const sql = transaction as unknown as Sql<TTypes>
    const findings = await sql<FindingRow[]>`
      SELECT id, tenant_id, gmail_message_id, gmail_thread_id, mailbox_id, from_address,
        subject, body_preview, received_at, classification, status, imported_inquiry_id
      FROM gmail_historical_findings
      WHERE tenant_id = ${input.tenantId} AND id = ${input.findingId}
      FOR UPDATE
    `
    const finding = findings[0]
    if (!finding) throw new Error('Historical finding not found')
    if (finding.status === 'dismissed') throw new Error('Historical finding was dismissed')
    if (!['inquiry', 'existing_thread'].includes(finding.classification)) {
      throw new Error('This classification cannot be imported as an inquiry')
    }
    if (!['pending', 'imported'].includes(finding.status)) {
      throw new Error('Historical finding has an unsupported review status')
    }
    if (!matchesExpectedSource(finding, input.expectedSource)) {
      throw new Error('Historical source changed while being parsed; reload before importing')
    }
    if (!finding.gmail_message_id.trim()) throw new Error('Historical source message ID is missing')

    const receivedAt = sourceInstant(finding.received_at)
    if (!receivedAt) throw new Error('Historical source date is missing; keep this finding staged')
    if (sourceInstant(input.inquiryFields.firstContactAt) !== receivedAt) {
      throw new Error('Inquiry contact date must match the historical source date')
    }
    if (finding.mailbox_id) {
      const mailboxes = await sql<{ id: string }[]>`
        SELECT id FROM google_mailboxes
        WHERE tenant_id = ${input.tenantId} AND id = ${finding.mailbox_id}
      `
      if (mailboxes.length !== 1) throw new Error('Historical source mailbox is unavailable')
    }

    // Recover old partial imports using the audit marker written by the legacy
    // importer. Never arbitrarily choose one of multiple matching destinations.
    const candidates = await sql<InquiryRow[]>`
      SELECT id, client_id FROM inquiries
      WHERE tenant_id = ${input.tenantId} AND deleted_at IS NULL
        AND unknown_fields->>'imported_from' = 'historical_email_scan'
        AND unknown_fields->>'gmail_message_id' = ${finding.gmail_message_id}
        AND (${finding.mailbox_id}::text IS NULL
          OR unknown_fields->>'gmail_mailbox_id' IS NULL
          OR unknown_fields->>'gmail_mailbox_id' = ${finding.mailbox_id})
      LIMIT 2 FOR UPDATE
    `
    if (candidates.length > 1) throw new Error('Historical inquiry recovery is ambiguous')
    const candidate = candidates[0]
    if (finding.imported_inquiry_id && candidate?.id !== finding.imported_inquiry_id) {
      throw new Error('Historical imported destination could not be verified')
    }

    let clientId = candidate?.client_id ?? input.clientId ?? null
    if (clientId) {
      const clients = await sql<{ id: string }[]>`
        SELECT id FROM clients
        WHERE tenant_id = ${input.tenantId} AND id = ${clientId}
      `
      if (clients.length !== 1) throw new Error('Historical inquiry client is unavailable')
    }
    if (!candidate && !clientId && input.clientLead) {
      const email = input.clientLead.email.trim().toLowerCase()
      const senderMatch = finding.from_address.trim().match(/<([^<>]+)>$/)
      const senderEmail = (senderMatch?.[1] ?? finding.from_address).trim().toLowerCase()
      if (
        /\r|\n/.test(finding.from_address) ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
        email !== senderEmail
      ) {
        throw new Error('Historical client email must match the validated source sender')
      }
      // Concurrent findings from the same sender must share one tenant client.
      await sql`
        SELECT pg_advisory_xact_lock(hashtextextended(
          ${input.tenantId}::text || ':' || ${email}::text, 0
        ))
      `
      const existingClients = await sql<{ id: string }[]>`
        SELECT id FROM clients
        WHERE tenant_id = ${input.tenantId} AND LOWER(email) = ${email}
          AND deleted_at IS NULL
        LIMIT 2 FOR UPDATE
      `
      if (existingClients.length > 1) throw new Error('Historical client email match is ambiguous')
      clientId = existingClients[0]?.id ?? null
      if (!clientId) {
        const providedName = input.clientLead.fullName?.trim()
        const fullName =
          providedName && !/^unknown(?: client)?$/i.test(providedName) ? providedName : email
        const insertedClients = await sql<{ id: string }[]>`
          INSERT INTO clients (
            tenant_id, email, full_name, status, referral_source, automated_emails_enabled
          ) VALUES (${input.tenantId}, ${email}, ${fullName}, 'active', 'email', FALSE)
          RETURNING id
        `
        clientId = insertedClients[0]?.id ?? null
        if (!clientId || insertedClients.length !== 1) {
          throw new Error('Historical inquiry client was not persisted')
        }
      }
    }
    let inquiryId = candidate?.id
    const body = finding.body_preview ?? ''
    if (!inquiryId) {
      const fields = input.inquiryFields
      const audit = {
        imported_from: 'historical_email_scan',
        original_sender: finding.from_address,
        gmail_message_id: finding.gmail_message_id,
        gmail_mailbox_id: finding.mailbox_id,
        ...(finding.subject ? { subject: finding.subject } : {}),
      }
      const inquiries = await sql<{ id: string }[]>`
        INSERT INTO inquiries (
          tenant_id, client_id, first_contact_at, confirmed_date, confirmed_guest_count,
          confirmed_location, confirmed_occasion, confirmed_budget_cents,
          confirmed_dietary_restrictions, confirmed_service_expectations, channel,
          source_message, unknown_fields, next_action_required, next_action_by
        ) VALUES (
          ${input.tenantId}, ${clientId}, ${receivedAt}, ${fields.confirmedDate ?? null},
          ${fields.confirmedGuestCount ?? null}, ${fields.confirmedLocation ?? null},
          ${fields.confirmedOccasion ?? null}, ${fields.confirmedBudgetCents ?? null},
          ${fields.confirmedDietaryRestrictions?.length ? sql.array(fields.confirmedDietaryRestrictions) : null},
          ${fields.confirmedServiceExpectations ?? null}, 'email',
          ${body}, ${sql.json(audit)}, 'Review imported historical inquiry', 'chef'
        )
        RETURNING id
      `
      inquiryId = inquiries[0]?.id
      if (!inquiryId || inquiries.length !== 1)
        throw new Error('Historical inquiry was not persisted')
    }

    // Check for an existing original message before inserting. This also prevents
    // adopting a Gmail message that already belongs to a different inquiry.
    const messages = await sql<MessageRow[]>`
      SELECT id, inquiry_id, body, subject, gmail_thread_id, sent_at FROM messages
      WHERE tenant_id = ${input.tenantId} AND gmail_message_id = ${finding.gmail_message_id}
        AND (mailbox_id IS NOT DISTINCT FROM ${finding.mailbox_id}::uuid
          OR (mailbox_id IS NULL AND inquiry_id = ${inquiryId}))
      LIMIT 2 FOR UPDATE
    `
    if (messages.length > 1 || (messages[0] && messages[0].inquiry_id !== inquiryId)) {
      throw new Error('Historical original message recovery is ambiguous')
    }
    const message = messages[0]
    if (
      message &&
      (message.body !== body ||
        message.subject !== finding.subject ||
        message.gmail_thread_id !== finding.gmail_thread_id ||
        sourceInstant(message.sent_at) !== receivedAt)
    ) {
      throw new Error('Historical original message does not match its source')
    }
    if (!message) {
      const inserted = await sql<{ id: string }[]>`
        INSERT INTO messages (
          tenant_id, inquiry_id, client_id, mailbox_id, channel, direction, status,
          subject, body, sent_at, gmail_message_id, gmail_thread_id
        ) VALUES (
          ${input.tenantId}, ${inquiryId}, ${clientId}, ${finding.mailbox_id},
          'email', 'inbound', 'logged', ${finding.subject}, ${body},
          ${receivedAt}, ${finding.gmail_message_id}, ${finding.gmail_thread_id}
        )
        RETURNING id
      `
      if (inserted.length !== 1) throw new Error('Historical original message was not persisted')
    }
    if (finding.status === 'imported' && finding.imported_inquiry_id === inquiryId && message) {
      return { inquiryId }
    }
    const receipts = await sql<{ id: string }[]>`
      UPDATE gmail_historical_findings
      SET status = 'imported', imported_inquiry_id = ${inquiryId}, reviewed_at = NOW()
      WHERE tenant_id = ${input.tenantId} AND id = ${input.findingId}
        AND status IN ('pending', 'imported')
      RETURNING id
    `
    if (receipts.length !== 1) throw new Error('Historical import receipt was not persisted')
    return { inquiryId }
  })
}
