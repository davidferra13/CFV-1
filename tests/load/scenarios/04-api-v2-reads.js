// 04 - API v2 Read Endpoints
// Tests REST API GET performance with API key authentication.
// Respects the 100 req/min rate limit per tenant by default.
//
// Usage: npx k6 run tests/load/scenarios/04-api-v2-reads.js
//   -e API_KEY=cf_live_xxx        (optional: use API key auth)
//
// Without API_KEY, authenticates via Supabase and uses the access token.

import http from 'k6/http'
import { sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { BASE_URL, DEFAULT_THRESHOLDS } from '../config.js'
import { authenticateViaSupabase, getApiHeaders } from '../helpers/auth.js'
import { checkJsonOk } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

// Keep VU count low - API has 100 req/min rate limit per tenant
const PROFILES = {
  smoke: { vus: 2, duration: '30s' },
  load: {
    stages: [
      { duration: '1m', target: 5 },
      { duration: '3m', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '2m', target: 30 },
      { duration: '3m', target: 30 },
      { duration: '1m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    financials_duration: ['p(95)<2000'], // Financial summary is expensive
  },
}

const eventsDuration = new Trend('events_list_duration', true)
const clientsDuration = new Trend('clients_list_duration', true)
const financialsDuration = new Trend('financials_duration', true)

const API_ROUTES = [
  { path: '/api/v2/events', weight: 35, name: 'events-list', trend: eventsDuration },
  { path: '/api/v2/clients', weight: 35, name: 'clients-list', trend: clientsDuration },
  { path: '/api/v2/financials/summary', weight: 30, name: 'financials', trend: financialsDuration },
]

function pickRoute() {
  const totalWeight = API_ROUTES.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const route of API_ROUTES) {
    rand -= route.weight
    if (rand <= 0) return route
  }
  return API_ROUTES[0]
}

export function setup() {
  const auth = authenticateViaSupabase()
  if (!auth) {
    throw new Error('Failed to authenticate. Cannot run API tests.')
  }
  return { accessToken: auth.accessToken }
}

export default function (data) {
  const route = pickRoute()
  const headers = getApiHeaders(data.accessToken)

  const res = http.get(`${BASE_URL}${route.path}`, { headers })

  // 429 = rate limited, don't count as failure if we hit the limit
  if (res.status === 429) {
    console.warn(`Rate limited on ${route.name}. Backing off.`)
    sleep(5) // Back off for 5 seconds
    return
  }

  checkJsonOk(res, route.name)
  route.trend.add(res.timings.duration)

  // Space requests to stay within rate limits (~1.5 req/sec per VU)
  sleep(0.5 + Math.random() * 1)
}
