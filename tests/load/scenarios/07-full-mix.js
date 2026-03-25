// 07 - Full Traffic Mix
// Combined realistic traffic simulation with multiple concurrent scenarios.
// Weights: 30% public browsing, 50% chef portal, 15% API integrations, 5% AI.
//
// Usage: npx k6 run tests/load/scenarios/07-full-mix.js
//   -e PROFILE=smoke|load|stress|spike

import http from 'k6/http'
import { sleep } from 'k6'
import { Trend, Counter, Rate } from 'k6/metrics'
import { BASE_URL, LOAD_STAGES, STRESS_STAGES, SPIKE_STAGES } from '../config.js'
import { authenticateViaDb, getApiHeaders } from '../helpers/auth.js'
import {
  checkPageLoad,
  checkJsonOk,
  checkHealth,
  checkNotRedirectedToSignIn,
} from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

// Scenario-specific metrics
const publicLatency = new Trend('public_latency', true)
const chefLatency = new Trend('chef_latency', true)
const apiLatency = new Trend('api_latency', true)
const aiLatency = new Trend('ai_latency', true)
const errorRate = new Rate('error_rate')

function getStages() {
  switch (PROFILE) {
    case 'smoke':
      return [{ duration: '30s', target: 5 }]
    case 'stress':
      return STRESS_STAGES
    case 'spike':
      return SPIKE_STAGES
    default:
      return LOAD_STAGES
  }
}

function getThresholds() {
  switch (PROFILE) {
    case 'stress':
    case 'spike':
      return {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
        error_rate: ['rate<0.10'],
      }
    default:
      return {
        http_req_duration: ['p(95)<800'],
        http_req_failed: ['rate<0.01'],
        error_rate: ['rate<0.05'],
      }
  }
}

const stages = getStages()

export const options = {
  scenarios: {
    public_browsing: {
      executor: 'ramping-vus',
      stages: stages.map((s) => ({ ...s, target: Math.ceil(s.target * 0.3) })),
      exec: 'publicBrowsing',
      gracefulRampDown: '10s',
    },
    chef_portal: {
      executor: 'ramping-vus',
      stages: stages.map((s) => ({ ...s, target: Math.ceil(s.target * 0.5) })),
      exec: 'chefPortal',
      gracefulRampDown: '10s',
    },
    api_integrations: {
      executor: 'ramping-vus',
      stages: stages.map((s) => ({ ...s, target: Math.ceil(s.target * 0.15) })),
      exec: 'apiIntegrations',
      gracefulRampDown: '10s',
    },
    ai_requests: {
      executor: 'ramping-vus',
      stages: stages.map((s) => ({ ...s, target: Math.max(1, Math.ceil(s.target * 0.05)) })),
      exec: 'aiRequests',
      gracefulRampDown: '10s',
    },
  },
  thresholds: getThresholds(),
}

// --- Setup ---

export function setup() {
  let auth = null
  try {
    auth = authenticateViaDb()
  } catch (e) {
    console.warn('Auth failed. Authenticated scenarios will skip auth.')
  }

  return {
    auth,
    accessToken: auth ? auth.accessToken : null,
  }
}

// --- Scenario: Public Browsing (30%) ---

const PUBLIC_PAGES = ['/', '/pricing', '/about', '/contact', '/faq']

export function publicBrowsing() {
  const page = PUBLIC_PAGES[Math.floor(Math.random() * PUBLIC_PAGES.length)]
  const res = http.get(`${BASE_URL}${page}`)

  const ok = checkPageLoad(res, `public:${page}`)
  errorRate.add(!ok)
  publicLatency.add(res.timings.duration)

  sleep(1 + Math.random() * 3)
}

// --- Scenario: Chef Portal (50%) ---

const CHEF_PAGES = [
  { path: '/dashboard', weight: 40 },
  { path: '/events', weight: 25 },
  { path: '/clients', weight: 15 },
  { path: '/calendar/week', weight: 10 },
  { path: '/settings', weight: 10 },
]

function pickChefPage() {
  const total = CHEF_PAGES.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of CHEF_PAGES) {
    r -= p.weight
    if (r <= 0) return p.path
  }
  return CHEF_PAGES[0].path
}

export function chefPortal(data) {
  // Set auth cookies per-VU
  if (data && data.auth) {
    const jar = http.cookieJar()
    for (const [name, value] of Object.entries(data.auth.cookieHeaders)) {
      jar.set(BASE_URL, name, value)
    }
  }

  const page = pickChefPage()
  const res = http.get(`${BASE_URL}${page}`)

  const ok = checkPageLoad(res, `chef:${page}`)
  checkNotRedirectedToSignIn(res, `chef:${page}`)
  errorRate.add(!ok)
  chefLatency.add(res.timings.duration)

  sleep(2 + Math.random() * 3)
}

// --- Scenario: API Integrations (15%) ---

const API_ENDPOINTS = ['/api/v2/events', '/api/v2/clients', '/api/health/ping']

export function apiIntegrations(data) {
  const endpoint = API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)]

  let res
  if (endpoint.startsWith('/api/v2/') && data.accessToken) {
    const headers = getApiHeaders(data.accessToken)
    res = http.get(`${BASE_URL}${endpoint}`, { headers })
  } else {
    res = http.get(`${BASE_URL}${endpoint}`)
  }

  if (res.status === 429) {
    sleep(3)
    return
  }

  const ok = checkJsonOk(res, `api:${endpoint}`)
  errorRate.add(!ok)
  apiLatency.add(res.timings.duration)

  sleep(1 + Math.random() * 2)
}

// --- Scenario: AI Requests (5%) ---

const AI_MESSAGES = [
  'What services do you offer?',
  'How does booking work?',
  'Do you cater for large events?',
  'What dietary options are available?',
]

export function aiRequests() {
  const message = AI_MESSAGES[Math.floor(Math.random() * AI_MESSAGES.length)]

  const res = http.post(
    `${BASE_URL}/api/remy/public`,
    JSON.stringify({
      message,
      conversationId: `load-mix-${__VU}-${__ITER}`,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  )

  const ok = res.status === 200
  errorRate.add(!ok)
  if (ok) aiLatency.add(res.timings.duration)

  sleep(5 + Math.random() * 5)
}
