import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractHubLinkPreviews,
  getSafeHubLinkHref,
  splitHubTextBySafeLinks,
} from '@/lib/hub/link-preview'

test('hub link previews keep safe dinner circle resources and classify them', () => {
  const previews = extractHubLinkPreviews(
    [
      'Theme board https://example.com/dinner-table.jpg',
      'Directions https://maps.google.com/?q=private+dinner',
      'Playlist https://open.spotify.com/playlist/abc123',
      'Duplicate https://example.com/dinner-table.jpg',
    ].join(' ')
  )

  assert.equal(previews.length, 3)
  assert.equal(previews[0].resourceType, 'image')
  assert.equal(previews[0].sourceLabel, 'example.com')
  assert.equal(previews[1].resourceType, 'map')
  assert.equal(previews[2].resourceType, 'playlist')
})

test('hub link previews reject localhost and private network URLs', () => {
  assert.equal(getSafeHubLinkHref('http://localhost:3100/admin'), null)
  assert.equal(getSafeHubLinkHref('http://127.0.0.1:54321/private'), null)
  assert.equal(getSafeHubLinkHref('http://192.168.0.10/file.jpg'), null)
  assert.equal(getSafeHubLinkHref('http://internal-service/upload'), null)

  const previews = extractHubLinkPreviews(
    'ignore http://localhost:3100 and keep https://chef.example.com/menu'
  )
  assert.equal(previews.length, 1)
  assert.equal(previews[0].href, 'https://chef.example.com/menu')
})

test('safe link text parts preserve unsafe URLs as plain text', () => {
  const parts = splitHubTextBySafeLinks(
    'Map: https://maps.google.com/?q=dinner, internal: http://10.0.0.5/secret'
  )

  assert.equal(
    parts.some((part) => part.type === 'link' && part.href?.includes('maps.google')),
    true
  )
  assert.equal(
    parts.some((part) => part.type === 'link' && part.href?.includes('10.0.0.5')),
    false
  )
  assert.equal(
    parts
      .map((part) => part.text)
      .join('')
      .includes('http://10.0.0.5/secret'),
    true
  )
})
