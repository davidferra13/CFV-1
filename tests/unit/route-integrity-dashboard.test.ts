import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { getRouteIntegrityReport } from '@/lib/interface/route-integrity'

test('route integrity report flags missing static and template hrefs', () => {
  const tempRoot = path.join(os.tmpdir(), `chefflow-route-integrity-${Date.now()}`)
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    mkdirSync(path.join(appDir, '(chef)', 'events', '[id]'), { recursive: true })
    mkdirSync(path.join(appDir, '(chef)', 'dashboard'), { recursive: true })
    mkdirSync(path.join(appDir, '(chef)', 'download'), { recursive: true })
    mkdirSync(componentDir, { recursive: true })
    writeFileSync(
      path.join(appDir, '(chef)', 'events', '[id]', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    writeFileSync(
      path.join(appDir, '(chef)', 'dashboard', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    writeFileSync(
      path.join(appDir, '(chef)', 'download', 'route.ts'),
      'export async function GET() { return Response.json({ ok: true }) }\n'
    )
    writeFileSync(
      path.join(componentDir, 'sample.tsx'),
      [
        'export function Sample() {',
        '  return <div>',
        '    <a href="/dashboard">Dashboard</a>',
        '    <a href={`/events/${event.id}`}>Event</a>',
        '    <a href="/download">Download</a>',
        '    <a href="/missing-route">Missing</a>',
        '    <button onClick={() => {}}>No op</button>',
        '  </div>',
        '}',
      ].join('\n')
    )

    const report = getRouteIntegrityReport({
      appDir,
      sourceRoots: [componentDir],
    })

    assert.equal(report.appRouteCount, 3)
    assert.equal(report.sourceFileCount, 1)
    assert.ok(report.findings.some((finding) => finding.href === '/missing-route'))
    assert.ok(report.findings.some((finding) => finding.type === 'empty_handler'))
    assert.equal(
      report.findings.some((finding) => finding.href === '/dashboard'),
      false,
      'mounted static route should not be reported'
    )
    assert.equal(
      report.findings.some((finding) => finding.href === '/events/${event.id}'),
      false,
      'mounted dynamic route should not be reported'
    )
    assert.equal(
      report.findings.some((finding) => finding.href === '/download'),
      false,
      'mounted route handler should not be reported'
    )
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('operations readiness route connects dashboard entry to real checkpoints', () => {
  const dashboardSource = readFileSync(
    'app/(chef)/dashboard/_sections/business-section-mobile-content.tsx',
    'utf8'
  )
  const pageSource = readFileSync('app/(chef)/operations/readiness/page.tsx', 'utf8')
  const hubSource = readFileSync('app/(chef)/operations/page.tsx', 'utf8')

  assert.match(dashboardSource, /href: '\/operations\/readiness'/)
  assert.match(hubSource, /href: '\/operations\/readiness'/)
  assert.match(pageSource, /await requireChef\(\)/)
  assert.match(pageSource, /href: '\/events'/)
  assert.match(pageSource, /href: '\/tasks'/)
  assert.match(pageSource, /href: '\/operations\/equipment'/)
  assert.match(pageSource, /href: '\/operations\/kitchen-rentals'/)
  assert.match(pageSource, /href: '\/safety\/incidents'/)
  assert.match(pageSource, /href: '\/settings\/protection\/insurance'/)
})

test('owner draws year selector is connected to route state', () => {
  const pageSource = readFileSync('app/(chef)/finance/ledger/owner-draws/page.tsx', 'utf8')
  const selectorSource = readFileSync(
    'app/(chef)/finance/ledger/owner-draws/owner-draws-year-select.tsx',
    'utf8'
  )

  assert.doesNotMatch(pageSource, /onChange=\{undefined\}/)
  assert.match(
    pageSource,
    /<OwnerDrawsYearSelect selectedYear=\{validYear\} years=\{yearOptions\} \/>/
  )
  assert.match(selectorSource, /'use client'/)
  assert.match(selectorSource, /useRouter/)
  assert.match(selectorSource, /router\.push\(`\/finance\/ledger\/owner-draws\?year=/)
})

test('route integrity admin page is gated and linked from admin navigation', () => {
  const pageSource = readFileSync('app/(admin)/admin/route-integrity/page.tsx', 'utf8')
  const navSource = readFileSync('components/navigation/admin-nav-config.ts', 'utf8')

  assert.match(pageSource, /await requireAdmin\(\)/)
  assert.match(pageSource, /getRouteIntegrityReport\(\)/)
  assert.match(pageSource, /Route Integrity/)
  assert.match(navSource, /href: '\/admin\/route-integrity'/)
})
