// Authentication helpers for k6 load tests.
// Two strategies: E2E endpoint (dev server only) and direct database auth (any env).

import http from 'k6/http'
import { check } from 'k6'
import encoding from 'k6/encoding'
import { BASE_URL, DB_URL, DB_ANON_KEY, AGENT_EMAIL, AGENT_PASSWORD } from '../config.js'

/**
 * Authenticate via the /api/e2e/auth endpoint (dev server only, NODE_ENV=development).
 * Returns cookie jar with session cookies that k6 will include in subsequent requests.
 *
 * Call this in setup() and pass the result to default function via return value.
 */
export function authenticateViaE2E() {
  const jar = http.cookieJar()
  const res = http.post(
    `${BASE_URL}/api/e2e/auth`,
    JSON.stringify({ email: AGENT_EMAIL, password: AGENT_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      jar,
    }
  )

  const ok = check(res, {
    'e2e auth: status 200': (r) => r.status === 200,
    'e2e auth: body has ok': (r) => {
      try {
        return JSON.parse(r.body).ok === true
      } catch {
        return false
      }
    },
  })

  if (!ok) {
    console.error(`E2E auth failed: ${res.status} ${res.body}`)
    console.error('Ensure dev server is running on port 3100 with E2E_ALLOW_REMOTE=true')
  }

  // Extract cookies set by the response
  const cookies = jar.cookiesForURL(BASE_URL)
  return { cookies, jar }
}

/**
 * Authenticate directly against Auth REST API.
 * Works against any environment (dev, beta, prod) since it bypasses the app server.
 * Returns the access token and formatted cookie headers.
 */
export function authenticateViaDb() {
  const res = http.post(
    `${DB_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: AGENT_EMAIL, password: AGENT_PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: DB_ANON_KEY,
      },
    }
  )

  const ok = check(res, {
    'database auth: status 200': (r) => r.status === 200,
  })

  if (!ok) {
    console.error(`database auth failed: ${res.status} ${res.body}`)
    return null
  }

  const data = JSON.parse(res.body)
  const accessToken = data.access_token
  const refreshToken = data.refresh_token

  // Auth SSR stores the session as a base64-encoded JSON cookie.
  // The cookie name follows the pattern: sb-{project-ref}-auth-token
  // For large JWTs it chunks into .0, .1, etc. but most fit in one cookie.
  const cookieValue = encoding.b64encode(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: data.expires_in,
      expires_at: data.expires_at,
    })
  )

  // Determine the cookie name from the database URL
  // For hosted: sb-{ref}-auth-token
  // For local: sb-127-auth-token or similar
  let cookieName = 'sb-luefkpakzvxcsqroxyhz-auth-token'
  if (DB_URL.includes('127.0.0.1') || DB_URL.includes('localhost')) {
    cookieName = 'sb-127-auth-token'
  }

  // If the cookie value is too long (> 3180 chars), chunk it
  const MAX_CHUNK = 3180
  const cookieHeaders = {}
  if (cookieValue.length > MAX_CHUNK) {
    const chunks = Math.ceil(cookieValue.length / MAX_CHUNK)
    for (let i = 0; i < chunks; i++) {
      cookieHeaders[`${cookieName}.${i}`] = cookieValue.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK)
    }
  } else {
    cookieHeaders[cookieName] = cookieValue
  }

  return {
    accessToken,
    refreshToken,
    cookieName,
    cookieHeaders,
  }
}

/**
 * Apply database auth cookies to the cookie jar for a given URL.
 * Use this when authenticating via direct database auth (not e2e endpoint).
 */
export function applyAuthCookies(authData) {
  if (!authData) return

  const jar = http.cookieJar()
  for (const [name, value] of Object.entries(authData.cookieHeaders)) {
    jar.set(BASE_URL, name, value)
  }
  return jar
}

/**
 * Get headers for API v2 endpoints (Bearer token auth).
 * Pass the API key as an env var: k6 run -e API_KEY=cf_live_xxx ...
 * Or use the access token as a fallback.
 */
export function getApiHeaders(accessToken) {
  const apiKey = __ENV.API_KEY
  return {
    'Content-Type': 'application/json',
    Authorization: apiKey ? `Bearer ${apiKey}` : `Bearer ${accessToken}`,
  }
}
