import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const sourcePath = path.join(process.cwd(), 'lib/calendar/reschedule-action.ts')
const source = readFileSync(sourcePath, 'utf8')

test('calendar reschedule action status rules match editable calendar events', () => {
  assert.match(source, /const RESCHEDULABLE_STATUSES = \['draft', 'proposed', 'accepted'\]/)
  assert.doesNotMatch(source, /RESCHEDULABLE_STATUSES[\s\S]*'paid'/)
})

test('calendar reschedule action validates input before database access', () => {
  const authIndex = source.indexOf('const user = await requireChef()')
  const eventIdValidationIndex = source.indexOf('Event ID is required')
  const dateValidationIndex = source.indexOf('isValidDateInput(newDate)')
  const dbIndex = source.indexOf('const db: any = createServerClient()')

  assert.ok(authIndex >= 0)
  assert.ok(eventIdValidationIndex > authIndex)
  assert.ok(dateValidationIndex > authIndex)
  assert.ok(dbIndex > eventIdValidationIndex)
  assert.ok(dbIndex > dateValidationIndex)
})

test('calendar reschedule action scopes event read and write by tenant', () => {
  const selectChain = source.match(
    /\.from\('events'\)[\s\S]*?\.select\('id, event_date, status, tenant_id'\)[\s\S]*?\.single\(\)/
  )?.[0]
  const updateChain = source.match(
    /\.from\('events'\)[\s\S]*?\.update\(\{ event_date: newDate \}\)[\s\S]*?if \(updateError\)/
  )?.[0]

  assert.ok(selectChain)
  assert.match(selectChain, /\.eq\('id', eventId\)/)
  assert.match(selectChain, /\.eq\('tenant_id', user\.tenantId!\)/)

  assert.ok(updateChain)
  assert.match(updateChain, /\.eq\('id', eventId\)/)
  assert.match(updateChain, /\.eq\('tenant_id', user\.tenantId!\)/)
})

test('calendar reschedule action keeps sync non-blocking and revalidates affected paths', () => {
  assert.match(source, /try \{[\s\S]*syncEventToGoogleCalendar\(eventId\)[\s\S]*\} catch \(err\)/)
  assert.match(
    source,
    /log\.events\.warn\('Google Calendar re-sync after reschedule failed \(non-blocking\)'/
  )
  assert.match(source, /revalidatePath\('\/calendar'\)/)
  assert.match(source, /revalidatePath\('\/events'\)/)
  assert.match(source, /revalidatePath\(`\/events\/\$\{eventId\}`\)/)
  assert.match(source, /revalidatePath\('\/my-events'\)/)
  assert.match(source, /revalidatePath\(`\/my-events\/\$\{eventId\}`\)/)
})
