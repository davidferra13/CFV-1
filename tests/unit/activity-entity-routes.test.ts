import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getChefActivityEntityHref } from '@/lib/activity/entity-routes'

describe('chef activity entity routes', () => {
  it('preserves existing entity routes', () => {
    assert.equal(getChefActivityEntityHref('event', 'event-1'), '/events/event-1')
    assert.equal(getChefActivityEntityHref('inquiry', 'inquiry-1'), '/inquiries/inquiry-1')
    assert.equal(getChefActivityEntityHref('quote', 'quote-1'), '/quotes/quote-1')
    assert.equal(getChefActivityEntityHref('menu', 'menu-1'), '/culinary/menus/menu-1')
    assert.equal(getChefActivityEntityHref('recipe', 'recipe-1'), '/recipes/recipe-1')
    assert.equal(getChefActivityEntityHref('client', 'client-1'), '/clients/client-1')
  })

  it('routes task and station activity to existing work surfaces', () => {
    assert.equal(getChefActivityEntityHref('task', 'task-1'), '/tasks')
    assert.equal(getChefActivityEntityHref('station', 'station-1'), '/stations/station-1')
  })

  it('does not invent links for missing or unknown entity data', () => {
    assert.equal(getChefActivityEntityHref(null, 'event-1'), null)
    assert.equal(getChefActivityEntityHref('event', null), null)
    assert.equal(getChefActivityEntityHref('unknown', 'unknown-1'), null)
  })
})
