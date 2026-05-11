import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildRegulatedBatchRecord } from '@/lib/compliance/batch-record'

describe('regulated batch record', () => {
  it('turns source material, COA, process losses, and final volume into an audit-ready summary', () => {
    const record = buildRegulatedBatchRecord({
      batchId: 'TINCTURE-001',
      sourceMaterial: {
        materialName: 'Flower lot A',
        lotNumber: 'LOT-A',
        materialType: 'flower',
        materialGrams: 10,
      },
      coa: {
        lotNumber: 'LOT-A',
        labName: 'Example ISO Lab',
        labAccreditation: 'ISO/IEC 17025',
        sampleCollectedAt: '2026-05-01',
        reportIssuedAt: '2026-05-04',
        cannabinoidPanel: {
          unit: 'percent',
          analytes: {
            THC: 1,
            THCA: 20,
          },
        },
        contaminantPanels: {
          pesticides: 'pass',
          heavyMetals: 'pass',
          microbial: 'pass',
          mycotoxins: 'pass',
          foreignMaterial: 'pass',
        },
      },
      process: {
        decarbEfficiency: 0.9,
        extractionEfficiency: 0.8,
        transferEfficiency: 0.95,
        retentionEfficiency: 1,
      },
      finalProduct: {
        finalVolumeMl: 60,
        targetDoseMg: 2.5,
      },
    })

    assert.equal(record.status, 'review')
    assert.equal(record.sourceIdentity.lotMatched, true)
    assert.equal(record.potency.totalThc, 18.54)
    assert.equal(record.potency.potentialThcMg, 1854)
    assert.equal(record.potency.estimatedFinishedThcMg, 1268.136)
    assert.equal(record.potency.estimatedMgPerMl, 21.1356)
    assert.equal(record.dosing.targetDoseVolumeMl, 0.118284)
    assert.equal(
      record.releaseChecks.some((check) => check.code === 'missing_label_claim'),
      true
    )
  })
})
