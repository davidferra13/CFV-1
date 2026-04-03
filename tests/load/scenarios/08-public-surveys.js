// 08 - Public Survey Routes Load Test
// Tests the anonymous survey page routes under load.
// This scenario intentionally exercises page delivery only.
// It does not post submissions because the live route requires Turnstile.
//
// Usage: npx k6 run tests/load/scenarios/08-public-surveys.js

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
      { duration: '1m', target: 25 },
      { duration: '2m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '3m', target: 100 },
      { duration: '1m', target: 0 },
    ],
  },
}

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.load),
  thresholds: DEFAULT_THRESHOLDS,
}

const SURVEY_ROUTES = [
  {
    path: '/beta-survey/public/food-operator-wave-1?source=load_test&channel=k6',
    weight: 50,
    name: 'operator-survey',
  },
  {
    path: '/beta-survey/public/private-chef-client-wave-1?source=load_test&channel=k6',
    weight: 50,
    name: 'client-survey',
  },
]

function pickRoute() {
  const totalWeight = SURVEY_ROUTES.reduce((sum, route) => sum + route.weight, 0)
  let rand = Math.random() * totalWeight

  for (const route of SURVEY_ROUTES) {
    rand -= route.weight
    if (rand <= 0) return route
  }

  return SURVEY_ROUTES[0]
}

export default function runPublicSurveyLoad() {
  const route = pickRoute()
  const res = http.get(`${BASE_URL}${route.path}`)
  checkPageLoad(res, route.name)
  sleep(1 + Math.random() * 2)
}
