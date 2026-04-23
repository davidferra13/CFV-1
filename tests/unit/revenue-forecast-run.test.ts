import test from 'node:test'
import assert from 'node:assert/strict'
import { __testOnly } from '@/lib/finance/revenue-forecast-run'

test('revenue forecast reconciliation uses the latest snapshot available before the month opened', () => {
  const reconciliations = __testOnly.buildRevenueForecastActualsReconciliation({
    currentMonth: '2026-05',
    actualByMonth: {
      '2026-04': 105000,
    },
    previousArtifacts: [
      {
        run: {
          id: 'run-before-open',
          tenantId: 'tenant-1',
          runType: 'revenue_forecast',
          runSource: 'scheduled',
          status: 'completed',
          scopeKey: 'default',
          asOfDate: '2026-03-31',
          horizonMonths: 6,
          generatorVersion: 'v1',
          requestPayload: {},
          summaryPayload: {},
          errorPayload: {},
          startedAt: '2026-03-31T06:00:00.000Z',
          completedAt: '2026-03-31T06:00:02.000Z',
        },
        artifact: {
          id: 'artifact-before-open',
          tenantId: 'tenant-1',
          runId: 'run-before-open',
          artifactKey: 'revenue_forecast',
          artifactVersion: 'revenue-forecast.v1',
          createdAt: '2026-03-31T06:00:02.000Z',
          provenance: {} as any,
          dataQuality: {
            overallStatus: 'pass',
            warningCount: 0,
            failureCount: 0,
            checks: [],
          },
          payload: {
            monthlyForecast: [
              {
                month: '2026-04',
                bookedRevenueCents: 50000,
                pipelineRevenueCents: 25000,
                pipelineOpenRevenueCents: 60000,
                historicalAvgCents: 100000,
                historicalFillCents: 25000,
                expectedRevenueCents: 100000,
                lowRevenueCents: 85000,
                highRevenueCents: 115000,
                visibleRevenueCoveragePercent: 75,
              },
            ],
          },
        },
      },
      {
        run: {
          id: 'run-after-open',
          tenantId: 'tenant-1',
          runType: 'revenue_forecast',
          runSource: 'interactive',
          status: 'completed',
          scopeKey: 'default',
          asOfDate: '2026-04-05',
          horizonMonths: 6,
          generatorVersion: 'v1',
          requestPayload: {},
          summaryPayload: {},
          errorPayload: {},
          startedAt: '2026-04-05T10:00:00.000Z',
          completedAt: '2026-04-05T10:00:01.000Z',
        },
        artifact: {
          id: 'artifact-after-open',
          tenantId: 'tenant-1',
          runId: 'run-after-open',
          artifactKey: 'revenue_forecast',
          artifactVersion: 'revenue-forecast.v1',
          createdAt: '2026-04-05T10:00:01.000Z',
          provenance: {} as any,
          dataQuality: {
            overallStatus: 'pass',
            warningCount: 0,
            failureCount: 0,
            checks: [],
          },
          payload: {
            monthlyForecast: [
              {
                month: '2026-04',
                bookedRevenueCents: 70000,
                pipelineRevenueCents: 20000,
                pipelineOpenRevenueCents: 45000,
                historicalAvgCents: 110000,
                historicalFillCents: 10000,
                expectedRevenueCents: 90000,
                lowRevenueCents: 75000,
                highRevenueCents: 105000,
                visibleRevenueCoveragePercent: 89,
              },
            ],
          },
        },
      },
    ] as any,
  })

  assert.equal(reconciliations.length, 1)
  assert.equal(reconciliations[0]?.forecastRunId, 'run-before-open')
  assert.equal(reconciliations[0]?.expectedRevenueCents, 100000)
  assert.equal(reconciliations[0]?.actualRevenueCents, 105000)
  assert.equal(reconciliations[0]?.variancePct, 5)
})

test('revenue forecast calibration summarizes closed-month error cleanly', () => {
  const calibration = __testOnly.buildRevenueForecastActualsCalibration([
    {
      month: '2026-04',
      forecastRunId: 'run-1',
      forecastGeneratedAt: '2026-03-31T06:00:00.000Z',
      forecastAsOfDate: '2026-03-31',
      expectedRevenueCents: 100000,
      actualRevenueCents: 105000,
      varianceCents: 5000,
      variancePct: 5,
      withinRange: true,
      lowRevenueCents: 85000,
      highRevenueCents: 115000,
      bookedRevenueCents: 50000,
      pipelineRevenueCents: 25000,
      historicalFillCents: 25000,
    },
    {
      month: '2026-03',
      forecastRunId: 'run-2',
      forecastGeneratedAt: '2026-02-28T06:00:00.000Z',
      forecastAsOfDate: '2026-02-28',
      expectedRevenueCents: 90000,
      actualRevenueCents: 81000,
      varianceCents: -9000,
      variancePct: -10,
      withinRange: false,
      lowRevenueCents: 85000,
      highRevenueCents: 95000,
      bookedRevenueCents: 40000,
      pipelineRevenueCents: 20000,
      historicalFillCents: 30000,
    },
  ])

  assert.equal(calibration.status, 'limited')
  assert.equal(calibration.sampleSize, 2)
  assert.equal(calibration.meanAbsolutePercentError, 7.5)
  assert.equal(calibration.meanAbsoluteCents, 7000)
  assert.equal(calibration.withinRangeRatePercent, 50)
  assert.equal(calibration.latestClosedMonth, '2026-04')
})
