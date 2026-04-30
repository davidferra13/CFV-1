#!/usr/bin/env node
import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = process.cwd()
const BASE_URL = process.env.CHEFFLOW_BASE_URL || 'http://localhost:3100'
const AUTH_STATE = resolve(ROOT, '.auth', 'admin.json')
const USER_DATA_DIR = resolve(ROOT, '.auth', 'third-monitor-wall-profile')

const bounds = {
  x: Number(process.env.THIRD_MONITOR_X ?? -1920),
  y: Number(process.env.THIRD_MONITOR_Y ?? 1718),
  width: Number(process.env.THIRD_MONITOR_WIDTH ?? 1920),
  height: Number(process.env.THIRD_MONITOR_HEIGHT ?? 1032),
}

const routes = [
  '/admin/v1-builder',
  '/admin',
  '/admin/system',
  '/dashboard',
]

function readAuthState() {
  if (!existsSync(AUTH_STATE)) {
    throw new Error(`Missing auth state: ${AUTH_STATE}`)
  }

  const state = JSON.parse(readFileSync(AUTH_STATE, 'utf8'))
  if (!Array.isArray(state.cookies) || state.cookies.length === 0) {
    throw new Error(`Auth state has no cookies: ${AUTH_STATE}`)
  }

  return state
}

async function openWall() {
  mkdirSync(USER_DATA_DIR, { recursive: true })
  const state = readAuthState()
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    viewport: { width: bounds.width, height: bounds.height },
    args: [
      '--new-window',
      `--window-position=${bounds.x},${bounds.y}`,
      `--window-size=${bounds.width},${bounds.height}`,
    ],
  }).catch(() => chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: bounds.width, height: bounds.height },
    args: [
      '--new-window',
      `--window-position=${bounds.x},${bounds.y}`,
      `--window-size=${bounds.width},${bounds.height}`,
    ],
  }))

  await context.addCookies(state.cookies)

  for (const route of routes) {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
  }

  console.log(
    `[third-monitor-wall] open ${routes.length} signed-in tabs at ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}`
  )

  context.on('close', () => process.exit(0))
  setInterval(() => {}, 2_147_483_647)
}

openWall().catch((error) => {
  console.error(`[third-monitor-wall] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
