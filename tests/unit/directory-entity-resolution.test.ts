import test from 'node:test'
import assert from 'node:assert/strict'
import {
  chooseDirectoryListingAccountLinkCandidate,
  normalizeComparableWebsiteHost,
} from '../../lib/discover/entity-resolution'

test('chooseDirectoryListingAccountLinkCandidate prefers claimed email matches over weaker signals', () => {
  const result = chooseDirectoryListingAccountLinkCandidate(
    [
      {
        id: 'listing-name-match',
        name: 'North Fork Catering',
        slug: 'north-fork-catering',
        city: 'Austin',
        state: 'TX',
        status: 'discovered',
        claimed_by_email: null,
        email: null,
        website_url: 'https://northfork.example.com',
        linked_chef_id: null,
      },
      {
        id: 'listing-email-match',
        name: 'North Fork Catering',
        slug: 'north-fork-catering-verified',
        city: 'Austin',
        state: 'TX',
        status: 'claimed',
        claimed_by_email: 'chef@northfork.example.com',
        email: null,
        website_url: 'https://northfork.example.com',
        linked_chef_id: null,
      },
    ],
    {
      chefId: 'chef-1',
      email: 'chef@northfork.example.com',
      businessName: 'North Fork Catering',
      websiteUrl: 'https://northfork.example.com/',
      city: 'Austin',
      state: 'TX',
    }
  )

  assert.deepEqual(result, {
    listingId: 'listing-email-match',
    slug: 'north-fork-catering-verified',
    confidence: 'high',
    reason: 'claimed_email_exact',
  })
})

test('chooseDirectoryListingAccountLinkCandidate refuses medium-confidence auto-links on someone else’s claimed listing', () => {
  const result = chooseDirectoryListingAccountLinkCandidate(
    [
      {
        id: 'claimed-other-owner',
        name: 'Harbor Table',
        slug: 'harbor-table',
        city: 'Boston',
        state: 'MA',
        status: 'claimed',
        claimed_by_email: 'different-owner@example.com',
        email: null,
        website_url: null,
        linked_chef_id: null,
      },
    ],
    {
      chefId: 'chef-2',
      businessName: 'Harbor Table',
      city: 'Boston',
      state: 'MA',
    }
  )

  assert.equal(result, null)
})

test('normalizeComparableWebsiteHost collapses protocol and www differences', () => {
  assert.equal(normalizeComparableWebsiteHost('https://www.Example.com/menu'), 'example.com')
  assert.equal(normalizeComparableWebsiteHost('example.com'), 'example.com')
  assert.equal(normalizeComparableWebsiteHost(null), '')
})
