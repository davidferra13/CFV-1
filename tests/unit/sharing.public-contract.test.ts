import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublicShareEventFields,
  getDefaultPublicShareVisibilitySettings,
  normalizePublicShareVisibilitySettings,
} from '../../lib/sharing/public-contract.js'
import { resolvePublicShareDinnerCircleAccess } from '../../lib/hub/public-share-access.js'

describe('sharing/public-contract', () => {
  it('normalizes missing visibility keys with the canonical defaults', () => {
    const visibility = normalizePublicShareVisibilitySettings({ show_menu: true })

    assert.deepEqual(visibility, {
      ...getDefaultPublicShareVisibilitySettings(),
      show_menu: true,
    })
  })

  it('keeps guest count, service style, and chef identity hidden unless enabled', () => {
    const projection = buildPublicShareEventFields({
      visibility: {
        show_occasion: true,
        show_date_time: true,
        show_location: true,
      },
      event: {
        status: 'confirmed',
        occasion: 'Anniversary Dinner',
        event_date: '2026-05-01',
        serve_time: '18:30:00',
        arrival_time: '18:00:00',
        event_timezone: 'America/New_York',
        guest_count: 14,
        service_style: 'plated',
        location_address: '123 Main St',
        location_city: 'Boston',
        location_state: 'MA',
        location_zip: '02118',
        location_notes: 'Ring the bell',
        dietary_restrictions: ['Vegetarian'],
        allergies: ['Tree nut'],
        special_requests: 'Window seat',
      },
      chef: {
        display_name: 'Chef Ada',
        business_name: 'Ada Catering',
        booking_slug: 'chef-ada',
      },
      menus: [{ id: 'menu-1' }],
      guestList: [{ full_name: 'Alex', rsvp_status: 'attending' }],
    })

    assert.equal(projection.status, 'confirmed')
    assert.equal(projection.guestCount, null)
    assert.equal(projection.serviceStyle, null)
    assert.equal(projection.chefName, 'Chef Ada')
    assert.equal(projection.chefProfileUrl, '/chef/chef-ada')
    assert.deepEqual(projection.menus, [])
    assert.deepEqual(projection.guestList, [])
    assert.equal(Object.prototype.hasOwnProperty.call(projection, 'tenantId'), false)
  })

  it('returns optional fields only when the host enables them', () => {
    const projection = buildPublicShareEventFields({
      visibility: {
        show_guest_count: true,
        show_service_style: true,
        show_menu: true,
        show_guest_list: true,
        show_chef_name: false,
      },
      event: {
        status: 'paid',
        occasion: 'Birthday Dinner',
        event_date: '2026-06-11',
        serve_time: '19:00:00',
        arrival_time: '18:30:00',
        guest_count: 10,
        service_style: 'family_style',
      },
      chef: {
        display_name: 'Chef Bee',
        business_name: 'Bee Catering',
        booking_slug: 'chef-bee',
      },
      menus: [{ id: 'menu-1' }],
      guestList: [{ full_name: 'Blair', rsvp_status: 'maybe' }],
    })

    assert.equal(projection.guestCount, 10)
    assert.equal(projection.serviceStyle, 'family_style')
    assert.equal(projection.chefName, null)
    assert.equal(projection.chefProfileUrl, null)
    assert.equal(projection.menus.length, 1)
    assert.equal(projection.guestList.length, 1)
  })
})

describe('hub/public-share-access', () => {
  it('derives Dinner Circle access from an active matching share token', () => {
    const access = resolvePublicShareDinnerCircleAccess({
      share: {
        event_id: 'event-1',
        tenant_id: 'chef-1',
        is_active: true,
        expires_at: '2026-12-01T00:00:00.000Z',
      },
      eventId: 'event-1',
      eventTitle: 'Dinner Circle',
      now: new Date('2026-04-22T12:00:00.000Z'),
    })

    assert.deepEqual(access, {
      eventId: 'event-1',
      tenantId: 'chef-1',
      eventTitle: 'Dinner Circle',
    })
  })

  it('rejects inactive, mismatched, or expired share access', () => {
    assert.throws(
      () =>
        resolvePublicShareDinnerCircleAccess({
          share: {
            event_id: 'event-1',
            tenant_id: 'chef-1',
            is_active: false,
            expires_at: null,
          },
          eventId: 'event-1',
          eventTitle: 'Dinner Circle',
        }),
      /inactive/
    )

    assert.throws(
      () =>
        resolvePublicShareDinnerCircleAccess({
          share: {
            event_id: 'event-2',
            tenant_id: 'chef-1',
            is_active: true,
            expires_at: null,
          },
          eventId: 'event-1',
          eventTitle: 'Dinner Circle',
        }),
      /does not match/
    )

    assert.throws(
      () =>
        resolvePublicShareDinnerCircleAccess({
          share: {
            event_id: 'event-1',
            tenant_id: 'chef-1',
            is_active: true,
            expires_at: '2026-04-01T00:00:00.000Z',
          },
          eventId: 'event-1',
          eventTitle: 'Dinner Circle',
          now: new Date('2026-04-22T12:00:00.000Z'),
        }),
      /expired/
    )
  })
})
