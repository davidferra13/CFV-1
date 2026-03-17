#!/usr/bin/env npx tsx
// RL Controller - Main entry point for the reinforcement learning system.
// Orchestrates episodes, manages checkpointing, and prints live status.
//
// Usage:
//   npx tsx tests/rl/controller.ts              # Start fresh or resume
//   npx tsx tests/rl/controller.ts --resume     # Explicitly resume from checkpoint
//   npx tsx tests/rl/controller.ts --report     # Generate report from existing data
//   npx tsx tests/rl/controller.ts --episodes=500  # Run specific number of episodes
//   npx tsx tests/rl/controller.ts --base-url=http://localhost:3200  # Override target URL

import { chromium, BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import type { EpisodeConfig, EpisodeResult, RLConfig } from './types'
import { DEFAULT_CONFIG } from './types'
import { RLAgent } from './agent'
import { QTable } from './q-table'
import * as db from './database'
import * as checkpoint from './checkpoint-manager'
import { selectArchetype, selectGoal } from './archetypes'
import { generateMarkdownReport } from './reporting/markdown-reporter'

// ── Parse CLI Args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flags = {
  resume: args.includes('--resume'),
  report: args.includes('--report'),
  episodes:
    parseInt(args.find((a) => a.startsWith('--episodes='))?.split('=')[1] ?? '0') || Infinity,
  baseUrl: args.find((a) => a.startsWith('--base-url='))?.split('=')[1] ?? '',
}

// ── Configuration ────────────────────────────────────────────────────────────

const config: RLConfig = {
  ...DEFAULT_CONFIG,
  // Allow override for local beta when Cloudflare Tunnel is down
  ...(flags.baseUrl ? { baseUrl: flags.baseUrl } : {}),
}

// Load auth credentials
function loadCredentials(role: 'chef' | 'client'): { email: string; password: string } | null {
  const paths = [
    path.resolve(__dirname, `../../.auth/agent.json`),
    path.resolve(__dirname, `../../.auth/${role}.json`),
  ]

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
        if (data.email && data.password) return data
      } catch {
        continue
      }
    }
  }

  // Fallback to env vars
  const email = process.env.AGENT_EMAIL
  const password = process.env.AGENT_PASSWORD
  if (email && password) return { email, password }

  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('ChefFlow RL Agent')
  console.log(`Target: ${config.baseUrl}`)
  console.log(`Mode: ${flags.report ? 'Report Only' : flags.resume ? 'Resume' : 'Start/Resume'}`)
  console.log('='.repeat(60))

  // Report-only mode
  if (flags.report) {
    generateMarkdownReport()
    console.log('Report generated. See docs/rl-reports/')
    process.exit(0)
  }

  // Initialize Q-table (with checkpoint if available)
  let startEpisode = 0
  let startEpsilon = config.epsilonStart

  const ckpt = checkpoint.loadLatestCheckpoint()
  if (ckpt) {
    startEpisode = ckpt.episodeNumber
    startEpsilon = ckpt.epsilon
    console.log(`Resuming from episode ${startEpisode} (epsilon: ${startEpsilon.toFixed(4)})`)
  } else {
    console.log('Starting fresh (no checkpoint found)')
  }

  const qTable = new QTable(config, startEpsilon, startEpisode)
  const agent = new RLAgent(config, qTable)

  // Load credentials
  const chefCreds = loadCredentials('chef')
  if (!chefCreds) {
    console.error('ERROR: No agent credentials found.')
    console.error('Create .auth/agent.json with { "email": "...", "password": "..." }')
    console.error('Or set AGENT_EMAIL and AGENT_PASSWORD env vars.')
    process.exit(1)
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  })

  console.log('Browser launched (headless)')

  // Graceful shutdown handler
  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('\n[shutdown] Saving checkpoint and closing...')
    qTable.flush()
    const state = qTable.getCheckpointState()
    checkpoint.saveCheckpoint(state.episodeCount, state.epsilon, 0)
    checkpoint.pruneCheckpoints(5)
    db.closeDb()
    await browser.close()
    console.log('[shutdown] Complete.')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Authenticate
  const context = await authenticateChef(browser, chefCreds)
  if (!context) {
    console.error('ERROR: Authentication failed. Check credentials.')
    await browser.close()
    process.exit(1)
  }

  console.log('Authenticated as agent account')
  console.log(
    `Starting episode loop (max: ${flags.episodes === Infinity ? 'unlimited' : flags.episodes})`
  )
  console.log('-'.repeat(60))

  // ── Episode Loop ─────────────────────────────────────────────────────

  let episodesRun = 0
  let lastCheckpointTime = Date.now()

  while (episodesRun < flags.episodes && !shuttingDown) {
    const currentEpisode = startEpisode + episodesRun
    const archetype = selectArchetype(currentEpisode)
    const goal = selectGoal(archetype)

    const episodeConfig: EpisodeConfig = {
      archetypeId: archetype.id,
      goalId: goal,
      maxSteps: Math.min(config.maxStepsPerEpisode, archetype.sessionDurationMinutes * 10),
      viewportWidth: archetype.viewport.width,
      viewportHeight: archetype.viewport.height,
      networkThrottle: null,
      cpuThrottle: 1.0,
      subAgent: null,
    }

    // Print episode header
    const eps = qTable.getEpsilon()
    process.stdout.write(
      `[ep ${currentEpisode}] ${archetype.id} -> ${goal} (eps: ${eps.toFixed(3)}) ... `
    )

    try {
      const result = await agent.runEpisode(context, episodeConfig)

      // Print result
      const goalIcon = result.goalAchieved ? 'Y' : 'N'
      const errCount = result.consoleErrors > 0 ? ` err:${result.consoleErrors}` : ''
      console.log(
        `${result.terminalReason} | steps:${result.totalSteps} | goal:${goalIcon} | ` +
          `reward:${result.totalReward.toFixed(1)} | routes:${result.uniqueRoutesVisited}${errCount}`
      )

      // Update Q-table
      qTable.decayEpsilon()

      // Flush Q-table periodically (every 10 episodes)
      if (episodesRun % 10 === 0) {
        qTable.flush()
      }
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`)
    }

    episodesRun++

    // Checkpoint check
    const shouldCheckpoint =
      episodesRun % config.checkpointEveryEpisodes === 0 ||
      Date.now() - lastCheckpointTime > config.checkpointEveryMinutes * 60 * 1000

    if (shouldCheckpoint) {
      qTable.flush()
      const state = qTable.getCheckpointState()
      checkpoint.saveCheckpoint(state.episodeCount, state.epsilon, 0)
      checkpoint.pruneCheckpoints(5)
      lastCheckpointTime = Date.now()

      // Print stats
      const stats = db.getStats()
      console.log('-'.repeat(60))
      console.log(
        `[stats] Episodes: ${stats.totalEpisodes} | Avg Reward: ${stats.avgReward.toFixed(1)} | ` +
          `Goal Rate: ${stats.goalRate.toFixed(1)}% | Routes: ${stats.routesCovered} | ` +
          `Anomalies: ${stats.anomaliesTotal} (${stats.anomaliesCritical} critical)`
      )
      console.log('-'.repeat(60))
    }
  }

  // Final cleanup
  console.log('\n' + '='.repeat(60))
  console.log('RL Agent finished.')
  qTable.flush()
  const state = qTable.getCheckpointState()
  checkpoint.saveCheckpoint(state.episodeCount, state.epsilon, 0)
  checkpoint.pruneCheckpoints(5)

  // Generate final report
  generateMarkdownReport()

  const stats = db.getStats()
  console.log(`Total Episodes: ${stats.totalEpisodes}`)
  console.log(`Avg Reward: ${stats.avgReward.toFixed(1)}`)
  console.log(`Goal Rate: ${stats.goalRate.toFixed(1)}%`)
  console.log(`Routes Covered: ${stats.routesCovered}`)
  console.log(`Anomalies: ${stats.anomaliesTotal} (${stats.anomaliesCritical} critical)`)
  console.log('Report: docs/rl-reports/summary-latest.md')
  console.log('='.repeat(60))

  db.closeDb()
  await browser.close()
}

// ── Authentication ───────────────────────────────────────────────────────────

async function authenticateChef(
  browser: import('@playwright/test').Browser,
  creds: { email: string; password: string }
): Promise<BrowserContext | null> {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Use the e2e auth endpoint if available
    const response = await page.request.post(`${config.baseUrl}/api/e2e/auth`, {
      data: { email: creds.email, password: creds.password },
    })

    if (response.ok()) {
      const data = await response.json()
      // Set auth cookies from response
      if (data.session) {
        await context.addCookies([
          {
            name: 'sb-access-token',
            value: data.session.access_token,
            domain: new URL(config.baseUrl).hostname,
            path: '/',
          },
          {
            name: 'sb-refresh-token',
            value: data.session.refresh_token,
            domain: new URL(config.baseUrl).hostname,
            path: '/',
          },
        ])
      }

      // Verify auth works by visiting dashboard
      await page.goto(`${config.baseUrl}/dashboard`, { timeout: 15000, waitUntil: 'commit' })
      await page.waitForTimeout(2000)

      // Check we're on dashboard (not redirected to signin)
      if (page.url().includes('/auth/signin')) {
        // Fallback: sign in via UI
        return await authenticateViaUI(browser, creds)
      }

      await page.close()
      return context
    }
  } catch {
    // API auth failed; try UI auth
  }

  await page.close()
  await context.close()
  return await authenticateViaUI(browser, creds)
}

async function authenticateViaUI(
  browser: import('@playwright/test').Browser,
  creds: { email: string; password: string }
): Promise<BrowserContext | null> {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log('[auth] Navigating to sign-in page...')
    await page.goto(`${config.baseUrl}/auth/signin`, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2000)
    console.log(`[auth] Page loaded: ${page.url()}`)

    // Try multiple selector strategies for the email input
    let emailInput = page.locator('input[type="email"]')
    let passwordInput = page.locator('input[type="password"]')

    // Fallback: try by label text
    if ((await emailInput.count()) === 0) {
      emailInput = page.getByLabel('Email')
      passwordInput = page.getByLabel('Password')
    }

    const emailVisible = await emailInput.isVisible({ timeout: 10000 }).catch(() => false)
    console.log(`[auth] Email input visible: ${emailVisible}`)

    if (emailVisible) {
      await emailInput.fill(creds.email)
      await passwordInput.fill(creds.password)
      console.log('[auth] Credentials filled, clicking sign in...')

      // Try multiple selectors for submit button
      const submitBtn = page.locator('button[type="submit"]')
      if ((await submitBtn.count()) > 0) {
        await submitBtn.first().click()
      } else {
        await page.getByRole('button', { name: /sign in/i }).click()
      }

      // Wait for navigation (auth redirect)
      await page
        .waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 15000 })
        .catch(() => {
          console.log(`[auth] Still on sign-in page after submit: ${page.url()}`)
        })

      console.log(`[auth] Post-signin URL: ${page.url()}`)

      if (!page.url().includes('/auth/signin')) {
        await page.close()
        return context
      }

      // Check for error message
      const errorText = await page
        .locator('.alert, [role="alert"]')
        .textContent()
        .catch(() => null)
      if (errorText) console.log(`[auth] Error on page: ${errorText}`)
    } else {
      console.log('[auth] Email input not found on page')
      // Debug: log page content
      const title = await page.title()
      console.log(`[auth] Page title: "${title}"`)
    }
  } catch (err) {
    console.error('[auth] UI auth error:', err instanceof Error ? err.message : err)
  }

  await page.close()
  await context.close()
  return null
}

// ── Entry Point ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error:', err)
  db.closeDb()
  process.exit(1)
})
