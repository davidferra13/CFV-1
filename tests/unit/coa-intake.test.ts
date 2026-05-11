import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { evaluateCoaForBatch } from '@/lib/compliance/coa-intake'

describe('COA intake', () => {
  it('accepts a matching COA with potency and required safety panels', () => {
    const result = evaluateCoaForBatch({
      expectedLotNumber: 'LOT-42',
      sourceMaterialType: 'solvent_extract',
      coa: {
        lotNumber: 'LOT-42',
        batchNumber: 'B-42',
        labName: 'Example ISO Lab',
        labAccreditation: 'ISO/IEC 17025',
        sampleCollectedAt: '2026-05-01',
        reportIssuedAt: '2026-05-04',
        cannabinoidPanel: {
          unit: 'percent',
          analytes: {
            THC: 1,
            THCA: 20,
            CBD: 0,
            CBDA: 0,
          },
        },
        contaminantPanels: {
          pesticides: 'pass',
          heavyMetals: 'pass',
          microbial: 'pass',
          mycotoxins: 'pass',
          residualSolvents: 'pass',
          foreignMaterial: 'pass',
        },
      },
    })

    assert.equal(result.status, 'accepted')
    assert.deepEqual(result.redFlags, [])
    assert.equal(result.totalThc, 18.54)
  })

  it('rejects a failed safety panel and flags missing solvent testing for solvent extracts', () => {
    const result = evaluateCoaForBatch({
      expectedLotNumber: 'LOT-42',
      sourceMaterialType: 'solvent_extract',
      coa: {
        lotNumber: 'LOT-42',
        labName: 'Example Lab',
        sampleCollectedAt: '2026-05-01',
        reportIssuedAt: '2026-05-04',
        cannabinoidPanel: {
          unit: 'percent',
          analytes: {
            THC: 5,
          },
        },
        contaminantPanels: {
          pesticides: 'pass',
          heavyMetals: 'fail',
          microbial: 'pass',
          mycotoxins: 'pass',
          foreignMaterial: 'pass',
        },
      },
    })

    assert.equal(result.status, 'rejected')
    assert.equal(
      result.redFlags.some((flag) => flag.code === 'failed_panel'),
      true
    )
    assert.equal(
      result.redFlags.some((flag) => flag.code === 'missing_residual_solvents'),
      true
    )
  })
})
