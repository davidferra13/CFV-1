// Auth Test Utilities
// Adapted from legacy BillyBob8 patterns for Auth.js
// Provides both UI-based and direct Auth.js helpers

import { Page, expect } from '@playwright/test'
import { ROUTES, generateUniqueEmail, generateValidPassword } from './test-utils'

type SignUpOpts = {
  email?: string
  password?: string
}

/**
 * Sign up a new user via the UI.
 * Returns credentials for subsequent login.
 */
export async function signUpViaUI(
  page: Page,
  opts: SignUpOpts = {}
): Promise<{ email: string; password: string }> {
  const email = opts.email ?? generateUniqueEmail()
  const password = opts.password ?? generateValidPassword()

  await page.goto(ROUTES.signUp)

  const emailEl = page.getByLabel('Email')
  const passwordEl = page.getByLabel('Password', { exact: true })
  const submitEl = page.getByRole('button', { name: /sign up|create account/i })

  await expect(emailEl).toBeVisible()
  await emailEl.fill(email)
  await passwordEl.fill(password)
  await submitEl.click()

  return { email, password }
}

/**
 * Sign in an existing user via the UI.
 */
export async function signInViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto(ROUTES.signIn)

  const emailEl = page.getByLabel('Email')
  const passwordEl = page.getByLabel('Password')
  const submitEl = page.getByRole('button', { name: /sign in/i })

  await expect(emailEl).toBeVisible()
  await emailEl.fill(email)
  await passwordEl.fill(password)
  await submitEl.click()
}

/**
 * Create a user directly via the database Admin API.
 * Bypasses the UI for faster, more reliable test setup.
 * Requires DB_URL and DB_SERVICE_ROLE_KEY in env.
 */
export async function createUserDirect(opts?: {
  email?: string
  password?: string
  role?: 'chef' | 'client'
}): Promise<{ email: string; password: string; userId: string }> {
  const email = opts?.email ?? generateUniqueEmail()
  const password = opts?.password ?? generateValidPassword()

  const dbUrl = process.env.NEXT_PUBLIC_DB_URL
  const serviceRoleKey = process.env.DB_SERVICE_ROLE_KEY

  if (!dbUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_DB_URL and DB_SERVICE_ROLE_KEY required for direct user creation')
  }

  // Create auth user via the database Admin API
  const response = await fetch(`${dbUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create user directly: ${error}`)
  }

  const data = await response.json()
  return { email, password, userId: data.id }
}

/**
 * Create a chef user with tenant setup.
 * Creates auth user + chef record + user_role entry.
 */
export async function createChefDirect(opts?: {
  email?: string
  password?: string
  businessName?: string
}): Promise<{ email: string; password: string; userId: string; tenantId: string }> {
  const { email, password, userId } = await createUserDirect({
    email: opts?.email,
    password: opts?.password,
    role: 'chef',
  })

  const dbUrl = process.env.NEXT_PUBLIC_DB_URL!
  const serviceRoleKey = process.env.DB_SERVICE_ROLE_KEY!
  const businessName = opts?.businessName ?? `Test Chef ${Date.now()}`

  // Create chef record
  const chefRes = await fetch(`${dbUrl}/rest/v1/chefs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      auth_user_id: userId,
      business_name: businessName,
      full_name: businessName,
    }),
  })

  if (!chefRes.ok) {
    throw new Error(`Failed to create chef record: ${await chefRes.text()}`)
  }

  const [chef] = await chefRes.json()

  // Create user_role entry
  await fetch(`${dbUrl}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      auth_user_id: userId,
      role: 'chef',
      entity_id: chef.id,
    }),
  })

  return { email, password, userId, tenantId: chef.id }
}

/**
 * Ensure we're signed out before a test.
 */
export async function ensureSignedOut(page: Page): Promise<void> {
  await page.goto('/')
  // Clear Auth.js cookies/storage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}
