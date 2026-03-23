// 02 - Health Endpoints Baseline
// Pure API performance baseline. No auth, no DB on /ping.
// Establishes the theoretical throughput ceiling of the Node.js process.
//
// Usage: npx k6 run tests/load/scenarios/02-health-endpoints.js

import http from 'k6/http'
import { sleep } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { BASE_URL } from '../config.js'
import { checkHealth, checkJsonOk } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

const PROFILES = {
  smoke: { vus: 5, duration: '15s' },
  load: { vus: 100, duration: '2m' },
  stress: { vus: 500, duration: '2m' },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // Very tight: health should be fast
    http_req_failed: ['rate<0.01'],
    ping_duration: ['p(95)<50'], // /ping should be under 50ms
  },
}

const pingDuration = new Trend('ping_duration', true)
const healthDuration = new Trend('health_duration', true)
const readinessDuration = new Trend('readiness_duration', true)

export default function () {
  // /api/health/ping - no DB, no external calls, target <50ms
  const pingRes = http.get(`${BASE_URL}/api/health/ping`)
  checkHealth(pingRes, 'ping')
  pingDuration.add(pingRes.timings.duration)

  // /api/health - includes DB check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  checkJsonOk(healthRes, 'health')
  healthDuration.add(healthRes.timings.duration)

  // /api/health/readiness - deep check
  const readyRes = http.get(`${BASE_URL}/api/health/readiness`)
  checkJsonOk(readyRes, 'readiness')
  readinessDuration.add(readyRes.timings.duration)

  sleep(0.1) // Minimal pause to avoid pure CPU spin
}
