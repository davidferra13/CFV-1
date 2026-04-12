import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ACCOUNT_ACCESS_SIGN_IN_KIND,
  applyAccessReviewState,
  computeAccessRisk,
  parseUserAgent,
  shouldInvalidateJwtSession,
  type AccountAccessControlEvent,
  type AccountAccessEvent,
} from '@/lib/auth/account-access-core'

const desktopDevice = parseUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36'
)
const mobileDevice = parseUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 CriOS/135.0.0.0 Mobile/15E148 Safari/604.1'
)

function createEvent(overrides: Partial<AccountAccessEvent> = {}): AccountAccessEvent {
  return {
    id: 'evt_1',
    occurredAt: '2026-04-09T12:00:00.000Z',
    kind: ACCOUNT_ACCESS_SIGN_IN_KIND,
    authProvider: 'credentials',
    ipAddress: '203.0.113.10',
    ipMasked: '203.0.113.xxx',
    location: {
      countryCode: 'US',
      country: 'United States',
      region: 'NY',
      city: 'New York',
      latitude: null,
      longitude: null,
      source: 'headers',
    },
    locationLabel: 'New York, NY, US',
    locationKey: 'us|ny|new york',
    device: desktopDevice,
    riskSignals: [],
    riskScore: 0,
    riskLevel: 'normal',
    signalSummary: 'Matched your usual access pattern.',
    ...overrides,
  }
}

describe('account-access risk detection', () => {
  it('treats the first recorded sign-in as normal', () => {
    const risk = computeAccessRisk(
      {
        occurredAt: '2026-04-09T12:00:00.000Z',
        device: desktopDevice,
        location: createEvent().location,
        locationKey: 'us|ny|new york',
        ipAddress: '203.0.113.10',
      },
      []
    )

    assert.equal(risk.riskLevel, 'normal')
    assert.deepEqual(risk.riskSignals, [])
  })

  it('flags a new device for review without adding location noise', () => {
    const risk = computeAccessRisk(
      {
        occurredAt: '2026-04-09T13:00:00.000Z',
        device: mobileDevice,
        location: createEvent().location,
        locationKey: 'us|ny|new york',
        ipAddress: '203.0.113.11',
      },
      [createEvent()]
    )

    assert.equal(risk.riskLevel, 'review')
    assert.deepEqual(risk.riskSignals, ['new_device'])
  })

  it('escalates to critical for impossible travel patterns', () => {
    const risk = computeAccessRisk(
      {
        occurredAt: '2026-04-09T14:00:00.000Z',
        device: desktopDevice,
        location: {
          countryCode: 'FR',
          country: 'France',
          region: 'IDF',
          city: 'Paris',
          latitude: null,
          longitude: null,
          source: 'headers',
        },
        locationKey: 'fr|idf|paris',
        ipAddress: '198.51.100.10',
      },
      [
        createEvent({
          occurredAt: '2026-04-09T10:30:00.000Z',
        }),
      ]
    )

    assert.equal(risk.riskLevel, 'critical')
    assert.ok(risk.riskSignals.includes('impossible_travel'))
    assert.ok(risk.riskSignals.includes('new_location'))
  })

  it('detects abnormal session bursts across distinct access contexts', () => {
    const risk = computeAccessRisk(
      {
        occurredAt: '2026-04-09T12:45:00.000Z',
        device: parseUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Firefox/136.0 Safari/537.36'
        ),
        location: {
          countryCode: 'US',
          country: 'United States',
          region: 'MA',
          city: 'Boston',
          latitude: null,
          longitude: null,
          source: 'headers',
        },
        locationKey: 'us|ma|boston',
        ipAddress: '198.51.100.24',
      },
      [
        createEvent({
          occurredAt: '2026-04-09T12:15:00.000Z',
        }),
        createEvent({
          id: 'evt_2',
          occurredAt: '2026-04-09T12:30:00.000Z',
          device: mobileDevice,
          ipAddress: '198.51.100.12',
          location: {
            countryCode: 'US',
            country: 'United States',
            region: 'DC',
            city: 'Washington',
            latitude: null,
            longitude: null,
            source: 'headers',
          },
          locationLabel: 'Washington, DC, US',
          locationKey: 'us|dc|washington',
        }),
      ]
    )

    assert.ok(risk.riskSignals.includes('session_burst'))
  })
})

describe('account-access session invalidation', () => {
  it('invalidates when the stored session version moves ahead of the token', () => {
    const invalidated = shouldInvalidateJwtSession(
      {
        sessionVersion: 1,
        sessionAuthenticatedAt: Date.parse('2026-04-09T12:00:00.000Z'),
      },
      {
        sessionVersion: 2,
        invalidBefore: null,
        bannedUntil: null,
        deletedAt: null,
      }
    )

    assert.equal(invalidated, true)
  })

  it('invalidates when the token predates invalidBefore', () => {
    const invalidated = shouldInvalidateJwtSession(
      {
        sessionVersion: 3,
        sessionAuthenticatedAt: Date.parse('2026-04-09T12:00:00.000Z'),
      },
      {
        sessionVersion: 3,
        invalidBefore: '2026-04-09T12:05:00.000Z',
        bannedUntil: null,
        deletedAt: null,
      }
    )

    assert.equal(invalidated, true)
  })
})

describe('account-access review state', () => {
  it('marks flagged events as pending when no review action exists', () => {
    const [event] = applyAccessReviewState(
      [
        createEvent({
          riskSignals: ['new_device'],
          riskScore: 45,
          riskLevel: 'review',
          signalSummary: 'Flagged for new device.',
        }),
      ],
      []
    )

    assert.equal(event.review?.status, 'pending')
    assert.equal(event.review?.resolvedAt, null)
  })

  it('marks a flagged event safe when the latest control confirms it', () => {
    const [event] = applyAccessReviewState(
      [
        createEvent({
          riskSignals: ['new_device'],
          riskScore: 45,
          riskLevel: 'review',
          signalSummary: 'Flagged for new device.',
        }),
      ],
      [createControlEvent({ type: 'access_event_confirmed_safe', accessEventId: 'evt_1' })]
    )

    assert.equal(event.review?.status, 'confirmed_safe')
    assert.equal(event.review?.resolvedAt, '2026-04-09T12:15:00.000Z')
  })

  it('uses the latest review control when an event has multiple actions', () => {
    const [event] = applyAccessReviewState(
      [
        createEvent({
          riskSignals: ['impossible_travel'],
          riskScore: 80,
          riskLevel: 'critical',
          signalSummary: 'Flagged for impossible travel.',
        }),
      ],
      [
        createControlEvent({
          id: 'ctl_older',
          occurredAt: '2026-04-09T12:10:00.000Z',
          type: 'access_event_confirmed_safe',
          accessEventId: 'evt_1',
        }),
        createControlEvent({
          id: 'ctl_newer',
          occurredAt: '2026-04-09T12:20:00.000Z',
          type: 'access_event_secured',
          accessEventId: 'evt_1',
        }),
      ]
    )

    assert.equal(event.review?.status, 'secured')
    assert.equal(event.review?.resolvedAt, '2026-04-09T12:20:00.000Z')
  })

  it('ignores non-review security actions when deriving review state', () => {
    const [event] = applyAccessReviewState(
      [
        createEvent({
          riskSignals: ['new_device'],
          riskScore: 45,
          riskLevel: 'review',
          signalSummary: 'Flagged for new device.',
        }),
      ],
      [createControlEvent({ type: 'password_changed', accessEventId: null })]
    )

    assert.equal(event.review?.status, 'pending')
    assert.equal(event.review?.resolvedAt, null)
  })
})

function createControlEvent(
  overrides: Partial<AccountAccessControlEvent> = {}
): AccountAccessControlEvent {
  return {
    id: 'ctl_1',
    occurredAt: '2026-04-09T12:15:00.000Z',
    type: 'access_event_confirmed_safe',
    accessEventId: 'evt_1',
    reason: 'Reviewed from Account & Security.',
    ...overrides,
  }
}
