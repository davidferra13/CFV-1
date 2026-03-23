// 03 - Chef Portal Load Test
// Simulates authenticated chef users browsing the main portal pages.
// Weighted by real-world frequency: dashboard is heaviest.
//
// Usage: npx k6 run tests/load/scenarios/03-chef-portal.js
// Requires: Dev server on port 3100 with SUPABASE_E2E_ALLOW_REMOTE=true

import http from 'k6/http'
import { sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { BASE_URL, DEFAULT_THRESHOLDS, LOAD_STAGES } from '../config.js'
import { authenticateViaSupabase } from '../helpers/auth.js'
import { checkPageLoad, checkNotRedirectedToSignIn } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

const PROFILES = {
  smoke: { vus: 2, duration: '30s' },
  load: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 30 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '2m', target: 30 },
      { duration: '2m', target: 80 },
      { duration: '2m', target: 150 },
      { duration: '3m', target: 150 },
      { duration: '2m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    dashboard_duration: ['p(95)<1000'], // Dashboard is heavy, allow 1s
    events_duration: ['p(95)<800'],
    clients_duration: ['p(95)<800'],
  },
}

// Custom metrics per route
const dashboardDuration = new Trend('dashboard_duration', true)
const eventsDuration = new Trend('events_duration', true)
const clientsDuration = new Trend('clients_duration', true)
const calendarDuration = new Trend('calendar_duration', true)
const analyticsDuration = new Trend('analytics_duration', true)
const settingsDuration = new Trend('settings_duration', true)

const CHEF_ROUTES = [
  { path: '/dashboard', weight: 40, name: 'dashboard', trend: dashboardDuration },
  { path: '/events', weight: 20, name: 'events', trend: eventsDuration },
  { path: '/clients', weight: 15, name: 'clients', trend: clientsDuration },
  { path: '/calendar/week', weight: 10, name: 'calendar', trend: calendarDuration },
  { path: '/analytics', weight: 10, name: 'analytics', trend: analyticsDuration },
  { path: '/settings', weight: 5, name: 'settings', trend: settingsDuration },
]

function pickRoute() {
  const totalWeight = CHEF_ROUTES.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const route of CHEF_ROUTES) {
    rand -= route.weight
    if (rand <= 0) return route
  }
  return CHEF_ROUTES[0]
}

export function setup() {
  const auth = authenticateViaSupabase()
  if (!auth) {
    throw new Error('Failed to authenticate. Cannot run chef portal tests.')
  }
  return { auth }
}

export default function (data) {
  // Set auth cookies on this VU's cookie jar
  if (data.auth) {
    const jar = http.cookieJar()
    for (const [name, value] of Object.entries(data.auth.cookieHeaders)) {
      jar.set(BASE_URL, name, value)
    }
  }

  const route = pickRoute()
  const res = http.get(`${BASE_URL}${route.path}`)

  checkPageLoad(res, route.name)
  checkNotRedirectedToSignIn(res, route.name)

  // Track per-route latency
  route.trend.add(res.timings.duration)

  // Simulate real user browsing: 2-5 seconds between pages
  sleep(2 + Math.random() * 3)
}
