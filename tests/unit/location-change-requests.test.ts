import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPartnerLocationProposalChangedFields,
  sanitizePartnerLocationProposal,
} from '@/lib/partners/location-change-requests'

test('sanitizePartnerLocationProposal normalizes blanks and canonical array values', () => {
  const proposal = sanitizePartnerLocationProposal({
    name: ' River House ',
    address: '',
    city: 'Aspen',
    state: 'Colorado',
    zip: '',
    booking_url: '',
    description: ' Seasonal chef residency. ',
    max_guest_count: 14,
    experience_tags: ['food', 'outdoor'],
    best_for: ['retreat'],
    service_types: ['family_style'],
  })

  assert.equal(proposal.name, 'River House')
  assert.equal(proposal.address, null)
  assert.equal(proposal.zip, null)
  assert.equal(proposal.booking_url, null)
  assert.equal(proposal.description, 'Seasonal chef residency.')
  assert.deepEqual(proposal.experience_tags, ['food', 'outdoor'])
})

test('getPartnerLocationProposalChangedFields compares normalized public fields only', () => {
  const changedFields = getPartnerLocationProposalChangedFields(
    {
      name: 'River House',
      address: '123 River Rd',
      city: 'Aspen',
      state: 'Colorado',
      zip: '81611',
      booking_url: null,
      description: 'Original copy',
      max_guest_count: 12,
      experience_tags: ['food'],
      best_for: ['intimate_dinner'],
      service_types: ['plated_service'],
    },
    {
      name: 'River House',
      address: '123 River Rd',
      city: 'Aspen',
      state: 'Colorado',
      zip: '81611',
      booking_url: '',
      description: 'Updated copy',
      max_guest_count: 16,
      experience_tags: ['food', 'outdoor'],
      best_for: ['intimate_dinner'],
      service_types: ['plated_service'],
    }
  )

  assert.deepEqual(changedFields, ['description', 'max_guest_count', 'experience_tags'])
})
