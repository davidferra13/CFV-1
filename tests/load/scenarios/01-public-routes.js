// 01 - Public Routes Load Test
// Tests unauthenticated pages (landing, pricing, public chef profiles).
// Measures Next.js SSR throughput without auth overhead.
//
// Usage: npx k6 run tests/load/scenarios/01-public-routes.js

import http from 'k6/http'
import { sleep } from 'k6'
import { BASE_URL, DEFAULT_THRESHOLDS, LOAD_STAGES } from '../config.js'
import { checkPageLoad } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

const PROFILES = {
  smoke: { vus: 2, duration: '30s' },
  load: { stages: LOAD_STAGES },
  stress: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '3m', target: 200 },
      { duration: '1m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: DEFAULT_THRESHOLDS,
}

const PUBLIC_ROUTES = [
  { path: '/', weight: 30, name: 'landing' },
  { path: '/pricing', weight: 20, name: 'pricing' },
  { path: '/about', weight: 15, name: 'about' },
  { path: '/contact', weight: 10, name: 'contact' },
  { path: '/terms', weight: 5, name: 'terms' },
  { path: '/privacy', weight: 5, name: 'privacy' },
  { path: '/faq', weight: 15, name: 'faq' },
]

// Weighted random route selection
function pickRoute() {
  const totalWeight = PUBLIC_ROUTES.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const route of PUBLIC_ROUTES) {
    rand -= route.weight
    if (rand <= 0) return route
  }
  return PUBLIC_ROUTES[0]
}

export default function () {
  const route = pickRoute()
  const res = http.get(`${BASE_URL}${route.path}`)
  checkPageLoad(res, route.name)

  // Simulate real user think time (1-3 seconds between page loads)
  sleep(1 + Math.random() * 2)
}
