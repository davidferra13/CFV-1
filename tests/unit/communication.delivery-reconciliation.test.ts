import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapProviderStatusToDeliveryStatus,
  projectThreadDeliveryState,
  reduceCommunicationEventDeliveryState,
} from '../../lib/communication/delivery-reconciliation'

test('delivery reconciliation promotes provider lifecycle without regressing canonical event state', () => {
  const base = {
    providerDeliveryStatus: null,
    providerStatus: null,
    providerStatusUpdatedAt: null,
    providerDeliveredAt: null,
    providerReadAt: null,
    providerFailedAt: null,
    providerErrorCode: null,
    providerErrorMessage: null,
  } as const

  const queued = reduceCommunicationEventDeliveryState(base, {
    kind: 'send_success',
    occurredAt: '2026-04-21T12:00:00.000Z',
    rawProviderStatus: 'queued',
    errorCode: null,
    errorMessage: null,
  })
  assert.equal(queued.providerDeliveryStatus, 'pending')
  assert.equal(queued.providerStatus, 'queued')

  const delivered = reduceCommunicationEventDeliveryState(queued, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:02:00.000Z',
    rawProviderStatus: 'delivered',
    errorCode: null,
    errorMessage: null,
  })
  assert.equal(delivered.providerDeliveryStatus, 'delivered')
  assert.equal(delivered.providerDeliveredAt, '2026-04-21T12:02:00.000Z')

  const read = reduceCommunicationEventDeliveryState(delivered, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:03:00.000Z',
    rawProviderStatus: 'read',
    errorCode: null,
    errorMessage: null,
  })
  assert.equal(read.providerDeliveryStatus, 'read')
  assert.equal(read.providerReadAt, '2026-04-21T12:03:00.000Z')

  const regressed = reduceCommunicationEventDeliveryState(read, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:04:00.000Z',
    rawProviderStatus: 'queued',
    errorCode: null,
    errorMessage: null,
  })
  assert.deepEqual(regressed, read)
})

test('delivery reconciliation accepts failures before delivery but not after delivery', () => {
  const sent = reduceCommunicationEventDeliveryState(
    {
      providerDeliveryStatus: null,
      providerStatus: null,
      providerStatusUpdatedAt: null,
      providerDeliveredAt: null,
      providerReadAt: null,
      providerFailedAt: null,
      providerErrorCode: null,
      providerErrorMessage: null,
    },
    {
      kind: 'send_success',
      occurredAt: '2026-04-21T12:00:00.000Z',
      rawProviderStatus: 'sent',
      errorCode: null,
      errorMessage: null,
    }
  )

  const failed = reduceCommunicationEventDeliveryState(sent, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:01:00.000Z',
    rawProviderStatus: 'failed',
    errorCode: '30003',
    errorMessage: 'Unreachable handset',
  })
  assert.equal(failed.providerDeliveryStatus, 'failed')
  assert.equal(failed.providerFailedAt, '2026-04-21T12:01:00.000Z')
  assert.equal(failed.providerErrorCode, '30003')

  const delivered = reduceCommunicationEventDeliveryState(sent, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:02:00.000Z',
    rawProviderStatus: 'delivered',
    errorCode: null,
    errorMessage: null,
  })
  const failedAfterDelivered = reduceCommunicationEventDeliveryState(delivered, {
    kind: 'provider_update',
    occurredAt: '2026-04-21T12:03:00.000Z',
    rawProviderStatus: 'failed',
    errorCode: '30003',
    errorMessage: 'Unreachable handset',
  })
  assert.deepEqual(failedAfterDelivered, delivered)
})

test('thread delivery projection protects a newer failed attempt from older provider callbacks', () => {
  const base = {
    latestOutboundEventId: null,
    latestOutboundAttemptedAt: null,
    latestOutboundDeliveryStatus: null,
    latestOutboundProviderStatus: null,
    latestOutboundStatusUpdatedAt: null,
    latestOutboundErrorCode: null,
    latestOutboundErrorMessage: null,
  }

  const failedAttempt = projectThreadDeliveryState(base, {
    kind: 'send_failure',
    communicationEventId: null,
    attemptedAt: '2026-04-21T13:00:00.000Z',
    occurredAt: '2026-04-21T13:00:00.000Z',
    nextDeliveryStatus: 'failed',
    nextProviderStatus: null,
    errorCode: null,
    errorMessage: 'Twilio send failed',
  })

  assert.equal(failedAttempt.latestOutboundDeliveryStatus, 'failed')
  assert.equal(failedAttempt.latestOutboundEventId, null)

  const staleCallback = projectThreadDeliveryState(failedAttempt, {
    kind: 'provider_update',
    communicationEventId: 'event-older',
    attemptedAt: '2026-04-21T12:00:00.000Z',
    occurredAt: '2026-04-21T13:05:00.000Z',
    nextDeliveryStatus: 'delivered',
    nextProviderStatus: 'delivered',
    errorCode: null,
    errorMessage: null,
  })

  assert.deepEqual(staleCallback, failedAttempt)

  const retried = projectThreadDeliveryState(failedAttempt, {
    kind: 'send_success',
    communicationEventId: 'event-newer',
    attemptedAt: '2026-04-21T14:00:00.000Z',
    occurredAt: '2026-04-21T14:00:00.000Z',
    nextDeliveryStatus: 'sent',
    nextProviderStatus: 'sent',
    errorCode: null,
    errorMessage: null,
  })

  assert.equal(retried.latestOutboundEventId, 'event-newer')
  assert.equal(retried.latestOutboundDeliveryStatus, 'sent')
  assert.equal(retried.latestOutboundErrorMessage, null)
})

test('provider status normalization maps delivery states conservatively', () => {
  assert.equal(mapProviderStatusToDeliveryStatus('queued'), 'pending')
  assert.equal(mapProviderStatusToDeliveryStatus('sent'), 'sent')
  assert.equal(mapProviderStatusToDeliveryStatus('delivered'), 'delivered')
  assert.equal(mapProviderStatusToDeliveryStatus('read'), 'read')
  assert.equal(mapProviderStatusToDeliveryStatus('undelivered'), 'failed')
  assert.equal(mapProviderStatusToDeliveryStatus('mystery-status', 'sent'), 'sent')
})
