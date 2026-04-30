import { mkdirSync } from 'fs'
import { join } from 'path'
import { chromium, type BrowserContext, type Page } from 'playwright'
import { HANDLE_FALLBACK_CHAIN, type PlatformJob } from './platforms'
import {
  formatHumanAction,
  nowIso,
  recordFromJob,
  type ClaimRecord,
  type HumanAction,
} from './state'
import { storeCredential, type IdentityInputs } from './vault'

const HUMAN_BLOCK_RE =
  /captcha|verify|verification|sms|code|security check|confirm your|check your email|phone verification/i
const USERNAME_TAKEN_RE =
  /username.*taken|handle.*taken|already taken|not available|unavailable|already exists/i
const SUCCESS_RE =
  /welcome|dashboard|profile|account created|organization created|business account/i

const USERNAME_SELECTORS = [
  'input[name="username"]',
  'input[name="handle"]',
  'input[name="login"]',
  'input[name="user[login]"]',
  'input[autocomplete="username"]',
  'input[placeholder*="username" i]',
  'input[placeholder*="handle" i]',
]

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[autocomplete="email"]',
  'input[placeholder*="email" i]',
]

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[autocomplete="new-password"]',
  'input[placeholder*="password" i]',
]

const PHONE_SELECTORS = [
  'input[type="tel"]',
  'input[name="phone"]',
  'input[autocomplete="tel"]',
  'input[placeholder*="phone" i]',
]

const SUBMIT_SELECTORS = [
  'button:has-text("Continue")',
  'button:has-text("Next")',
  'button:has-text("Sign up")',
  'button:has-text("Create account")',
  'button:has-text("Register")',
  'input[type="submit"]',
]

async function pageText(page: Page): Promise<string> {
  return page
    .locator('body')
    .innerText({ timeout: 3000 })
    .catch(() => '')
}

async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) continue
    if (!(await locator.isVisible().catch(() => false))) continue
    await locator.fill(value)
    return true
  }
  return false
}

async function clickFirst(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) continue
    if (!(await locator.isVisible().catch(() => false))) continue
    await locator.click()
    return true
  }
  return false
}

function actionFor(
  job: PlatformJob,
  username: string | null,
  status: string,
  action: string,
  url: string
): HumanAction {
  return {
    platform: job.name,
    selectedUsername: username,
    currentStatus: status,
    exactRequiredAction: action,
    directUrl: url,
    resumeInstruction: `Then run: npx tsx scripts/identity/claim-orchestrator.ts resume --platform ${job.id}`,
  }
}

function stopRecord(
  job: PlatformJob,
  username: string | null,
  action: HumanAction,
  notes: string
): ClaimRecord {
  return recordFromJob(job, {
    finalHandle: username,
    status: 'awaiting_human_action',
    verificationStatus: 'pending',
    credentialsStored: true,
    directUrl: action.directUrl,
    humanAction: action,
    notes,
  })
}

async function openContext(job: PlatformJob): Promise<BrowserContext> {
  const userDataDir = join('system', 'identity-claims', 'browser-sessions', job.id)
  mkdirSync(userDataDir, { recursive: true })
  return chromium.launchPersistentContext(userDataDir, {
    headless: process.env.CHEFFLOW_IDENTITY_HEADLESS === '1',
    viewport: { width: 1280, height: 900 },
  })
}

export async function runBrowserJob(
  job: PlatformJob,
  inputs: IdentityInputs
): Promise<ClaimRecord> {
  if (!job.signupUrl) {
    return recordFromJob(job, {
      status: 'failed',
      verificationStatus: 'unknown',
      notes: 'No signup URL configured.',
    })
  }

  const context = await openContext(job)
  const page = context.pages()[0] ?? (await context.newPage())

  try {
    await page.goto(job.signupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })

    for (const handle of HANDLE_FALLBACK_CHAIN) {
      storeCredential({
        platformId: job.id,
        platformName: job.name,
        username: handle,
        email: inputs.email,
        phone: inputs.phone,
        password: inputs.password,
        capturedAt: nowIso(),
        status: 'attempting',
      })

      const firstText = await pageText(page)
      if (HUMAN_BLOCK_RE.test(firstText)) {
        const action = actionFor(
          job,
          handle,
          'Blocked by human verification',
          'Complete the visible verification challenge',
          page.url()
        )
        console.log(formatHumanAction(action))
        return stopRecord(
          job,
          handle,
          action,
          'Paused before automated entry because verification is visible.'
        )
      }

      await fillFirst(page, EMAIL_SELECTORS, inputs.email)
      await fillFirst(page, PHONE_SELECTORS, inputs.phone)
      await fillFirst(page, PASSWORD_SELECTORS, inputs.password)
      const usernameFilled = await fillFirst(page, USERNAME_SELECTORS, handle)

      if (!usernameFilled) {
        const action = actionFor(
          job,
          handle,
          'Username field not detected',
          `Enter username ${handle} in the visible signup form`,
          page.url()
        )
        console.log(formatHumanAction(action))
        return stopRecord(
          job,
          handle,
          action,
          'Paused because the platform form did not expose a generic username field.'
        )
      }

      await clickFirst(page, SUBMIT_SELECTORS)
      await page.waitForTimeout(3500)

      const text = await pageText(page)
      if (USERNAME_TAKEN_RE.test(text)) {
        await page.goto(job.signupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
        continue
      }
      if (HUMAN_BLOCK_RE.test(text)) {
        const action = actionFor(
          job,
          handle,
          'Awaiting human verification',
          'Complete the visible CAPTCHA, email, or SMS verification',
          page.url()
        )
        console.log(formatHumanAction(action))
        return stopRecord(job, handle, action, 'Paused at required human verification checkpoint.')
      }
      if (SUCCESS_RE.test(text) || !/sign up|signup|register|create account/i.test(page.url())) {
        storeCredential({
          platformId: job.id,
          platformName: job.name,
          username: handle,
          email: inputs.email,
          phone: inputs.phone,
          password: inputs.password,
          capturedAt: nowIso(),
          status: 'complete-or-pending-platform-confirmation',
        })
        return recordFromJob(job, {
          finalHandle: handle,
          status: 'partial',
          verificationStatus: 'unknown',
          credentialsStored: true,
          directUrl: page.url(),
          notes:
            'Automation submitted available fields. Resume validation should confirm account state after platform confirmation.',
        })
      }

      const action = actionFor(
        job,
        handle,
        'Signup form needs human input',
        'Complete the next visible signup step',
        page.url()
      )
      console.log(formatHumanAction(action))
      return stopRecord(
        job,
        handle,
        action,
        'Paused because the next form step is platform-specific.'
      )
    }

    return recordFromJob(job, {
      status: 'failed',
      verificationStatus: 'unknown',
      credentialsStored: true,
      notes: 'All approved handle candidates were reported unavailable.',
      directUrl: page.url(),
    })
  } finally {
    await context.close()
  }
}

export async function resumeBrowserJob(job: PlatformJob): Promise<ClaimRecord> {
  if (!job.resumeUrl) {
    return recordFromJob(job, {
      status: 'failed',
      verificationStatus: 'unknown',
      notes: 'No resume URL configured.',
    })
  }

  const context = await openContext(job)
  const page = context.pages()[0] ?? (await context.newPage())
  try {
    await page.goto(job.resumeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(2500)
    const text = await pageText(page)
    if (HUMAN_BLOCK_RE.test(text)) {
      const action = actionFor(
        job,
        null,
        'Still awaiting human verification',
        'Complete the visible verification challenge',
        page.url()
      )
      console.log(formatHumanAction(action))
      return recordFromJob(job, {
        status: 'awaiting_human_action',
        verificationStatus: 'pending',
        credentialsStored: true,
        directUrl: page.url(),
        humanAction: action,
        notes: 'Resume found another required human checkpoint.',
      })
    }
    if (/log in|login|sign in|signin|sign up|signup|register/i.test(text)) {
      const action = actionFor(
        job,
        null,
        'Account state not confirmed',
        'Sign in or finish the visible account setup step',
        page.url()
      )
      console.log(formatHumanAction(action))
      return recordFromJob(job, {
        status: 'awaiting_human_action',
        verificationStatus: 'pending',
        credentialsStored: true,
        directUrl: page.url(),
        humanAction: action,
        notes: 'Resume could not validate a logged-in account state.',
      })
    }
    return recordFromJob(job, {
      status: 'complete',
      verificationStatus: 'verified',
      credentialsStored: true,
      directUrl: page.url(),
      notes: 'Resume validation found an authenticated or completed account state.',
    })
  } finally {
    await context.close()
  }
}
