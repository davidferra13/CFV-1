import test from 'node:test'
import assert from 'node:assert/strict'

import {
  aggregateDiscoveryAnalytics,
  evaluateDiscoveryPruning,
} from '@/lib/discovery/discovery-analytics-readout'

test('discovery analytics readout aggregates rates without raw identifiers', () => {
  const metrics = aggregateDiscoveryAnalytics([
    {
      algorithm_version: 'v1',
      row_role: 'cuisine',
      item_type: 'cuisine',
      item_value: 'italian',
      destination_path: '/chefs',
      action: 'impression',
    },
    {
      algorithm_version: 'v1',
      row_role: 'cuisine',
      item_type: 'cuisine',
      item_value: 'italian',
      destination_path: '/chefs',
      action: 'click',
    },
    {
      algorithm_version: 'v1',
      row_role: 'cuisine',
      item_type: 'cuisine',
      item_value: 'italian',
      destination_path: '/chefs',
      action: 'long_dwell',
    },
    {
      algorithm_version: 'v1',
      row_role: 'cuisine',
      item_type: 'cuisine',
      item_value: 'italian',
      destination_path: '/chefs',
      action: 'inquiry_submitted',
    },
  ])

  assert.equal(metrics.length, 1)
  assert.equal(metrics[0].clickThroughRate, 1)
  assert.equal(metrics[0].longDwellRate, 1)
  assert.equal(metrics[0].conversionRate, 1)
})

test('discovery pruning protects strategic fallbacks and demotes weak items after threshold', () => {
  const decisions = evaluateDiscoveryPruning(
    [
      {
        key: 'saved',
        algorithmVersion: 'v1',
        rowRole: 'intent',
        itemType: 'saved',
        itemValue: 'chef',
        destinationPath: '/chef/nina',
        impressions: 100,
        clicks: 0,
        longDwells: 0,
        quickBacks: 0,
        inquiryStarts: 0,
        inquirySubmits: 0,
        bookings: 0,
        clickThroughRate: 0,
        quickBackRate: 0,
        longDwellRate: 0,
        conversionRate: 0,
      },
      {
        key: 'weak',
        algorithmVersion: 'v1',
        rowRole: 'cuisine',
        itemType: 'food_type',
        itemValue: 'x',
        destinationPath: '/nearby',
        impressions: 100,
        clicks: 0,
        longDwells: 0,
        quickBacks: 0,
        inquiryStarts: 0,
        inquirySubmits: 0,
        bookings: 0,
        clickThroughRate: 0,
        quickBackRate: 0,
        longDwellRate: 0,
        conversionRate: 0,
      },
    ],
    { minimumImpressions: 50 }
  )

  assert.equal(decisions[0].action, 'protect')
  assert.equal(decisions[1].action, 'demote')
})
