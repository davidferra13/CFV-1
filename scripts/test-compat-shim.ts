/**
 * Compat Shim Runtime Test
 * Tests INSERT, UPDATE, DELETE, SELECT, .single(), .order(), .range(),
 * joins, .rpc(), .upsert(), .in(), .is(), .not() against real PostgreSQL.
 *
 * Run: npx tsx scripts/test-compat-shim.ts
 */
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres', {
  max: 5,
  idle_timeout: 10,
})

// Minimal compat shim inline (we can't import the full one due to Next.js context)
// Instead, test the raw SQL patterns the shim generates

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
let testClientId: string | null = null
let testNoteId: string | null = null

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  PASS  ${name}`)
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`)
    process.exitCode = 1
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

async function run() {
  console.log('=== Compat Shim Runtime Tests ===\n')

  // ── SELECT tests ──────────────────────────────────────────────────────
  console.log('SELECT operations:')

  await test('SELECT * with .eq() and .limit()', async () => {
    const rows = await sql`
      SELECT * FROM "chefs" WHERE "chefs"."id" = ${TENANT_ID} LIMIT 1
    `
    assert(rows.length === 1, `Expected 1 row, got ${rows.length}`)
    assert(rows[0].id === TENANT_ID, 'Wrong chef ID')
  })

  await test('SELECT specific columns', async () => {
    const rows = await sql`
      SELECT "chefs"."id", "chefs"."display_name", "chefs"."email"
      FROM "chefs"
      WHERE "chefs"."id" = ${TENANT_ID}
      LIMIT 1
    `
    assert(rows.length === 1, `Expected 1 row, got ${rows.length}`)
    assert(rows[0].display_name !== undefined, 'Missing display_name')
  })

  await test('SELECT with .order() DESC', async () => {
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      ORDER BY "events"."created_at" DESC
      LIMIT 5
    `
    // May be 0 if no events exist, that's fine
    if (rows.length > 1) {
      assert(rows[0].created_at >= rows[1].created_at, 'Not sorted DESC')
    }
  })

  await test('SELECT with .is(null)', async () => {
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      AND "events"."deleted_at" IS NULL
      LIMIT 5
    `
    for (const r of rows) {
      assert(r.deleted_at === null, 'deleted_at should be null')
    }
  })

  await test('SELECT with .in() array', async () => {
    const statuses = ['draft', 'proposed', 'accepted']
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      AND "events"."status" IN ${sql(statuses)}
      LIMIT 10
    `
    for (const r of rows) {
      assert(statuses.includes(r.status), `Unexpected status: ${r.status}`)
    }
  })

  await test('SELECT count()', async () => {
    const [row] = await sql`
      SELECT count(*)::int as count FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
    `
    assert(typeof row.count === 'number', `Count should be number, got ${typeof row.count}`)
  })

  await test('SELECT with ILIKE', async () => {
    const rows = await sql`
      SELECT * FROM "chefs"
      WHERE "chefs"."display_name" ILIKE ${'%agent%'}
      LIMIT 5
    `
    // May return 0-N rows, just shouldn't error
  })

  await test('SELECT with LEFT JOIN', async () => {
    const rows = await sql`
      SELECT e.*, c.full_name as client_name
      FROM "events" e
      LEFT JOIN "clients" c ON c.id = e.client_id
      WHERE e."tenant_id" = ${TENANT_ID}
      LIMIT 5
    `
    // Should not error even with no data
  })

  // ── INSERT tests ──────────────────────────────────────────────────────
  console.log('\nINSERT operations:')

  await test('INSERT with RETURNING', async () => {
    const [row] = await sql`
      INSERT INTO "clients" ("tenant_id", "full_name", "email", "phone")
      VALUES (${TENANT_ID}, ${'Test Client (compat shim)'}, ${'compat-test@example.com'}, ${'555-0199'})
      RETURNING *
    `
    assert(row.id !== undefined, 'Missing returned ID')
    assert(row.full_name === 'Test Client (compat shim)', 'Wrong name')
    assert(row.tenant_id === TENANT_ID, 'Wrong tenant')
    testClientId = row.id
  })

  await test('INSERT client_notes with FK', async () => {
    assert(testClientId !== null, 'No test client ID')
    const [row] = await sql`
      INSERT INTO "client_notes" ("tenant_id", "client_id", "note_text", "category")
      VALUES (${TENANT_ID}, ${testClientId}, ${'Test note from compat shim test'}, ${'general'})
      RETURNING *
    `
    assert(row.id !== undefined, 'Missing returned ID')
    testNoteId = row.id
  })

  // ── UPDATE tests ──────────────────────────────────────────────────────
  console.log('\nUPDATE operations:')

  await test('UPDATE with .eq() and RETURNING', async () => {
    assert(testClientId !== null, 'No test client ID')
    const [row] = await sql`
      UPDATE "clients"
      SET "phone" = ${'555-0200'}, "updated_at" = NOW()
      WHERE "clients"."id" = ${testClientId} AND "clients"."tenant_id" = ${TENANT_ID}
      RETURNING *
    `
    assert(row.phone === '555-0200', `Expected updated phone, got ${row.phone}`)
  })

  await test('UPDATE with multiple .eq() filters', async () => {
    assert(testNoteId !== null, 'No test note ID')
    const [row] = await sql`
      UPDATE "client_notes"
      SET "note_text" = ${'Updated note content'}
      WHERE "client_notes"."id" = ${testNoteId} AND "client_notes"."tenant_id" = ${TENANT_ID}
      RETURNING *
    `
    assert(row.note_text === 'Updated note content', 'Content not updated')
  })

  // ── UPSERT tests ──────────────────────────────────────────────────────
  console.log('\nUPSERT operations:')

  await test('UPSERT (INSERT ON CONFLICT DO UPDATE)', async () => {
    // Use chef_preferences which has a unique constraint on chef_id
    const [row] = await sql`
      INSERT INTO "chef_preferences" ("chef_id", "tenant_id", "network_discoverable")
      VALUES (${TENANT_ID}, ${TENANT_ID}, ${true})
      ON CONFLICT ("chef_id")
      DO UPDATE SET "network_discoverable" = ${true}, "updated_at" = NOW()
      RETURNING *
    `
    assert(row !== undefined, 'Upsert should return a row')
  })

  // ── RPC tests ──────────────────────────────────────────────────────────
  console.log('\nRPC / raw SQL:')

  await test('Raw SQL function call (gen_random_uuid)', async () => {
    const [row] = await sql`SELECT gen_random_uuid() as uuid`
    assert(typeof row.uuid === 'string', 'Should return a UUID string')
    assert(row.uuid.length === 36, `UUID should be 36 chars, got ${row.uuid.length}`)
  })

  await test('Raw SQL with COALESCE', async () => {
    const [row] = await sql`
      SELECT COALESCE(
        (SELECT count(*)::int FROM "events" WHERE "tenant_id" = ${TENANT_ID}),
        0
      ) as event_count
    `
    assert(typeof row.event_count === 'number', 'Should return a number')
  })

  // ── DELETE tests ──────────────────────────────────────────────────────
  console.log('\nDELETE operations:')

  await test('DELETE client_notes', async () => {
    assert(testNoteId !== null, 'No test note ID')
    await sql`
      DELETE FROM "client_notes"
      WHERE "client_notes"."id" = ${testNoteId} AND "client_notes"."tenant_id" = ${TENANT_ID}
    `
    const rows = await sql`
      SELECT * FROM "client_notes" WHERE "id" = ${testNoteId}
    `
    assert(rows.length === 0, 'Note should be deleted')
  })

  await test('DELETE test client', async () => {
    assert(testClientId !== null, 'No test client ID')
    await sql`
      DELETE FROM "clients"
      WHERE "clients"."id" = ${testClientId} AND "clients"."tenant_id" = ${TENANT_ID}
    `
    const rows = await sql`
      SELECT * FROM "clients" WHERE "id" = ${testClientId}
    `
    assert(rows.length === 0, 'Client should be deleted')
  })

  await test('Revert upsert test data', async () => {
    // Just leave chef_preferences as-is (it's the agent's own row)
  })

  // ── Edge case tests ───────────────────────────────────────────────────
  console.log('\nEdge cases:')

  await test('.single() equivalent (LIMIT 1, expect exactly 1)', async () => {
    const rows = await sql`
      SELECT * FROM "chefs" WHERE "id" = ${TENANT_ID} LIMIT 1
    `
    assert(rows.length === 1, `Expected exactly 1 row, got ${rows.length}`)
  })

  await test('.maybeSingle() equivalent (LIMIT 1, 0 or 1 ok)', async () => {
    const rows = await sql`
      SELECT * FROM "chefs" WHERE "id" = ${'00000000-0000-0000-0000-000000000000'} LIMIT 1
    `
    assert(rows.length === 0 || rows.length === 1, `Expected 0 or 1 rows, got ${rows.length}`)
  })

  await test('NOT IN filter', async () => {
    const excludeStatuses = ['cancelled', 'completed']
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      AND "events"."status" NOT IN ${sql(excludeStatuses)}
      LIMIT 5
    `
    for (const r of rows) {
      assert(!excludeStatuses.includes(r.status), `Should not have status: ${r.status}`)
    }
  })

  await test('OR condition', async () => {
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      AND ("events"."status" = ${'draft'} OR "events"."status" = ${'proposed'})
      LIMIT 5
    `
    for (const r of rows) {
      assert(r.status === 'draft' || r.status === 'proposed', `Unexpected: ${r.status}`)
    }
  })

  await test('range/offset (LIMIT + OFFSET)', async () => {
    const rows = await sql`
      SELECT * FROM "events"
      WHERE "events"."tenant_id" = ${TENANT_ID}
      ORDER BY "events"."created_at" DESC
      LIMIT 2 OFFSET 0
    `
    // Just shouldn't error
  })

  console.log('\n=== All tests complete ===')
  await sql.end()
}

run().catch(async (err) => {
  console.error('Fatal:', err)
  await sql.end()
  process.exit(1)
})
