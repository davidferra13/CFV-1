// 00 - Smoke Test
// Quick sanity check (1-2 VUs, 30s) that validates the load test setup works.
// Run this first before any larger tests.
//
// Usage: npx k6 run tests/load/scenarios/00-smoke.js

import http from 'k6/http'
import { sleep } from 'k6'
import { BASE_URL, DEFAULT_THRESHOLDS } from '../config.js'
import { authenticateViaSupabase } from '../helpers/auth.js'
import { checkHealth, checkPageLoad, checkNotRedirectedToSignIn } from '../helpers/checks.js'

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: DEFAULT_THRESHOLDS,
}

export function setup() {
  // Verify server is up
  const healthRes = http.get(`${BASE_URL}/api/health/ping`)
  if (healthRes.status !== 200) {
    console.error(`Server not responding at ${BASE_URL}. Got status ${healthRes.status}`)
    return { serverUp: false }
  }

  // Authenticate via Supabase (returns cookie data to set per-VU)
  const auth = authenticateViaSupabase()
  return { serverUp: true, auth }
}

export default function (data) {
  // 1. Health check (no auth)
  const healthRes = http.get(`${BASE_URL}/api/health/ping`)
  checkHealth(healthRes, 'health/ping')
  sleep(1)

  // 2. Authenticated dashboard load
  if (data.auth) {
    // Set auth cookies on this VU's cookie jar
    const jar = http.cookieJar()
    for (const [name, value] of Object.entries(data.auth.cookieHeaders)) {
      jar.set(BASE_URL, name, value)
    }

    const dashRes = http.get(`${BASE_URL}/dashboard`)
    checkPageLoad(dashRes, 'dashboard')
    checkNotRedirectedToSignIn(dashRes, 'dashboard')
  }
  sleep(1)
}
