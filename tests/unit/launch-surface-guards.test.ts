import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public launch surfaces use launch-mode-aware signup helpers instead of hardcoded auth signup', () => {
  const home = read('app/(public)/page.tsx')
  const forOperators = read('app/(public)/for-operators/page.tsx')
  const marketplaceChefs = read('app/(public)/marketplace-chefs/page.tsx')
  const workflow = read('components/public/workflow-steps.tsx')
  const remy = read('components/public/remy-concierge-section.tsx')

  // Homepage is now a search-first directory page with no signup links
  assert.doesNotMatch(home, /href="\/auth\/signup"/)
  assert.match(forOperators, /buildMarketingSignupHref/)
  assert.doesNotMatch(forOperators, /href="\/auth\/signup"/)
  assert.match(marketplaceChefs, /buildMarketingSignupHref/)
  assert.doesNotMatch(marketplaceChefs, /href="\/auth\/signup"/)
  assert.match(workflow, /buildMarketingSignupHref/)
  assert.match(remy, /buildMarketingSignupHref/)
})

test('homepage first viewport avoids flicker-prone continuous motion', () => {
  const home = read('app/(public)/page.tsx')
  const liveSignal = read('app/(public)/_components/homepage-live-signal.tsx')
  const globals = read('app/globals.css')

  assert.doesNotMatch(home, /homepage-hero-shimmer/)
  assert.doesNotMatch(liveSignal, /setIsVisible\(false\)/)
  assert.doesNotMatch(
    globals,
    /animation:\s*homepage-(?:ambient-breathe|light-drift|light-wash|quiet-rise|metal-shimmer|booking-signal|panel-float|screen-drift|proof-pulse)/
  )
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
