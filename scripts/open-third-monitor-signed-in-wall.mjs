#!/usr/bin/env node
import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const BASE_URL = process.env.CHEFFLOW_BASE_URL || 'http://localhost:3100'
const AUTH_STATE = resolve(ROOT, '.auth', 'admin.json')

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
  readAuthState()
  const launchOptions = {
    headless: false,
    args: [
      '--new-window',
      `--window-position=${bounds.x},${bounds.y}`,
      `--window-size=${bounds.width},${bounds.height}`,
    ],
  }

  const browser = await chromium
    .launch({
      ...launchOptions,
      channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    })
    .catch(() => chromium.launch(launchOptions))

  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: AUTH_STATE,
    viewport: { width: bounds.width, height: bounds.height },
  })

  const existingPages = context.pages()
  const firstPage = existingPages[0] || (await context.newPage())

  for (const [index, route] of routes.entries()) {
    const page = index === 0 ? firstPage : await context.newPage()
    await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    if (index === 0) {
      await page.bringToFront()
    }
  }

  console.log(
    `[third-monitor-wall] open ${routes.length} signed-in tabs at ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}`
  )

  browser.on('disconnected', () => process.exit(0))
  setInterval(() => {}, 2_147_483_647)
}

openWall().catch((error) => {
  console.error(`[third-monitor-wall] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
