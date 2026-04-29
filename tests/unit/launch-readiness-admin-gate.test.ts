import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pageSource = readFileSync(
  join(process.cwd(), 'app/(admin)/admin/launch-readiness/page.tsx'),
  'utf8'
)
const exportRouteSource = readFileSync(
  join(process.cwd(), 'app/(admin)/admin/launch-readiness/export/route.ts'),
  'utf8'
)
const jsonPacketRouteSource = readFileSync(
  join(process.cwd(), 'app/api/admin/launch-readiness/decision-packet/route.ts'),
  'utf8'
)
const reviewPreviewRouteSource = readFileSync(
  join(process.cwd(), 'app/api/admin/launch-readiness/review-preview/route.ts'),
  'utf8'
)
const reviewsRouteSource = readFileSync(
  join(process.cwd(), 'app/api/admin/launch-readiness/reviews/route.ts'),
  'utf8'
)
const reviewConsoleSource = readFileSync(
  join(process.cwd(), 'components/admin/launch-readiness-review-console.tsx'),
  'utf8'
)
const launchReadinessSource = readFileSync(
  join(process.cwd(), 'lib/validation/launch-readiness.ts'),
  'utf8'
)
const adminNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/admin-nav-config.ts'),
  'utf8'
)
const chefNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/nav-config.tsx'),
  'utf8'
)

test('launch readiness page is protected by server-side admin auth', () => {
  assert.match(pageSource, /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/)
  assert.match(pageSource, /await\s+requireAdmin\(\)/)
  assert.doesNotMatch(pageSource, /requireChef/)
  assert.doesNotMatch(pageSource, /^['"]use client['"]/m)
})

test('launch readiness export route is admin-only and returns a packet', () => {
  assert.match(
    exportRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(exportRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(exportRouteSource, /buildLaunchReadinessDecisionPacket/)
  assert.match(exportRouteSource, /Content-Disposition/)
})

test('launch readiness JSON packet route is admin-only and non-cached', () => {
  assert.match(
    jsonPacketRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(jsonPacketRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(jsonPacketRouteSource, /buildLaunchReadinessDecisionPacket/)
  assert.match(jsonPacketRouteSource, /buildLaunchReadinessRiskRegister/)
  assert.match(jsonPacketRouteSource, /NextResponse\.json/)
  assert.match(jsonPacketRouteSource, /Cache-Control['"]:\s*['"]no-store/)
  assert.match(jsonPacketRouteSource, /riskRegister/)
  assert.match(pageSource, /\/api\/admin\/launch-readiness\/decision-packet/)
})

test('launch readiness review preview route is admin-only and non-persistent', () => {
  assert.match(
    reviewPreviewRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(reviewPreviewRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(reviewPreviewRouteSource, /applyLaunchReadinessOperatorReviews/)
  assert.match(reviewPreviewRouteSource, /records must be an array/)
  assert.match(reviewPreviewRouteSource, /Cache-Control['"]:\s*['"]no-store/)
  assert.doesNotMatch(reviewPreviewRouteSource, /\.from\(/)
  assert.doesNotMatch(reviewPreviewRouteSource, /\.insert\(/)
  assert.doesNotMatch(reviewPreviewRouteSource, /\.upsert\(/)
})

test('launch readiness persistent review route is admin-only and cache-busting', () => {
  assert.match(
    reviewsRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(reviewsRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(reviewsRouteSource, /ReviewInputSchema\.safeParse/)
  assert.match(reviewsRouteSource, /createLaunchReadinessOperatorReview/)
  assert.match(reviewsRouteSource, /listLaunchReadinessOperatorReviews/)
  assert.match(reviewsRouteSource, /revalidatePath\(['"]\/admin\/launch-readiness['"]\)/)
  assert.match(reviewsRouteSource, /Cache-Control['"]:\s*['"]no-store/)
  assert.match(reviewsRouteSource, /superRefine/)
  assert.match(
    reviewsRouteSource,
    /Verified launch readiness reviews require a note or evidence link/
  )
  assert.match(reviewsRouteSource, /parsed\.error\.issues\[0\]\?\.message/)
})

test('launch readiness page connects persistent reviews to an operator console', () => {
  assert.match(pageSource, /LaunchReadinessReviewConsole/)
  assert.match(pageSource, /listLaunchReadinessOperatorReviews/)
  assert.match(reviewConsoleSource, /^['"]use client['"]/m)
  assert.match(reviewConsoleSource, /\/api\/admin\/launch-readiness\/reviews/)
  assert.match(reviewConsoleSource, /router\.refresh\(\)/)
  assert.match(reviewConsoleSource, /reviewableChecks/)
  assert.match(reviewConsoleSource, /No checks are waiting for operator review/)
  assert.match(
    reviewConsoleSource,
    /Verified launch readiness reviews require a note or evidence link/
  )
})

test('launch readiness report applies stored operator reviews', () => {
  assert.match(launchReadinessSource, /listLaunchReadinessOperatorReviews/)
  assert.match(launchReadinessSource, /applyLaunchReadinessOperatorReviews/)
  assert.match(launchReadinessSource, /LAUNCH_READINESS_REVIEWABLE_CHECK_KEYS/)
})

test('launch readiness page connects the risk register helper', () => {
  assert.match(pageSource, /buildLaunchReadinessRiskRegister/)
  assert.match(pageSource, /Risk register/)
  assert.match(pageSource, /risk\.severity/)
})

test('launch readiness is visible only in admin navigation', () => {
  assert.match(adminNavSource, /href:\s*['"]\/admin\/launch-readiness['"]/)
  assert.doesNotMatch(chefNavSource, /\/admin\/launch-readiness/)
})
