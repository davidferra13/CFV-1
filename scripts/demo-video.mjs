/**
 * ChefFlow Demo Video Recorder
 *
 * Records scripted demo videos with a smooth animated cursor.
 * Each scenario is a self-contained function that produces one MP4-ready video.
 *
 * Usage:
 *   node scripts/demo-video.mjs <scenario-id>        Record one video
 *   node scripts/demo-video.mjs --list                List all scenarios
 *   node scripts/demo-video.mjs --top10               Record the top 10 priority videos
 *
 * Examples:
 *   node scripts/demo-video.mjs chef-full-lifecycle
 *   node scripts/demo-video.mjs pub-landing --format tiktok
 *   node scripts/demo-video.mjs chef-command-center --format youtube
 */

import { chromium } from 'playwright'
import { readFileSync, mkdirSync, existsSync, renameSync } from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ── Config ──────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3100'
const VIDEO_DIR = path.resolve('docs/demo-videos')
mkdirSync(VIDEO_DIR, { recursive: true })

const FORMATS = {
  youtube:  { width: 1920, height: 1080, label: '16:9 YouTube' },
  tiktok:   { width: 1080, height: 1920, label: '9:16 TikTok/Reels' },
  square:   { width: 1080, height: 1080, label: '1:1 Instagram/LinkedIn' },
}

// ── Cursor injection CSS + JS ───────────────────────────────────────

const OVERLAY_STYLES = `
  /* ── Cursor ──────────────────────────────────────────── */
  #demo-cursor {
    position: fixed;
    top: 0; left: 0;
    width: 24px; height: 24px;
    pointer-events: none;
    z-index: 999999;
    transition: top 0.6s cubic-bezier(0.25, 0.1, 0.25, 1),
                left 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
    filter: drop-shadow(1px 2px 3px rgba(0,0,0,0.4));
  }
  #demo-cursor.clicking {
    transform: scale(0.85);
    transition: top 0.6s cubic-bezier(0.25, 0.1, 0.25, 1),
                left 0.6s cubic-bezier(0.25, 0.1, 0.25, 1),
                transform 0.08s ease-in;
  }
  #demo-click-ring {
    position: fixed;
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 2px solid rgba(232, 143, 71, 0.7);
    pointer-events: none;
    z-index: 999998;
    opacity: 0;
    transform: scale(0.5);
  }
  #demo-click-ring.pulse {
    opacity: 1;
    transform: scale(1.8);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
  }
  #demo-click-ring.fade {
    opacity: 0;
    transition: opacity 0.2s ease-out;
  }

  /* ── Caption bar (bottom of screen) ──────────────────── */
  #demo-caption {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    padding: 20px 32px 28px;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
    z-index: 999990;
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  #demo-caption.visible { opacity: 1; }
  #demo-caption-text {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
    text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    max-width: 80%;
  }
  #demo-caption-sub {
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.75);
    margin-top: 4px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }

  /* ── Title card (centered, full-screen) ──────────────── */
  #demo-title-card {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0a0e17;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
    z-index: 999995;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  #demo-title-card.visible { opacity: 1; }
  #demo-title-card .title-main {
    font-size: 42px;
    font-weight: 800;
    text-align: center;
    max-width: 80%;
    line-height: 1.2;
  }
  #demo-title-card .title-sub {
    font-size: 18px;
    font-weight: 400;
    color: #e88f47;
    margin-top: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  #demo-title-card .title-logo {
    font-size: 16px;
    color: rgba(255,255,255,0.4);
    margin-top: 32px;
    letter-spacing: 3px;
  }

  /* ── Spotlight (dim everything except target) ────────── */
  #demo-spotlight {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 999985;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  #demo-spotlight.visible { opacity: 1; }

  /* ── Callout arrow / label ───────────────────────────── */
  .demo-callout {
    position: fixed;
    padding: 8px 16px;
    background: #e88f47;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 700;
    border-radius: 8px;
    pointer-events: none;
    z-index: 999991;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    white-space: nowrap;
  }
  .demo-callout.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .demo-callout::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 24px;
    border: 6px solid transparent;
    border-top-color: #e88f47;
  }

  /* ── Fade / transition overlay ───────────────────────── */
  #demo-fade {
    position: fixed;
    inset: 0;
    background: #0a0e17;
    pointer-events: none;
    z-index: 999993;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  #demo-fade.visible { opacity: 1; }

  /* ── Progress bar (top of screen) ────────────────────── */
  #demo-progress {
    position: fixed;
    top: 0; left: 0;
    height: 3px;
    background: linear-gradient(90deg, #e88f47, #f5a862);
    pointer-events: none;
    z-index: 999996;
    width: 0%;
    transition: width 0.5s linear;
  }

  /* ── Zoom container ──────────────────────────────────── */
  #demo-zoom-wrapper {
    transition: transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1),
                transform-origin 0s;
  }
`

// Standard macOS-style cursor SVG (white with black outline)
const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 3l14 10-6.5 1.5L9 21l-1-4.5L5 3z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>`

// ── DemoRecorder class ──────────────────────────────────────────────

class DemoRecorder {
  constructor(page, format = 'youtube') {
    this.page = page
    this.format = FORMATS[format] || FORMATS.youtube
    this.cursorX = this.format.width / 2
    this.cursorY = this.format.height / 2
    this.initialized = false
  }

  /** Inject cursor + all overlay elements into the page */
  async init() {
    if (this.initialized) return
    // Hide the real cursor
    await this.page.addStyleTag({ content: '* { cursor: none !important; }' })
    // Inject all overlay styles
    await this.page.addStyleTag({ content: OVERLAY_STYLES })
    // Inject all overlay DOM elements
    await this.page.evaluate((svg) => {
      // Cursor
      const cursor = document.createElement('div')
      cursor.id = 'demo-cursor'
      cursor.innerHTML = svg
      document.body.appendChild(cursor)

      const ring = document.createElement('div')
      ring.id = 'demo-click-ring'
      document.body.appendChild(ring)

      // Caption bar
      const caption = document.createElement('div')
      caption.id = 'demo-caption'
      caption.innerHTML = '<div id="demo-caption-text"></div><div id="demo-caption-sub"></div>'
      document.body.appendChild(caption)

      // Title card
      const title = document.createElement('div')
      title.id = 'demo-title-card'
      title.innerHTML = '<div class="title-main"></div><div class="title-sub"></div><div class="title-logo">CHEFFLOW</div>'
      document.body.appendChild(title)

      // Spotlight overlay
      const spot = document.createElement('div')
      spot.id = 'demo-spotlight'
      document.body.appendChild(spot)

      // Fade overlay
      const fade = document.createElement('div')
      fade.id = 'demo-fade'
      document.body.appendChild(fade)

      // Progress bar
      const prog = document.createElement('div')
      prog.id = 'demo-progress'
      document.body.appendChild(prog)
    }, CURSOR_SVG)
    this.initialized = true
  }

  /** Re-inject cursor after navigation (page reload clears DOM) */
  async reinject() {
    this.initialized = false
    await this.init()
    // Restore cursor position
    await this.page.evaluate(({ x, y }) => {
      const c = document.getElementById('demo-cursor')
      if (c) { c.style.left = x + 'px'; c.style.top = y + 'px' }
    }, { x: this.cursorX, y: this.cursorY })
  }

  /** Smoothly move cursor to center of a selector */
  async moveTo(selector, opts = {}) {
    const { offset = { x: 0, y: 0 }, speed = 600 } = opts
    await this.reinjectIfNeeded()

    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) {
      console.warn(`  [cursor] Could not find: ${selector}`)
      return
    }

    const targetX = box.x + box.width / 2 + offset.x
    const targetY = box.y + box.height / 2 + offset.y
    this.cursorX = targetX
    this.cursorY = targetY

    await this.page.evaluate(({ x, y, ms }) => {
      const c = document.getElementById('demo-cursor')
      if (c) {
        c.style.transitionDuration = ms + 'ms'
        c.style.left = x + 'px'
        c.style.top = y + 'px'
      }
    }, { x: targetX, y: targetY, ms: speed })

    await this.page.waitForTimeout(speed + 100)
  }

  /** Move to element and click it */
  async clickOn(selector, opts = {}) {
    await this.moveTo(selector, opts)
    await this.showClickEffect()
    await this.page.locator(selector).first().click()
    await this.page.waitForTimeout(opts.waitAfter || 800)
  }

  /** Move to element, click, then type text */
  async typeInto(selector, text, opts = {}) {
    await this.clickOn(selector, opts)
    await this.page.waitForTimeout(200)
    // Type character by character for visual effect
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: 40 + Math.random() * 30 })
    }
    await this.page.waitForTimeout(opts.waitAfter || 400)
  }

  /** Smooth scroll to bring element into view */
  async scrollTo(selector, opts = {}) {
    await this.reinjectIfNeeded()
    await this.page.locator(selector).first().scrollIntoViewIfNeeded()
    await this.page.waitForTimeout(opts.waitAfter || 600)
  }

  /** Smooth scroll by pixel amount */
  async scrollBy(pixels, opts = {}) {
    await this.reinjectIfNeeded()
    await this.page.evaluate((px) => {
      window.scrollBy({ top: px, behavior: 'smooth' })
    }, pixels)
    await this.page.waitForTimeout(opts.waitAfter || 600)
  }

  /** Navigate to a URL and wait for load */
  async navigate(url, opts = {}) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
    await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await this.page.waitForTimeout(opts.waitAfter || 2000)
    await this.reinject()
  }

  /** Wait / pause for dramatic effect */
  async pause(ms = 1000) {
    await this.page.waitForTimeout(ms)
  }

  /** Hover over an element (move cursor, no click) */
  async hoverOn(selector, opts = {}) {
    await this.moveTo(selector, opts)
    await this.page.locator(selector).first().hover()
    await this.page.waitForTimeout(opts.waitAfter || 500)
  }

  // ── OVERLAYS (what makes videos convert) ──────────────────────

  /**
   * Show a title card (full-screen, centered text on dark background).
   * Use this to open every video - the 3-second hook.
   *
   * @param {string} main - Big headline ("You're losing clients.")
   * @param {string} sub - Smaller tagline ("Here's why.")
   * @param {number} duration - How long to show (ms)
   */
  async titleCard(main, sub = '', duration = 3000) {
    await this.reinjectIfNeeded()
    await this.page.evaluate(({ main, sub }) => {
      const el = document.getElementById('demo-title-card')
      if (!el) return
      el.querySelector('.title-main').textContent = main
      el.querySelector('.title-sub').textContent = sub
      el.classList.add('visible')
    }, { main, sub })
    await this.page.waitForTimeout(duration)
    await this.page.evaluate(() => {
      const el = document.getElementById('demo-title-card')
      if (el) el.classList.remove('visible')
    })
    await this.page.waitForTimeout(500)
  }

  /**
   * Show a caption at the bottom of the screen (gradient overlay).
   * These narrate the action. Viewers on mute rely on these.
   *
   * @param {string} text - Main caption text
   * @param {string} sub - Optional smaller subtext
   */
  async caption(text, sub = '') {
    await this.reinjectIfNeeded()
    await this.page.evaluate(({ text, sub }) => {
      const el = document.getElementById('demo-caption')
      if (!el) return
      document.getElementById('demo-caption-text').textContent = text
      document.getElementById('demo-caption-sub').textContent = sub
      el.classList.add('visible')
    }, { text, sub })
  }

  /** Hide the caption */
  async captionHide() {
    await this.page.evaluate(() => {
      const el = document.getElementById('demo-caption')
      if (el) el.classList.remove('visible')
    })
  }

  /**
   * Show a callout label pointing to a specific element.
   * Draws attention to a feature: "Lead Score: 87/100"
   *
   * @param {string} selector - Element to point at
   * @param {string} label - Text for the callout
   * @param {Object} opts - { position: 'above'|'below'|'left'|'right', duration }
   */
  async callout(selector, label, opts = {}) {
    const { position = 'above', duration = 2500 } = opts
    await this.reinjectIfNeeded()

    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) return

    const id = 'demo-callout-' + Date.now()
    let top, left
    if (position === 'above') {
      top = box.y - 44
      left = box.x + box.width / 2 - 40
    } else if (position === 'below') {
      top = box.y + box.height + 10
      left = box.x + box.width / 2 - 40
    } else if (position === 'left') {
      top = box.y + box.height / 2 - 18
      left = box.x - 160
    } else {
      top = box.y + box.height / 2 - 18
      left = box.x + box.width + 10
    }

    await this.page.evaluate(({ id, label, top, left, position }) => {
      const el = document.createElement('div')
      el.id = id
      el.className = 'demo-callout'
      el.textContent = label
      el.style.top = top + 'px'
      el.style.left = left + 'px'
      // Flip arrow for 'below' position
      if (position === 'below') {
        el.style.setProperty('--arrow', 'bottom')
        const style = el.querySelector('::after') // Can't style pseudo in JS, use inline
        el.insertAdjacentHTML('beforeend',
          '<span style="position:absolute;bottom:100%;left:24px;border:6px solid transparent;border-bottom-color:#e88f47;"></span>')
        // Remove default arrow
        el.style.cssText += ';'
      }
      document.body.appendChild(el)
      requestAnimationFrame(() => el.classList.add('visible'))
    }, { id, label, top, left, position })

    await this.page.waitForTimeout(duration)

    // Fade out and remove
    await this.page.evaluate((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.classList.remove('visible')
        setTimeout(() => el.remove(), 300)
      }
    }, id)
  }

  /**
   * Spotlight: dim everything except the target element.
   * Creates a dark overlay with a "hole" around the target.
   *
   * @param {string} selector - Element to spotlight
   * @param {Object} opts - { padding, duration }
   */
  async spotlight(selector, opts = {}) {
    const { padding = 12 } = opts
    await this.reinjectIfNeeded()

    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) return

    await this.page.evaluate(({ box, padding }) => {
      const el = document.getElementById('demo-spotlight')
      if (!el) return
      const x = box.x - padding
      const y = box.y - padding
      const w = box.width + padding * 2
      const h = box.height + padding * 2
      const r = 12
      // SVG mask with rounded rectangle cutout
      el.innerHTML = `<svg width="100%" height="100%" style="position:absolute;inset:0;">
        <defs>
          <mask id="spot-mask">
            <rect width="100%" height="100%" fill="white"/>
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spot-mask)"/>
      </svg>`
      el.classList.add('visible')
    }, { box, padding })
  }

  /** Remove spotlight */
  async spotlightOff() {
    await this.page.evaluate(() => {
      const el = document.getElementById('demo-spotlight')
      if (el) {
        el.classList.remove('visible')
        setTimeout(() => { el.innerHTML = '' }, 400)
      }
    })
    await this.page.waitForTimeout(400)
  }

  /**
   * Zoom into a specific area of the page.
   * Scales the viewport around the target element.
   *
   * @param {string} selector - Element to zoom into
   * @param {number} scale - Zoom level (1.5 = 150%)
   */
  async zoomTo(selector, scale = 1.8) {
    await this.reinjectIfNeeded()
    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) return

    const originX = box.x + box.width / 2
    const originY = box.y + box.height / 2

    await this.page.evaluate(({ originX, originY, scale }) => {
      document.body.style.transformOrigin = `${originX}px ${originY}px`
      document.body.style.transform = `scale(${scale})`
      document.body.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)'
    }, { originX, originY, scale })

    await this.page.waitForTimeout(900)
  }

  /** Reset zoom back to normal */
  async zoomReset() {
    await this.page.evaluate(() => {
      document.body.style.transform = 'scale(1)'
    })
    await this.page.waitForTimeout(900)
  }

  /**
   * Fade to black (scene transition).
   * Pair with fadeIn() after navigating.
   */
  async fadeOut(duration = 400) {
    await this.reinjectIfNeeded()
    await this.page.evaluate((ms) => {
      const el = document.getElementById('demo-fade')
      if (el) {
        el.style.transitionDuration = ms + 'ms'
        el.classList.add('visible')
      }
    }, duration)
    await this.page.waitForTimeout(duration + 50)
  }

  /** Fade in from black */
  async fadeIn(duration = 400) {
    await this.reinjectIfNeeded()
    await this.page.evaluate((ms) => {
      const el = document.getElementById('demo-fade')
      if (el) {
        el.style.transitionDuration = ms + 'ms'
        el.classList.remove('visible')
      }
    }, duration)
    await this.page.waitForTimeout(duration + 50)
  }

  /**
   * Scene transition: fade out, navigate, fade in.
   * Clean cut between sections of a video.
   */
  async sceneCut(url, opts = {}) {
    await this.fadeOut(300)
    await this.navigate(url, { waitAfter: 500 })
    await this.fadeIn(300)
    await this.page.waitForTimeout(opts.waitAfter || 800)
  }

  /**
   * Set progress bar position (0-100).
   * Shows viewers how far through the video they are.
   */
  async progress(percent) {
    await this.reinjectIfNeeded()
    await this.page.evaluate((pct) => {
      const el = document.getElementById('demo-progress')
      if (el) el.style.width = pct + '%'
    }, Math.min(100, Math.max(0, percent)))
  }

  // ── Internal helpers ──────────────────────────────────────────

  async reinjectIfNeeded() {
    const exists = await this.page.evaluate(() => !!document.getElementById('demo-cursor')).catch(() => false)
    if (!exists) await this.reinject()
  }

  async showClickEffect() {
    await this.page.evaluate(({ x, y }) => {
      const c = document.getElementById('demo-cursor')
      const ring = document.getElementById('demo-click-ring')
      if (c) c.classList.add('clicking')
      if (ring) {
        ring.style.left = (x - 15) + 'px'
        ring.style.top = (y - 15) + 'px'
        ring.classList.remove('fade')
        ring.classList.add('pulse')
      }
    }, { x: this.cursorX, y: this.cursorY })

    await this.page.waitForTimeout(150)

    await this.page.evaluate(() => {
      const c = document.getElementById('demo-cursor')
      const ring = document.getElementById('demo-click-ring')
      if (c) c.classList.remove('clicking')
      if (ring) {
        ring.classList.remove('pulse')
        ring.classList.add('fade')
      }
    })

    await this.page.waitForTimeout(100)
  }
}

// ── Scenario registry ───────────────────────────────────────────────

import { SCENARIOS } from './demo-scenarios/index.mjs'

// ── Main ────────────────────────────────────────────────────────────

async function recordVideo(scenarioId, format = 'youtube') {
  const scenario = SCENARIOS[scenarioId]
  if (!scenario) {
    console.error(`\n  Unknown scenario: "${scenarioId}"`)
    console.error(`  Run with --list to see available scenarios.\n`)
    process.exit(1)
  }

  const fmt = FORMATS[format] || FORMATS.youtube
  console.log(`\n  Recording: ${scenario.title}`)
  console.log(`  Format: ${fmt.label} (${fmt.width}x${fmt.height})`)
  console.log(`  Output: docs/demo-videos/${scenarioId}.webm\n`)

  const browser = await chromium.launch({
    headless: false, // Must be headed for video to look right
  })

  const contextOpts = {
    viewport: { width: fmt.width, height: fmt.height },
    recordVideo: {
      dir: path.resolve('docs/demo-videos/_tmp'),
      size: { width: fmt.width, height: fmt.height },
    },
  }

  // Add auth if scenario needs it
  if (scenario.auth) {
    const authFile = scenario.auth === 'chef' ? '.auth/demo.json'
      : scenario.auth === 'client' ? '.auth/client.json'
      : scenario.auth === 'partner' ? '.auth/partner.json'
      : scenario.auth === 'staff' ? '.auth/staff.json'
      : null
    if (authFile && existsSync(authFile)) {
      contextOpts.storageState = authFile
    } else if (authFile) {
      console.warn(`  WARN: Auth file ${authFile} not found, recording without auth`)
    }
  }

  const context = await browser.newContext(contextOpts)
  const page = await context.newPage()
  const recorder = new DemoRecorder(page, format)

  try {
    await scenario.run(recorder, page)
    console.log(`  Scenario complete. Saving video...`)
  } catch (err) {
    console.error(`  ERROR during recording: ${err.message}`)
  }

  // Close page to finalize video
  await page.close()
  await context.close()
  await browser.close()

  // Rename the video file from Playwright's random name to our scenario ID
  const tmpDir = path.resolve('docs/demo-videos/_tmp')
  if (existsSync(tmpDir)) {
    const { readdirSync, statSync } = await import('fs')
    const files = readdirSync(tmpDir).filter(f => f.endsWith('.webm'))
    if (files.length > 0) {
      // Take the most recent file
      const newest = files
        .map(f => ({ name: f, time: statSync(path.join(tmpDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time)[0]

      if (newest) {
        const src = path.join(tmpDir, newest.name)
        const dest = path.join(VIDEO_DIR, `${scenarioId}.webm`)
        renameSync(src, dest)
        console.log(`\n  Saved: docs/demo-videos/${scenarioId}.webm`)

        // Try to convert to mp4 with ffmpeg if available
        try {
          const mp4 = path.join(VIDEO_DIR, `${scenarioId}.mp4`)
          execSync(`ffmpeg -y -i "${dest}" -c:v libx264 -preset fast -crf 22 "${mp4}" 2>/dev/null`)
          console.log(`  Converted: docs/demo-videos/${scenarioId}.mp4`)
        } catch {
          console.log(`  (Install ffmpeg to auto-convert to MP4)`)
        }
      }
    }
  }

  console.log(`  Done.\n`)
}

// ── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const formatIdx = args.indexOf('--format')
let format = 'youtube'
if (formatIdx !== -1 && args[formatIdx + 1]) {
  format = args[formatIdx + 1]
  args.splice(formatIdx, 2)
}

if (args.includes('--list')) {
  console.log('\n  Available scenarios:\n')
  for (const [id, s] of Object.entries(SCENARIOS)) {
    const authTag = s.auth ? ` [${s.auth}]` : ' [public]'
    console.log(`    ${id.padEnd(28)} ${s.title}${authTag}`)
  }
  console.log(`\n  Total: ${Object.keys(SCENARIOS).length} scenarios`)
  console.log(`  Usage: node scripts/demo-video.mjs <id> [--format youtube|tiktok|square]\n`)
  process.exit(0)
}

if (args.includes('--top10')) {
  const top10 = [
    'chef-full-lifecycle', 'pub-landing', 'client-proposal',
    'chef-command-center', 'chef-close-out', 'chef-know-client',
    'chef-dop', 'guest-rsvp', 'chef-food-cost', 'hub-create',
  ]
  console.log(`\n  Recording top 10 videos (format: ${format})...\n`)
  for (const id of top10) {
    if (SCENARIOS[id]) {
      await recordVideo(id, format)
    } else {
      console.log(`  Skipping ${id} (no scenario script yet)`)
    }
  }
  process.exit(0)
}

if (args.length === 0 || args[0].startsWith('-')) {
  console.log(`
  ChefFlow Demo Video Recorder

  Usage:
    node scripts/demo-video.mjs <scenario-id>              Record one video
    node scripts/demo-video.mjs <id> --format tiktok        Record in TikTok format
    node scripts/demo-video.mjs --list                      List all scenarios
    node scripts/demo-video.mjs --top10                     Record top 10 priority videos

  Formats: youtube (1920x1080), tiktok (1080x1920), square (1080x1080)
  `)
  process.exit(0)
}

await recordVideo(args[0], format)
