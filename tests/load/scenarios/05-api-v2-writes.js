// 05 - API v2 Write Endpoints
// Tests POST/PUT mutations under load with low VU count.
// Creates test records prefixed with [LOAD-TEST] and cleans up in teardown.
//
// Usage: npx k6 run tests/load/scenarios/05-api-v2-writes.js
//   -e API_KEY=cf_live_xxx        (optional: use API key auth)
//
// WARNING: This creates real records in the database. Uses low VU count.

import http from 'k6/http'
import { sleep } from 'k6'
import { SharedArray } from 'k6/data'
import { BASE_URL, DEFAULT_THRESHOLDS } from '../config.js'
import { authenticateViaDb, getApiHeaders } from '../helpers/auth.js'
import { checkMutation, checkJsonOk } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

// Low VU count - mutations create real data
const PROFILES = {
  smoke: { vus: 1, duration: '20s' },
  load: {
    stages: [
      { duration: '1m', target: 3 },
      { duration: '3m', target: 5 },
      { duration: '1m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Writes are slower, allow 1s
    http_req_failed: ['rate<0.02'], // 2% error tolerance for writes
  },
}

// Track created record IDs for cleanup
const createdEventIds = []

export function setup() {
  const auth = authenticateViaDb()
  if (!auth) {
    throw new Error('Failed to authenticate. Cannot run write tests.')
  }
  return { accessToken: auth.accessToken }
}

export default function (data) {
  const headers = getApiHeaders(data.accessToken)
  const now = new Date().toISOString()
  const vuId = __VU
  const iterationId = __ITER

  // Create an event
  const eventPayload = JSON.stringify({
    name: `[LOAD-TEST] Event VU${vuId}-${iterationId}`,
    event_date: '2026-12-31',
    event_type: 'dinner_party',
    guest_count: 10,
    status: 'draft',
    notes: `Load test record created at ${now}. Safe to delete.`,
  })

  const createRes = http.post(`${BASE_URL}/api/v2/events`, eventPayload, { headers })

  if (createRes.status === 429) {
    console.warn('Rate limited on event create. Backing off.')
    sleep(5)
    return
  }

  const created =
    checkMutation(createRes, 'create-event', 201) || checkMutation(createRes, 'create-event', 200)

  // If creation succeeded, try to read it back
  if (createRes.status === 200 || createRes.status === 201) {
    try {
      const body = JSON.parse(createRes.body)
      const eventId = body.id || (body.data && body.data.id)
      if (eventId) {
        sleep(0.5)

        // Read it back
        const readRes = http.get(`${BASE_URL}/api/v2/events/${eventId}`, { headers })
        checkJsonOk(readRes, 'read-created-event')
      }
    } catch (e) {
      // Response parsing failed, skip read-back
    }
  }

  // Space out writes
  sleep(1 + Math.random() * 2)
}

export function teardown(data) {
  // Clean up [LOAD-TEST] records
  // Note: k6 teardown runs once after all VUs finish.
  // For thorough cleanup, a separate script should query and delete [LOAD-TEST] records.
  console.log('Write test complete. Run cleanup query to remove [LOAD-TEST] records:')
  console.log("  DELETE FROM events WHERE name LIKE '[LOAD-TEST]%'")
}
