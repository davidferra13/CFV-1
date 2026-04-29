import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getRecentPagesReturnRemyDetail,
  RECENT_PAGES_REMY_SOURCE,
  RECENT_PAGES_RETRACE_HREF,
  RECENT_PAGES_RESUME_HREF,
  RECENT_PAGES_RETURN_PROMPT,
} from '@/components/navigation/recent-pages-section'
import {
  getOpenRemyPrompt,
  shouldAutoSendOpenRemyPrompt,
} from '@/lib/ai/remy-launch'

test('recent pages return actions use existing activity routes', () => {
  assert.equal(RECENT_PAGES_RESUME_HREF, '/activity#resume')
  assert.equal(RECENT_PAGES_RETRACE_HREF, '/activity?mode=retrace')
})

test('recent pages Remy briefing opens through the existing auto-send contract', () => {
  const detail = getRecentPagesReturnRemyDetail()

  assert.equal(detail.prompt, RECENT_PAGES_RETURN_PROMPT)
  assert.equal(detail.source, RECENT_PAGES_REMY_SOURCE)
  assert.equal(detail.send, true)
  assert.equal(getOpenRemyPrompt(detail), RECENT_PAGES_RETURN_PROMPT)
  assert.equal(shouldAutoSendOpenRemyPrompt(detail), true)
})
