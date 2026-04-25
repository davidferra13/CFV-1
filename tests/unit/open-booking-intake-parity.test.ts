import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('open booking route parses dietary text once and keeps intake inquiry-first', () => {
  const source = read('app/api/book/route.ts')

  assert.match(source, /function stripHtml\(value: string\)/)
  assert.match(source, /function parseDietaryRestrictions\(value\?: string \| null\)/)
  assert.match(
    source,
    /const dietaryRestrictions = parseDietaryRestrictions\(data\.dietary_restrictions\)/
  )
  assert.match(source, /confirmed_dietary_restrictions:\s*dietaryRestrictions/)
  assert.match(source, /confirmed_budget_cents:\s*budgetCentsPerPerson/)
  assert.match(source, /referral_partner_id:\s*referralPartnerId/)
  assert.match(source, /guest_count_range_label:\s*guestRange\?\.label/)
  assert.match(
    source,
    /seasonal_intent:\s*PublicSeasonalMarketPulseIntentSchema\.nullable\(\)\.optional\(\)/
  )
  assert.match(
    source,
    /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.open_booking,\s*\{\s*open_booking:\s*true,/
  )
  assert.match(source, /seasonal_market_intent:\s*seasonalIntent/)
  assert.match(source, /buildPublicSeasonalMarketPulseSourceMessageLine\(seasonalIntent\)/)
  assert.match(source, /\.from\('open_bookings'\)/)
  assert.match(source, /\.from\('open_booking_inquiries'\)/)
  assert.match(source, /sendBookingConfirmationEmail/)

  const propagatedArrays =
    source.match(
      /dietary_restrictions:\s*dietaryRestrictions \?\? \[\],\s*allergies:\s*dietaryRestrictions \?\? \[\],/g
    ) ?? []

  assert.equal(
    propagatedArrays.length,
    1,
    'dietary/allergy safety context should be written into the client record before commitment'
  )
  assert.doesNotMatch(source, /converted_to_event_id:\s*event\.id/)
})
