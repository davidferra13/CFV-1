// Coverage Layer — Auth Boundary Tests
// Verifies that role-based access control actually works:
//   - Chef routes reject unauthenticated users → redirect to /auth/signin
//   - Client routes reject chef sessions → redirect away
//   - Admin routes reject non-admin sessions → redirect to /unauthorized or /auth/signin
//
// These tests use NO storageState (no default auth).
// They manage their own auth context per-test via Playwright's built-in browser contexts.

import { test as base, expect, Browser } from '@playwright/test'
import { readFileSync } from 'fs'

const BASE_URL = 'http://localhost:3100'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadStorageState(path: string) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

// ─── Unauthenticated → Chef Routes ────────────────────────────────────────────

base.describe('Auth Boundaries — Unauthenticated Access', () => {
  const protectedChefRoutes = [
    '/dashboard',
    '/events',
    '/events/new',
    '/clients',
    '/clients/new',
    '/inquiries',
    '/quotes',
    '/financials',
    '/finance',
    '/menus',
    '/recipes',
    '/settings',
    '/settings/my-profile',
    '/calendar',
    '/analytics',
    '/staff',
  ]

  for (const route of protectedChefRoutes) {
    base.test(`unauthenticated → ${route} redirects to sign-in`, async ({ page }) => {
      // No storage state — completely unauthenticated
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
      const url = page.url()
      expect(url, `${route} should redirect unauthenticated to sign-in`).toMatch(/auth\/signin/)
    })
  }

  const protectedClientRoutes = [
    '/my-events',
    '/my-quotes',
    '/my-profile',
    '/my-chat',
    '/my-rewards',
    '/my-inquiries',
  ]

  for (const route of protectedClientRoutes) {
    base.test(`unauthenticated → ${route} redirects to sign-in`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
      const url = page.url()
      expect(url, `${route} should redirect unauthenticated to sign-in`).toMatch(/auth\/signin/)
    })
  }

  base.test('unauthenticated → /admin redirects to sign-in or unauthorized', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' })
    const url = page.url()
    expect(url, '/admin should reject unauthenticated users').toMatch(/auth\/signin|unauthorized/)
  })
})

// ─── Chef Session → Client Routes ─────────────────────────────────────────────

base.describe('Auth Boundaries — Chef Cannot Access Client Portal', () => {
  base.use({ storageState: '.auth/chef.json' })

  const clientOnlyRoutes = [
    '/my-events',
    '/my-quotes',
    '/my-profile',
    '/my-chat',
    '/my-rewards',
    '/my-inquiries',
  ]

  for (const route of clientOnlyRoutes) {
    base.test(`chef session → ${route} redirects away`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const url = page.url()
      // Chef should NOT land on client routes — should be redirected somewhere else
      expect(url, `chef should not be able to access ${route}`).not.toMatch(new RegExp(route + '$'))
    })
  }
})

// ─── Client Session → Chef Routes ─────────────────────────────────────────────

base.describe('Auth Boundaries — Client Cannot Access Chef Portal', () => {
  base.use({ storageState: '.auth/client.json' })

  const chefOnlyRoutes = [
    '/dashboard',
    '/events',
    '/clients',
    '/inquiries',
    '/quotes',
    '/financials',
    '/menus',
    '/recipes',
    '/settings',
    '/analytics',
    '/staff',
    '/finance',
  ]

  for (const route of chefOnlyRoutes) {
    base.test(`client session → ${route} redirects away`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const url = page.url()
      expect(url, `client should not be able to access ${route}`).not.toMatch(
        new RegExp(route + '$')
      )
    })
  }
})

// ─── Chef Session → Admin Routes ──────────────────────────────────────────────

base.describe('Auth Boundaries — Chef Cannot Access Admin', () => {
  base.use({ storageState: '.auth/chef.json' })

  const adminRoutes = [
    '/admin',
    '/admin/users',
    '/admin/clients',
    '/admin/events',
    '/admin/financials',
  ]

  for (const route of adminRoutes) {
    base.test(`chef session → ${route} redirects to unauthorized`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const url = page.url()
      expect(url, `chef should not access admin route ${route}`).toMatch(
        /unauthorized|auth\/signin/
      )
    })
  }
})
