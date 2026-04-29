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
      path.join(componentDir, 'sample.tsx'),
      [
        'export function Sample() {',
        '  return <div>',
        '    <a href="/dashboard">Dashboard</a>',
        '    <a href={`/events/${event.id}`}>Event</a>',
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

    assert.equal(report.appRouteCount, 2)
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
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('route integrity admin page is gated and linked from admin navigation', () => {
  const pageSource = readFileSync('app/(admin)/admin/route-integrity/page.tsx', 'utf8')
  const navSource = readFileSync('components/navigation/admin-nav-config.ts', 'utf8')

  assert.match(pageSource, /await requireAdmin\(\)/)
  assert.match(pageSource, /getRouteIntegrityReport\(\)/)
  assert.match(pageSource, /Route Integrity/)
  assert.match(navSource, /href: '\/admin\/route-integrity'/)
})
