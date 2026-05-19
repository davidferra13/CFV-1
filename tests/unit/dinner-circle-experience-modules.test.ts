import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildDinnerCircleExperienceModules,
  buildDinnerCircleReminderUrl,
} from '../../lib/dinner-circles/experience-modules'

const baseEvent = {
  id: 'event-1',
  occasion: 'June garden dinner',
  status: 'confirmed',
  event_date: '2026-06-06',
  serve_time: '18:30',
  event_timezone: 'America/New_York',
  location_address: '123 Test St',
  location_city: 'Richmond',
  location_state: 'VA',
  access_instructions: 'Use the side gate.',
  guest_count: 4,
  menu_approval_status: 'approved',
  special_requests: 'Garden-party feel, no flash photos during the toast.',
}

test('experience modules summarize RSVP status without exposing private dietary details by default', () => {
  const modules = buildDinnerCircleExperienceModules({
    now: new Date('2026-05-19T12:00:00Z'),
    event: baseEvent,
    guests: [
      {
        full_name: 'Avery Host',
        rsvp_status: 'attending',
        dietary_restrictions: ['vegetarian'],
        allergies: [],
        plus_one: false,
      },
      {
        full_name: 'Blake Guest',
        rsvp_status: 'pending',
        dietary_restrictions: [],
        allergies: [],
        plus_one: true,
      },
    ],
    rsvpSummary: {
      attending_count: 1,
      declined_count: 0,
      maybe_count: 0,
      pending_count: 1,
      plus_one_count: 1,
      waitlisted_count: 0,
      total_guests: 2,
    },
    activeShare: {
      rsvp_deadline_at: '2026-05-30T21:00:00.000Z',
      is_active: true,
    },
  })

  assert.equal(modules.rsvpCommandCenter.effectiveAttending, 2)
  assert.equal(modules.rsvpCommandCenter.pendingCount, 1)
  assert.equal(modules.rsvpCommandCenter.dietaryComplete, 1)
  assert.equal(modules.rsvpCommandCenter.rows[0]?.dietaryStatus, 'complete')
  assert.equal(modules.rsvpCommandCenter.rows[0]?.dietaryDetailsVisible, false)
  assert.match(modules.rsvpCommandCenter.actions[0]?.href ?? '', /#dinner-circle-rsvp-ops/)
})

test('attendee guide separates chef requirements, host preferences, and correction actions', () => {
  const modules = buildDinnerCircleExperienceModules({
    event: baseEvent,
    guests: [],
    rsvpSummary: null,
    activeShare: null,
  })

  const titles = modules.attendeeGuide.sections.map((section) => section.title)
  assert.deepEqual(titles, ['Arrival', 'Table Expectations', 'Chef Service', 'Privacy'])
  assert.equal(modules.attendeeGuide.correctionAction.visibility, 'host_chef')
  assert.equal(modules.attendeeGuide.sections[0]?.items.includes('Use the side gate.'), true)
  assert.equal(
    modules.attendeeGuide.sections.some((section) =>
      section.items.includes('Garden-party feel, no flash photos during the toast.')
    ),
    true
  )
})

test('calendar module creates role-safe dinner and personal reminder links', () => {
  const modules = buildDinnerCircleExperienceModules({
    now: new Date('2026-05-19T12:00:00Z'),
    event: baseEvent,
    guests: [],
    rsvpSummary: null,
    activeShare: {
      rsvp_deadline_at: '2026-05-30T21:00:00.000Z',
      is_active: true,
    },
  })

  assert.equal(modules.calendarReminders.mainEvent.icsHref, '/api/calendar/event/event-1')
  assert.equal(modules.calendarReminders.reminders.length, 3)
  assert.equal(modules.calendarReminders.reminders[0]?.visibility, 'self')
  assert.match(modules.calendarReminders.reminders[0]?.googleHref ?? '', /calendar\.google\.com/)
  assert.equal(modules.calendarReminders.privateDetailsPolicy.includes('access codes'), true)
})

test('calendar reminder urls encode title, date, and safe details', () => {
  const url = buildDinnerCircleReminderUrl({
    title: 'RSVP deadline',
    date: '2026-05-30',
    details: 'Confirm attendance and dietary needs.',
  })

  assert.match(url, /action=TEMPLATE/)
  assert.match(url, /RSVP\+deadline/)
  assert.match(url, /20260530T090000/)
})

test('calendar export route keeps client and tenant filters', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'app/api/calendar/event/[id]/route.ts'),
    'utf8'
  )

  assert.match(source, /const user = await requireClient\(\)/)
  assert.match(source, /\.eq\('id', eventId\)/)
  assert.match(source, /\.eq\('client_id', user\.entityId\)/)
  assert.match(source, /\.eq\('tenant_id', user\.tenantId\)/)
})
