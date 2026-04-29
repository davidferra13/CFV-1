import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { PDFLayout } from '../../lib/documents/pdf-layout.js'

describe('PDFLayout overflow truth', () => {
  it('records overflow when wrapped text cannot fit on the page', () => {
    const pdf = new PDFLayout()

    for (let i = 0; i < 120; i++) {
      pdf.text(`Operational line ${i + 1}: loadout, timing, and allergy details.`, 10)
    }

    assert.equal(pdf.hasOverflow(), true)
    assert.ok(pdf.overflowCount() > 0)
  })

  it('does not flag normal short documents as overflowed', () => {
    const pdf = new PDFLayout()
    pdf.title('Event Summary')
    pdf.text('Service at 6:00 PM. Confirm all allergies before plating.', 10)

    assert.equal(pdf.hasOverflow(), false)
    assert.equal(pdf.overflowCount(), 0)
  })
})
