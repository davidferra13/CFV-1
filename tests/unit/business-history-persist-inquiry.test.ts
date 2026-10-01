import test from 'node:test'
import assert from 'node:assert/strict'
import type { Sql } from 'postgres'
import { persistHistoricalInquiry } from '@/lib/business-history-import/persist-inquiry'

const receivedAt = '2016-06-12T18:00:00.000Z'
const source = {
  gmailMessageId: 'mail-1',
  gmailThreadId: 'thread-1',
  mailboxId: null,
  fromAddress: 'Guest <guest@example.test>',
  subject: 'Dinner inquiry',
  bodyPreview: 'Dinner for six',
  receivedAt,
  classification: 'inquiry',
}
const input = {
  tenantId: 'chef-1',
  findingId: 'finding-1',
  expectedSource: source,
  inquiryFields: { firstContactAt: receivedAt, confirmedGuestCount: 6 },
}
type Row = Record<string, unknown>
type State = {
  findings: Row[]
  inquiries: Row[]
  messages: Row[]
  clients: Row[]
  mailboxes: Row[]
}
function finding(overrides: Row = {}): Row {
  return {
    id: input.findingId,
    tenant_id: input.tenantId,
    gmail_message_id: source.gmailMessageId,
    gmail_thread_id: source.gmailThreadId,
    mailbox_id: source.mailboxId,
    from_address: source.fromAddress,
    subject: source.subject,
    body_preview: source.bodyPreview,
    received_at: receivedAt,
    classification: source.classification,
    status: 'pending',
    imported_inquiry_id: null,
    ...overrides,
  }
}
function legacyInquiry(id = 'legacy-1', overrides: Row = {}): Row {
  return {
    id,
    tenant_id: input.tenantId,
    client_id: null,
    first_contact_at: receivedAt,
    source_message: source.bodyPreview,
    deleted_at: null,
    unknown_fields: {
      imported_from: 'historical_email_scan',
      gmail_message_id: source.gmailMessageId,
    },
    ...overrides,
  }
}
function database(
  seed: Partial<State> = {},
  failAt?: 'client' | 'inquiry' | 'message' | 'receipt'
) {
  let state: State = {
    findings: [finding()],
    inquiries: [],
    messages: [],
    clients: [],
    mailboxes: [],
    ...seed,
  }
  let pending = Promise.resolve()
  const trace: string[] = []
  const client = {
    begin: async <T>(callback: (sql: unknown) => Promise<T>) => {
      const previous = pending
      let release!: () => void
      pending = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      const draft = structuredClone(state)
      const sql = Object.assign(
        async (strings: TemplateStringsArray, ...values: unknown[]) => {
          const query = strings.join('?').replace(/\s+/g, ' ').trim()
          trace.push(query)
          if (query.includes('pg_advisory_xact_lock')) {
            assert.equal(values[0], input.tenantId, 'Client locks must include tenant ownership')
            assert.equal(
              values[1],
              clientLead.email,
              'Client locks must include normalized sender email'
            )
            return []
          }
          assert.match(
            query,
            /tenant_id/,
            'Every persistence statement must include tenant ownership'
          )
          if (query.startsWith('SELECT') && query.includes('FROM gmail_historical_findings')) {
            assert.match(query, /FOR UPDATE/, 'Findings must serialize competing imports')
            return draft.findings.filter(
              (row) => row.tenant_id === values[0] && row.id === values[1]
            )
          }
          if (query.startsWith('SELECT') && query.includes('FROM clients')) {
            return draft.clients.filter(
              (row) =>
                row.tenant_id === values[0] &&
                row.deleted_at == null &&
                (query.includes('LOWER(email)')
                  ? String(row.email).toLowerCase() === values[1]
                  : row.id === values[1])
            )
          }
          if (query.startsWith('INSERT INTO clients')) {
            if (failAt === 'client') throw new Error('Client storage unavailable')
            const id = 'client-' + (draft.clients.length + 1)
            draft.clients.push({
              id,
              tenant_id: values[0],
              email: values[1],
              full_name: values[2],
              automated_emails_enabled: false,
            })
            return [{ id }]
          }
          if (query.startsWith('SELECT') && query.includes('FROM google_mailboxes')) {
            return draft.mailboxes.filter(
              (row) => row.tenant_id === values[0] && row.id === values[1]
            )
          }
          if (query.startsWith('SELECT') && query.includes('FROM inquiries')) {
            return draft.inquiries
              .filter((row) => {
                const audit = row.unknown_fields as Row
                return (
                  row.tenant_id === values[0] &&
                  row.deleted_at == null &&
                  audit?.imported_from === 'historical_email_scan' &&
                  audit.gmail_message_id === values[1] &&
                  (!values[2] || !audit.gmail_mailbox_id || audit.gmail_mailbox_id === values[2])
                )
              })
              .slice(0, 2)
          }
          if (query.startsWith('INSERT INTO inquiries')) {
            if (failAt === 'inquiry') throw new Error('Inquiry storage unavailable')
            const id = 'inquiry-' + (draft.inquiries.length + 1)
            draft.inquiries.push({
              id,
              tenant_id: values[0],
              client_id: values[1],
              first_contact_at: values[2],
              source_message: values[10],
              unknown_fields: values[11],
            })
            return [{ id }]
          }
          if (query.startsWith('SELECT') && query.includes('FROM messages')) {
            return draft.messages
              .filter(
                (row) =>
                  row.tenant_id === values[0] &&
                  row.gmail_message_id === values[1] &&
                  (row.mailbox_id === values[2] ||
                    (row.mailbox_id == null && row.inquiry_id === values[3]))
              )
              .slice(0, 2)
          }
          if (query.startsWith('INSERT INTO messages')) {
            if (failAt === 'message') throw new Error('Message storage unavailable')
            draft.messages.push({
              id: 'message-1',
              tenant_id: values[0],
              inquiry_id: values[1],
              client_id: values[2],
              mailbox_id: values[3],
              subject: values[4],
              body: values[5],
              sent_at: values[6],
              gmail_message_id: values[7],
              gmail_thread_id: values[8],
            })
            return [{ id: 'message-1' }]
          }
          if (query.startsWith('UPDATE gmail_historical_findings')) {
            if (failAt === 'receipt') throw new Error('Receipt storage unavailable')
            const row = draft.findings.find(
              (candidate) => candidate.tenant_id === values[1] && candidate.id === values[2]
            )
            if (!row) return []
            row.status = 'imported'
            row.imported_inquiry_id = values[0]
            return [{ id: row.id }]
          }
          throw new Error('Unexpected persistence statement')
        },
        { json: (value: unknown) => value, array: (value: unknown) => value }
      )
      try {
        const result = await callback(sql)
        state = draft
        return result
      } finally {
        release()
      }
    },
  } as unknown as Pick<Sql, 'begin'>
  return { client, trace, state: () => state }
}
test('imports inquiry, original message and receipt together with the historical date', async () => {
  const db = database()
  assert.deepEqual(await persistHistoricalInquiry(db.client, input), { inquiryId: 'inquiry-1' })
  assert.equal(db.state().inquiries[0].first_contact_at, receivedAt)
  assert.equal(db.state().messages[0].sent_at, receivedAt)
  assert.equal(db.state().messages[0].body, source.bodyPreview)
  assert.equal(db.state().findings[0].status, 'imported')
  assert.equal(db.state().findings[0].imported_inquiry_id, 'inquiry-1')
})
for (const failure of ['message', 'receipt'] as const) {
  test('rolls back all import writes when ' + failure + ' storage fails', async () => {
    const db = database({}, failure)
    await assert.rejects(persistHistoricalInquiry(db.client, input), /storage unavailable/)
    assert.equal(db.state().inquiries.length, 0)
    assert.equal(db.state().messages.length, 0)
    assert.equal(db.state().findings[0].status, 'pending')
  })
}
test('serializes competing imports and retries without duplicates', async () => {
  const db = database()
  const results = await Promise.all([
    persistHistoricalInquiry(db.client, input),
    persistHistoricalInquiry(db.client, input),
  ])
  assert.deepEqual(results, [{ inquiryId: 'inquiry-1' }, { inquiryId: 'inquiry-1' }])
  assert.equal(db.state().inquiries.length, 1)
  assert.equal(db.state().messages.length, 1)
})
test('recovers a legacy partial inquiry instead of creating another', async () => {
  const db = database({ inquiries: [legacyInquiry()] })
  assert.deepEqual(await persistHistoricalInquiry(db.client, input), { inquiryId: 'legacy-1' })
  assert.equal(db.state().inquiries.length, 1)
  assert.equal(db.state().messages.length, 1)
  assert.equal(db.state().findings[0].imported_inquiry_id, 'legacy-1')
})
test('repairs a linked receipt missing its original message atomically', async () => {
  const db = database({
    findings: [finding({ status: 'imported', imported_inquiry_id: 'legacy-1' })],
    inquiries: [legacyInquiry()],
  })
  await persistHistoricalInquiry(db.client, input)
  await persistHistoricalInquiry(db.client, input)
  assert.equal(db.state().inquiries.length, 1)
  assert.equal(db.state().messages.length, 1)
})
test('reuses the original legacy message without duplicates', async () => {
  const db = database({
    inquiries: [legacyInquiry()],
    messages: [
      {
        id: 'existing-message',
        tenant_id: input.tenantId,
        inquiry_id: 'legacy-1',
        mailbox_id: null,
        gmail_message_id: source.gmailMessageId,
        gmail_thread_id: source.gmailThreadId,
        subject: source.subject,
        body: source.bodyPreview,
        sent_at: receivedAt,
      },
    ],
  })
  await persistHistoricalInquiry(db.client, input)
  assert.equal(db.state().messages.length, 1)
})
test('ambiguous partial imports remain staged without any writes', async () => {
  const db = database({ inquiries: [legacyInquiry('one'), legacyInquiry('two')] })
  await assert.rejects(persistHistoricalInquiry(db.client, input), /ambiguous/i)
  assert.equal(db.state().inquiries.length, 2)
  assert.equal(db.state().messages.length, 0)
  assert.equal(db.state().findings[0].status, 'pending')
})
test('a finding from another tenant is unavailable', async () => {
  const db = database({ findings: [finding({ tenant_id: 'chef-2' })] })
  await assert.rejects(persistHistoricalInquiry(db.client, input), /not found/i)
  assert.equal(db.state().inquiries.length, 0)
})
test('a receipt cannot resolve to another tenant or an unrelated inquiry', async () => {
  for (const inquiry of [
    legacyInquiry('legacy-1', { tenant_id: 'chef-2' }),
    legacyInquiry('legacy-1', { unknown_fields: {} }),
  ]) {
    const db = database({
      findings: [finding({ status: 'imported', imported_inquiry_id: 'legacy-1' })],
      inquiries: [inquiry],
    })
    await assert.rejects(persistHistoricalInquiry(db.client, input), /destination/i)
    assert.equal(db.state().messages.length, 0)
  }
})
test('a linked client must belong to the importing tenant', async () => {
  const db = database({ clients: [{ id: 'client-1', tenant_id: 'chef-2' }] })
  await assert.rejects(
    persistHistoricalInquiry(db.client, { ...input, clientId: 'client-1' }),
    /client/i
  )
  assert.equal(db.state().inquiries.length, 0)
})
test('rejects changed source metadata after parsing', async () => {
  const db = database({ findings: [finding({ body_preview: 'Updated guest count' })] })
  await assert.rejects(persistHistoricalInquiry(db.client, input), /changed/i)
  assert.equal(db.state().inquiries.length, 0)
})
test('accepts equivalent source instants returned as Date objects', async () => {
  const db = database({ findings: [finding({ received_at: new Date(receivedAt) })] })
  await persistHistoricalInquiry(db.client, input)
  assert.equal(db.state().inquiries.length, 1)
})
test('dismissed and unsupported findings cannot become imported inquiries', async () => {
  for (const overrides of [{ status: 'dismissed' }, { classification: 'payment_invoice' }]) {
    const db = database({ findings: [finding(overrides)] })
    await assert.rejects(persistHistoricalInquiry(db.client, input), /dismissed|classification/i)
    assert.equal(db.state().inquiries.length, 0)
  }
})
test('missing or invalid historical dates stay staged rather than becoming today', async () => {
  for (const date of [null, 'invalid']) {
    const db = database({ findings: [finding({ received_at: date })] })
    await assert.rejects(
      persistHistoricalInquiry(db.client, {
        ...input,
        expectedSource: { ...source, receivedAt: date },
        inquiryFields: { ...input.inquiryFields, firstContactAt: date ?? receivedAt },
      }),
      /date/i
    )
    assert.equal(db.state().inquiries.length, 0)
    assert.equal(db.state().findings[0].status, 'pending')
  }
})
test('an existing original message for another inquiry blocks ambiguous recovery', async () => {
  const db = database({
    messages: [
      {
        id: 'other-message',
        tenant_id: input.tenantId,
        inquiry_id: 'other-inquiry',
        mailbox_id: null,
        gmail_message_id: source.gmailMessageId,
        gmail_thread_id: source.gmailThreadId,
        subject: source.subject,
        body: source.bodyPreview,
        sent_at: receivedAt,
      },
    ],
  })
  await assert.rejects(persistHistoricalInquiry(db.client, input), /ambiguous/i)
  assert.equal(db.state().inquiries.length, 0)
  assert.equal(db.state().messages.length, 1)
})
test('successful retries preserve the original import receipt', async () => {
  const db = database()
  await persistHistoricalInquiry(db.client, input)
  await persistHistoricalInquiry(db.client, input)
  assert.equal(
    db.trace.filter((statement) => statement.startsWith('UPDATE gmail_historical_findings')).length,
    1
  )
})
test('existing thread classifications can recover to an inquiry', async () => {
  const db = database({ findings: [finding({ classification: 'existing_thread' })] })
  await persistHistoricalInquiry(db.client, {
    ...input,
    expectedSource: { ...source, classification: 'existing_thread' },
  })
  assert.equal(db.state().inquiries.length, 1)
})
test('source mailboxes must belong to the importing tenant', async () => {
  const db = database({
    findings: [finding({ mailbox_id: 'mailbox-1' })],
    mailboxes: [{ id: 'mailbox-1', tenant_id: 'chef-2' }],
  })
  await assert.rejects(
    persistHistoricalInquiry(db.client, {
      ...input,
      expectedSource: { ...source, mailboxId: 'mailbox-1' },
    }),
    /mailbox/i
  )
  assert.equal(db.state().inquiries.length, 0)
})
test('a substituted current contact date cannot replace a historical source date', async () => {
  const db = database()
  await assert.rejects(
    persistHistoricalInquiry(db.client, {
      ...input,
      inquiryFields: { ...input.inquiryFields, firstContactAt: '2026-10-01T00:00:00.000Z' },
    }),
    /contact date/i
  )
  assert.equal(db.state().inquiries.length, 0)
})

const clientLead = { email: 'guest@example.test', fullName: 'Guest' }
test('creates a validated sender client together with the historical inquiry', async () => {
  const db = database()
  await persistHistoricalInquiry(db.client, { ...input, clientLead })
  assert.equal(db.state().clients.length, 1)
  assert.equal(db.state().clients[0].email, clientLead.email)
  assert.equal(db.state().clients[0].full_name, 'Guest')
  assert.equal(db.state().clients[0].automated_emails_enabled, false)
  assert.equal(db.state().inquiries[0].client_id, db.state().clients[0].id)
})
for (const failure of ['client', 'inquiry', 'message', 'receipt'] as const) {
  test('rolls back all new client import writes when ' + failure + ' storage fails', async () => {
    const db = database({}, failure)
    await assert.rejects(
      persistHistoricalInquiry(db.client, { ...input, clientLead }),
      /storage unavailable/
    )
    assert.equal(db.state().clients.length, 0)
    assert.equal(db.state().inquiries.length, 0)
    assert.equal(db.state().messages.length, 0)
    assert.equal(db.state().findings[0].status, 'pending')
  })
}
test('reuses a tenant client matched by normalized email without changing it', async () => {
  const existing = {
    id: 'known-client',
    tenant_id: input.tenantId,
    email: 'GUEST@EXAMPLE.TEST',
    full_name: 'Existing preferred name',
  }
  const db = database({ clients: [existing] })
  await persistHistoricalInquiry(db.client, { ...input, clientLead })
  assert.deepEqual(db.state().clients, [existing])
  assert.equal(db.state().inquiries[0].client_id, existing.id)
})
test('repeated and competing imports create one client', async () => {
  const db = database()
  await Promise.all([
    persistHistoricalInquiry(db.client, { ...input, clientLead }),
    persistHistoricalInquiry(db.client, { ...input, clientLead }),
  ])
  assert.equal(db.state().clients.length, 1)
  assert.equal(db.state().inquiries.length, 1)
})
test('never reuses a client from another tenant with the same email', async () => {
  const foreign = { id: 'foreign-client', tenant_id: 'chef-2', email: clientLead.email }
  const db = database({ clients: [foreign] })
  await persistHistoricalInquiry(db.client, { ...input, clientLead })
  assert.equal(db.state().clients.length, 2)
  assert.notEqual(db.state().inquiries[0].client_id, foreign.id)
  assert.equal(db.state().clients[1].tenant_id, input.tenantId)
})
test('ambiguous same-tenant email matches stay staged', async () => {
  const db = database({
    clients: [
      { id: 'one', tenant_id: input.tenantId, email: clientLead.email },
      { id: 'two', tenant_id: input.tenantId, email: clientLead.email },
    ],
  })
  await assert.rejects(persistHistoricalInquiry(db.client, { ...input, clientLead }), /ambiguous/i)
  assert.equal(db.state().inquiries.length, 0)
})
test('client creation uses email instead of an unknown or absent envelope name', async () => {
  for (const fullName of [null, '', 'Unknown']) {
    const db = database()
    await persistHistoricalInquiry(db.client, { ...input, clientLead: { ...clientLead, fullName } })
    assert.equal(db.state().clients[0].full_name, clientLead.email)
  }
})
test('rejects client email that does not match the locked source sender', async () => {
  const db = database()
  await assert.rejects(
    persistHistoricalInquiry(db.client, {
      ...input,
      clientLead: { email: 'another@example.test', fullName: 'Another guest' },
    }),
    /sender/i
  )
  assert.equal(db.state().clients.length, 0)
})
test('legacy partial recovery does not create an orphan sender client', async () => {
  const db = database({ inquiries: [legacyInquiry()] })
  await persistHistoricalInquiry(db.client, { ...input, clientLead })
  assert.equal(db.state().clients.length, 0)
  assert.equal(db.state().inquiries.length, 1)
})
test('different findings for one sender share the client lock and destination client', async () => {
  const db = database({
    findings: [finding(), finding({ id: 'finding-2', gmail_message_id: 'mail-2' })],
  })
  await Promise.all([
    persistHistoricalInquiry(db.client, { ...input, clientLead }),
    persistHistoricalInquiry(db.client, {
      ...input,
      findingId: 'finding-2',
      expectedSource: { ...source, gmailMessageId: 'mail-2' },
      clientLead,
    }),
  ])
  assert.equal(db.state().clients.length, 1)
  assert.equal(db.state().inquiries.length, 2)
  assert.equal(db.state().inquiries[0].client_id, db.state().inquiries[1].client_id)
  assert.equal(
    db.trace.filter((statement) => statement.includes('pg_advisory_xact_lock')).length,
    2
  )
})
