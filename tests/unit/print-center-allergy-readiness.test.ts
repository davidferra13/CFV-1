import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('app/(chef)/events/[id]/print/page.tsx', 'utf8')

test('print center checks allergy data before exposing allergy-card quick print', () => {
  assert.match(
    source,
    /import \{ hasAllergyData \} from '@\/lib\/documents\/generate-allergy-card'/
  )
  assert.match(source, /hasAllergyData\(params\.id\)\.catch\(\(\) => null\)/)
  assert.match(source, /print\.requiresAllergyData && hasAllergyCardData === false/)
  assert.match(source, /No allergy or dietary records found/)
})

test('print center keeps non-allergy safety prints linked through registry hrefs', () => {
  assert.match(source, /EVENT_SAFETY_PRINTS\.map/)
  assert.match(source, /href=\{buildEventSafetyPrintHref\(params\.id, print\)\}/)
})
