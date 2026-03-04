import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeLineTaxCents,
  getTaxClassRateMultiplier,
  isPosManagerRole,
  readPosManagerRoleSetFromEnv,
} from '@/lib/commerce/kiosk-policy'

describe('commerce kiosk policy', () => {
  it('reads manager roles from env csv', () => {
    const roles = readPosManagerRoleSetFromEnv('manager, lead_chef , cash_lead')
    assert.equal(roles.has('manager'), true)
    assert.equal(roles.has('lead_chef'), true)
    assert.equal(roles.has('cash_lead'), true)
  })

  it('falls back to default manager roles when env is empty', () => {
    const roles = readPosManagerRoleSetFromEnv('')
    assert.equal(roles.has('sous_chef'), true)
  })

  it('matches manager roles case-insensitively', () => {
    const managerRoles = new Set(['lead_chef'])
    assert.equal(isPosManagerRole({ role: 'Lead_Chef', managerRoles }), true)
    assert.equal(isPosManagerRole({ role: 'server', managerRoles }), false)
  })

  it('returns correct class tax multipliers', () => {
    assert.equal(getTaxClassRateMultiplier('standard'), 1)
    assert.equal(getTaxClassRateMultiplier('reduced'), 0.5)
    assert.equal(getTaxClassRateMultiplier('exempt'), 0)
  })

  it('computes line tax cents using class multiplier', () => {
    assert.equal(
      computeLineTaxCents({
        lineTotalCents: 1000,
        combinedRate: 0.08,
        taxClass: 'standard',
      }),
      80
    )
    assert.equal(
      computeLineTaxCents({
        lineTotalCents: 1000,
        combinedRate: 0.08,
        taxClass: 'reduced',
      }),
      40
    )
    assert.equal(
      computeLineTaxCents({
        lineTotalCents: 1000,
        combinedRate: 0.08,
        taxClass: 'zero',
      }),
      0
    )
  })
})
