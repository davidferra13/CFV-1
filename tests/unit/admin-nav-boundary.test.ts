// Admin Nav Boundary Tests
// Verifies admin routes are owned by admin nav, not leaking through chef nav.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')

describe('Admin Nav Boundary', () => {
  it('chef nav-config standaloneTop has no /admin routes', () => {
    const configPath = join(ROOT, 'components', 'navigation', 'nav-config.tsx')
    const content = readFileSync(configPath, 'utf-8')

    // Extract the standaloneTop array region
    const standaloneTopStart = content.indexOf('export const standaloneTop')
    const standaloneTopEnd = content.indexOf(']', content.indexOf('export const standaloneTop'))
    const standaloneTopBlock = content.slice(standaloneTopStart, standaloneTopEnd)

    // Check no /admin hrefs
    const adminHrefs = standaloneTopBlock.match(/href:\s*['"]\/admin/g)
    assert.strictEqual(
      adminHrefs,
      null,
      `Chef standaloneTop still contains admin hrefs: ${adminHrefs}`
    )
  })

  it('chef nav-config navGroups has no admin group', () => {
    const configPath = join(ROOT, 'components', 'navigation', 'nav-config.tsx')
    const content = readFileSync(configPath, 'utf-8')

    // Extract navGroups section
    const navGroupsStart = content.indexOf('export const navGroups')
    const navGroupsSection = content.slice(navGroupsStart)

    // No id: 'admin' group
    assert.ok(
      !navGroupsSection.match(/id:\s*['"]admin['"]/),
      'Chef navGroups must not contain an admin group'
    )
  })

  it('admin-nav-config has admin primary links', () => {
    const configPath = join(ROOT, 'components', 'navigation', 'admin-nav-config.ts')
    const content = readFileSync(configPath, 'utf-8')

    assert.ok(content.includes("href: '/admin'"), 'Admin nav must have /admin link')
    assert.ok(content.includes("href: '/admin/pulse'"), 'Admin nav must have /admin/pulse link')
  })

  it('admin-nav-config covers all admin routes that were in chef nav', () => {
    const configPath = join(ROOT, 'components', 'navigation', 'admin-nav-config.ts')
    const content = readFileSync(configPath, 'utf-8')

    // Key admin routes that were previously in chef nav
    const expectedRoutes = [
      '/admin/users',
      '/admin/clients',
      '/admin/events',
      '/admin/analytics',
      '/admin/audit',
      '/admin/flags',
      '/admin/financials',
      '/admin/system',
      '/admin/notifications',
      '/admin/cannabis',
      '/admin/reconciliation',
      '/admin/presence',
      '/admin/silent-failures',
    ]

    for (const route of expectedRoutes) {
      assert.ok(content.includes(`'${route}'`), `Admin nav-config missing route: ${route}`)
    }
  })

  it('admin shell component exists and exports required pieces', () => {
    const shellPath = join(ROOT, 'components', 'navigation', 'admin-shell.tsx')
    const content = readFileSync(shellPath, 'utf-8')

    assert.ok(content.includes('AdminSidebarProvider'), 'Must export AdminSidebarProvider')
    assert.ok(content.includes('AdminSidebar'), 'Must export AdminSidebar')
    assert.ok(content.includes('AdminMobileNav'), 'Must export AdminMobileNav')
    assert.ok(content.includes('AdminMainContent'), 'Must export AdminMainContent')
  })

  it('admin shell imports from admin-nav-config, not nav-config', () => {
    const shellPath = join(ROOT, 'components', 'navigation', 'admin-shell.tsx')
    const content = readFileSync(shellPath, 'utf-8')

    assert.ok(content.includes('admin-nav-config'), 'Admin shell must import from admin-nav-config')
    assert.ok(
      !content.includes("from './nav-config'"),
      'Admin shell must not import from chef nav-config'
    )
  })
})
