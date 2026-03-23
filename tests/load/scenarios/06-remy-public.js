// 06 - Remy Public AI Endpoint
// Tests concurrent AI requests to the public Remy concierge.
// Uses longer timeout thresholds since Ollama responses take seconds.
//
// Usage: npx k6 run tests/load/scenarios/06-remy-public.js
//
// Prerequisites: Ollama must be running (ollama serve)

import http from 'k6/http'
import { sleep } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { BASE_URL, AI_THRESHOLDS } from '../config.js'
import { checkJsonOk } from '../helpers/checks.js'

const PROFILE = __ENV.PROFILE || 'load'

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
      { duration: '1m', target: 5 },
      { duration: '2m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: AI_THRESHOLDS,
}

const remyDuration = new Trend('remy_response_time', true)
const remyErrors = new Counter('remy_errors')

// Sample messages that a public visitor might send
const SAMPLE_MESSAGES = [
  'Do you cater for events with 50 guests?',
  'What types of cuisine do you offer?',
  'How far in advance should I book?',
  'Do you accommodate dietary restrictions?',
  'What is included in your service?',
  'Can you do a tasting before the event?',
  'Do you provide staff as well?',
  'What areas do you serve?',
]

export function setup() {
  // Check if Ollama is running
  const healthRes = http.get(`${BASE_URL}/api/health/readiness`, { timeout: '10s' })
  if (healthRes.status !== 200) {
    console.warn('Health check failed. Ollama may not be running.')
  }
  return {}
}

export default function () {
  const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)]

  const res = http.post(
    `${BASE_URL}/api/remy/public`,
    JSON.stringify({
      message,
      conversationId: `load-test-${__VU}-${__ITER}`,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s', // AI responses can be slow
    }
  )

  if (res.status === 200) {
    checkJsonOk(res, 'remy-public')
    remyDuration.add(res.timings.duration)
  } else {
    remyErrors.add(1)
    if (res.status === 503 || res.status === 504) {
      console.warn(`Remy unavailable (${res.status}). Ollama may be overloaded.`)
    }
  }

  // Longer think time for AI - real users read the response
  sleep(3 + Math.random() * 5)
}
