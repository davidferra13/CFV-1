import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public launch surfaces use launch-mode-aware signup helpers instead of hardcoded auth signup', () => {
  const home = read('app/(public)/page.tsx')
  const pricing = read('app/(public)/pricing/page.tsx')
  const workflow = read('components/public/workflow-steps.tsx')
  const remy = read('components/public/remy-concierge-section.tsx')

  assert.match(home, /buildMarketingSignupHref/)
  assert.doesNotMatch(home, /href="\/auth\/signup"/)
  assert.match(pricing, /buildMarketingSignupHref/)
  assert.doesNotMatch(pricing, /href="\/auth\/signup"/)
  assert.match(workflow, /buildMarketingSignupHref/)
  assert.match(remy, /buildMarketingSignupHref/)
})

test('beta signup flow persists landing attribution and admin table exposes it', () => {
  const betaActions = read('lib/beta/actions.ts')
  const betaForm = read('components/beta/beta-signup-form.tsx')
  const betaAdmin = read('components/admin/beta-signups-table.tsx')

  assert.match(betaActions, /sourcePage\?: string/)
  assert.match(betaActions, /source_page: sourcePage/)
  assert.match(betaActions, /source_cta: sourceCta/)
  assert.match(betaForm, /sourcePage,/)
  assert.match(betaForm, /sourceCta,/)
  assert.match(betaAdmin, /formatMarketingOrigin/)
  assert.match(betaAdmin, />Origin</)
})

test('feedback form routes tokenless submissions to user feedback and preserves metadata', () => {
  const feedbackForm = read('components/feedback/feedback-form.tsx')
  const feedbackAction = read('lib/feedback/actions.ts')
  const settingsPage = read('app/(chef)/settings/page.tsx')
  const profilePage = read('app/(client)/my-profile/page.tsx')

  assert.match(feedbackForm, /if \(!token\)/)
  assert.match(feedbackForm, /submitUserFeedback/)
  assert.match(feedbackForm, /metadata:/)
  assert.match(feedbackAction, /metadata: z\.record/)
  assert.match(feedbackAction, /metadata: metadata \?\? \{\}/)
  assert.match(settingsPage, /<FeedbackForm pageContext="\/settings" \/>/)
  assert.match(profilePage, /<FeedbackForm pageContext="\/my-profile" \/>/)
})
