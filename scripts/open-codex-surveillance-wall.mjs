#!/usr/bin/env node
import { chromium } from 'playwright'
import { existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const CHEFFLOW_BASE_URL = process.env.CHEFFLOW_BASE_URL || 'http://localhost:3100'
const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'http://localhost:41937'
const AUTH_STATE = resolve(ROOT, '.auth', 'codex-storage.json')

const bounds = {
  x: Number(process.env.THIRD_MONITOR_X ?? -1920),
  y: Number(process.env.THIRD_MONITOR_Y ?? 1718),
  width: Number(process.env.THIRD_MONITOR_WIDTH ?? 1920),
  height: Number(process.env.THIRD_MONITOR_HEIGHT ?? 1032),
}

const halfWidth = Math.floor(bounds.width / 2)
const halfHeight = Math.floor(bounds.height / 2)

const windows = [
  {
    label: 'Mission Control',
    url: MISSION_CONTROL_URL,
    auth: false,
    x: bounds.x,
    y: bounds.y,
    width: halfWidth,
    height: halfHeight,
  },
  {
    label: 'V1 Builder',
    url: `${CHEFFLOW_BASE_URL}/admin/v1-builder`,
    auth: true,
    x: bounds.x + halfWidth,
    y: bounds.y,
    width: bounds.width - halfWidth,
    height: halfHeight,
  },
  {
    label: 'ChefFlow Dashboard',
    url: `${CHEFFLOW_BASE_URL}/dashboard`,
    auth: true,
    x: bounds.x,
    y: bounds.y + halfHeight,
    width: halfWidth,
    height: bounds.height - halfHeight,
  },
]

function authStateFor(windowConfig) {
  if (!windowConfig.auth) return undefined
  if (!existsSync(AUTH_STATE)) {
    console.warn(`[codex-wall] Missing Codex auth state: ${AUTH_STATE}`)
    return undefined
  }
  return AUTH_STATE
}

async function openWindow(windowConfig) {
  const launchOptions = {
    headless: false,
    args: [
      '--new-window',
      `--window-position=${windowConfig.x},${windowConfig.y}`,
      `--window-size=${windowConfig.width},${windowConfig.height}`,
      '--force-device-scale-factor=1',
      '--high-dpi-support=1',
    ],
  }

  const browser = await chromium
    .launch({ ...launchOptions, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
    .catch(() => chromium.launch(launchOptions))

  const context = await browser.newContext({
    storageState: authStateFor(windowConfig),
    viewport: { width: windowConfig.width, height: windowConfig.height },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)

  await page
    .goto(windowConfig.url, { waitUntil: 'domcontentloaded', timeout: 10_000 })
    .catch((error) => {
      console.warn(`[codex-wall] ${windowConfig.label} did not finish loading: ${error.message}`)
    })

  await page
    .evaluate((label) => {
      document.title = `Codex Wall - ${label}`
      document.documentElement.style.zoom = '1.08'
    }, windowConfig.label)
    .catch(() => {})

  console.log(
    `[codex-wall] ${windowConfig.label}: ${windowConfig.x},${windowConfig.y} ${windowConfig.width}x${windowConfig.height} -> ${windowConfig.url}`
  )

  return browser
}

async function main() {
  console.log(
    `[codex-wall] opening surveillance wall on ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}`
  )

  const browsers = []
  for (const windowConfig of windows) {
    browsers.push(await openWindow(windowConfig))
  }

  process.on('SIGINT', async () => {
    await Promise.allSettled(browsers.map((browser) => browser.close()))
    process.exit(0)
  })

  setInterval(() => {}, 2_147_483_647)
}

main().catch((error) => {
  console.error(`[codex-wall] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
