import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeLivePrivacySurfacePrivateOnce,
  setLivePrivacySurfacePrivateOnce,
  shouldShareActivitySignal,
  shouldSharePresenceSignal,
  type LivePrivacyState,
} from '@/components/activity/live-privacy-controls'
import {
  getLiveSignalConfidenceCopy,
  getPrivacyAwareFollowUpCopy,
  shouldPromoteLiveSignal,
  summarizeLiveSignals,
} from '@/lib/activity/live-signal-policy'

function state(overrides: Partial<LivePrivacyState> = {}): LivePrivacyState {
  return {
    mode: 'visible',
    settings: {
      sharePresence: true,
      sharePageViews: true,
      shareProposalViews: true,
      shareInvoiceViews: true,
      shareMessageReads: true,
      shareTyping: true,
      sharePaymentPageVisits: true,
      shareDownloads: true,
    },
    surfaceDefaults: {
      proposals: 'inherit',
      invoices: 'inherit',
      messages: 'inherit',
      events: 'inherit',
      menus: 'inherit',
      documents: 'inherit',
      payments: 'inherit',
    },
    receipts: [],
    ...overrides,
  }
}

function installWindowStorage() {
  const session = new Map<string, string>()
  const local = new Map<string, string>()
  ;(globalThis as any).window = {
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => session.delete(key),
    },
    localStorage: {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
      removeItem: (key: string) => local.delete(key),
    },
    dispatchEvent: () => true,
  }
}

test('live privacy suppresses passive signals in private mode', () => {
  const privateState = state({ mode: 'private-session' })

  assert.equal(shouldShareActivitySignal('proposal_viewed', privateState), false)
  assert.equal(shouldShareActivitySignal('payment_page_visited', privateState), false)
  assert.equal(shouldSharePresenceSignal(privateState), false)
})

test('live privacy keeps functional submissions shareable', () => {
  const privateState = state({ mode: 'private-device' })

  assert.equal(shouldShareActivitySignal('chat_message_sent', privateState), true)
  assert.equal(shouldShareActivitySignal('form_submitted', privateState), true)
  assert.equal(shouldShareActivitySignal('rsvp_submitted', privateState), true)
})

test('per-surface defaults override matching passive signals', () => {
  const privacyState = state({
    surfaceDefaults: {
      ...state().surfaceDefaults,
      proposals: 'private',
      payments: 'visible',
    },
  })

  assert.equal(shouldShareActivitySignal('proposal_viewed', privacyState), false)
  assert.equal(shouldShareActivitySignal('quote_viewed', privacyState), false)
  assert.equal(shouldShareActivitySignal('payment_page_visited', privacyState), true)
})

test('private-once surfaces are consumed once', () => {
  installWindowStorage()

  setLivePrivacySurfacePrivateOnce('proposals')

  assert.equal(consumeLivePrivacySurfacePrivateOnce('proposals'), true)
  assert.equal(consumeLivePrivacySurfacePrivateOnce('proposals'), false)
})

test('signal policy promotes only high-intent non-private first signals', () => {
  assert.equal(shouldPromoteLiveSignal({ eventType: 'proposal_viewed' }), true)
  assert.equal(shouldPromoteLiveSignal({ eventType: 'proposal_viewed', privateMode: true }), false)
  assert.equal(
    shouldPromoteLiveSignal({ eventType: 'proposal_viewed', duplicateCountInWindow: 1 }),
    false
  )
  assert.equal(shouldPromoteLiveSignal({ eventType: 'page_viewed' }), false)
})

test('signal digest summarizes visible and private activity without overclaiming', () => {
  const digest = summarizeLiveSignals([
    { eventType: 'proposal_viewed' },
    { eventType: 'quote_viewed' },
    { eventType: 'payment_page_visited' },
    { eventType: 'chat_message_sent' },
    { eventType: 'proposal_viewed', privateMode: true },
  ])

  assert.equal(digest.proposalReviews, 2)
  assert.equal(digest.paymentPageVisits, 1)
  assert.equal(digest.messagesSent, 1)
  assert.equal(digest.privateSignals, 1)
  assert.equal(digest.highIntentSignals, 3)
  assert.equal(digest.totalSignals, 5)
})

test('follow-up and confidence copy avoid surveillance wording', () => {
  assert.match(getPrivacyAwareFollowUpCopy('proposal_viewed'), /questions about the proposal/)
  assert.doesNotMatch(getPrivacyAwareFollowUpCopy('proposal_viewed'), /saw you/i)
  assert.match(getLiveSignalConfidenceCopy(false), /may be browsing privately/)
})
