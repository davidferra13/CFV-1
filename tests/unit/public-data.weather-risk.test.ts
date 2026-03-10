import test from 'node:test'
import assert from 'node:assert/strict'
import { computeOperationalRiskLevel } from '@/lib/public-data/weather-risk'

test('computeOperationalRiskLevel escalates severe alerts to critical', () => {
  const result = computeOperationalRiskLevel({
    alerts: [
      {
        id: 'alert-1',
        event: 'Severe Thunderstorm Warning',
        headline: 'Severe thunderstorm warning',
        severity: 'Severe',
        urgency: 'Immediate',
        certainty: 'Observed',
        effective: null,
        ends: null,
        areaDesc: null,
        instruction: null,
      },
    ],
    airQuality: null,
  })

  assert.equal(result.riskLevel, 'critical')
  assert.match(result.reasons[0], /severe alert/i)
})

test('computeOperationalRiskLevel escalates unhealthy AQI to high without alerts', () => {
  const result = computeOperationalRiskLevel({
    alerts: [],
    airQuality: {
      aqi: 132,
      category: 'Unhealthy for Sensitive Groups',
      parameter: 'PM2.5',
      reportingArea: 'Portland',
      stateCode: 'ME',
      observedAt: '2026-03-10 10:00 EST',
    },
  })

  assert.equal(result.riskLevel, 'high')
  assert.match(result.reasons.join(' '), /AQI 132/)
})
