import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendMobileQueueCriteria,
  classifyMobileFailure,
  inferRoutesFromChangedFiles,
  isUiQueueItem,
  renderContactSheetMarkdown,
} from '../../scripts/lib/mobile-pass-core.mjs'

test('inferRoutesFromChangedFiles maps app routes and shared component hints', () => {
  const routes = inferRoutesFromChangedFiles([
    'app/(public)/chefs/page.tsx',
    'app/(chef)/clients/intelligence/page.tsx',
    'components/remy/remy-hub.tsx',
    'app/globals.css',
  ])

  assert.deepEqual(
    routes.map((route) => `${route.role}:${route.path}`),
    [
      'public:/chefs',
      'chef:/clients/intelligence',
      'chef:/remy',
      'public:/',
      'chef:/dashboard',
      'client:/client',
    ]
  )
})

test('classifyMobileFailure separates blocking, serious, and polish failures', () => {
  assert.equal(classifyMobileFailure({ reason: 'http_5xx' }), 'blocking')
  assert.equal(
    classifyMobileFailure({ reason: 'horizontal_overflow', details: 'overflowX=48' }),
    'serious'
  )
  assert.equal(
    classifyMobileFailure({ reason: 'horizontal_overflow', details: 'overflowX=160' }),
    'blocking'
  )
  assert.equal(classifyMobileFailure({ reason: 'minor_visual_mismatch' }), 'polish')
})

test('renderContactSheetMarkdown creates screenshot review index', () => {
  const markdown = renderContactSheetMarkdown({
    executed: [
      {
        role: 'public',
        path: '/',
        viewport: 'iphone-13',
        state: 'default',
        overflowX: 0,
        screenshot: 'reports\\mobile-audit\\run\\public.png',
      },
    ],
  })

  assert.match(markdown, /\| Route \| Overflow \| Screenshot \|/)
  assert.match(
    markdown,
    /!\[public \/ iphone-13 default\]\(reports\/mobile-audit\/run\/public.png\)/
  )
})

test('UI queue criteria receives mobile acceptance and verification defaults', () => {
  assert.equal(
    isUiQueueItem({
      title: 'Public homepage copy pass',
      domain: 'Public Growth',
      scope: 'Update page and nav',
    }),
    true
  )

  const criteria = appendMobileQueueCriteria({
    acceptance: '- Homepage CTA is client-first',
    verification: '- Run public SEO checks',
  })

  assert.match(criteria.acceptance, /Mobile layout works at 390px/)
  assert.match(criteria.verification, /scripts\/mobile-pass\.mjs/)
})

test('inferRoutesFromChangedFiles can feed explicit mobile audit role filters', () => {
  const routes = inferRoutesFromChangedFiles([
    'app/(chef)/imports/business-history/page.tsx',
    'app/(chef)/remy/operating/page.tsx',
    'app/(chef)/clients/intelligence/page.tsx',
  ])

  assert.deepEqual(
    routes.map((route) => `${route.role}:${route.path}`),
    ['chef:/imports/business-history', 'chef:/remy/operating', 'chef:/clients/intelligence']
  )
})
