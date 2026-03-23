// Shared response validation helpers for k6 load tests.

import { check } from 'k6'

/**
 * Check that a response is a successful page load (200, has HTML).
 */
export function checkPageLoad(res, name) {
  return check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: has body`]: (r) => r.body && r.body.length > 0,
  })
}

/**
 * Check that a response is a successful JSON API response.
 */
export function checkJsonOk(res, name) {
  return check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: is JSON`]: (r) => {
      const ct = r.headers['Content-Type'] || r.headers['content-type'] || ''
      return ct.includes('application/json')
    },
  })
}

/**
 * Check that a response is not a redirect to /sign-in (auth worked).
 */
export function checkNotRedirectedToSignIn(res, name) {
  return check(res, {
    [`${name}: not redirected to sign-in`]: (r) => {
      return r.status !== 307 && r.status !== 302 && !r.url.includes('/sign-in')
    },
  })
}

/**
 * Check a mutation response (POST/PUT/DELETE).
 */
export function checkMutation(res, name, expectedStatus = 200) {
  return check(res, {
    [`${name}: status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name}: has response body`]: (r) => r.body && r.body.length > 0,
  })
}

/**
 * Check health endpoint response.
 */
export function checkHealth(res, name) {
  return check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
    [`${name}: status ok`]: (r) => {
      try {
        return JSON.parse(r.body).status === 'ok'
      } catch {
        return false
      }
    },
  })
}
