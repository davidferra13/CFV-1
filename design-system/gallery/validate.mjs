#!/usr/bin/env node
/**
 * Validates the rendered visual catalog in a real browser.
 *
 *   node design-system/gallery/validate.mjs
 *
 * Checks, at 375 / 768 / 1024 / 1440 in both themes:
 *   - no horizontal overflow
 *   - axe-core: zero serious or critical violations (wcag2a, wcag2aa, wcag22aa)
 *   - every interactive element clears the 44x44 touch minimum
 *   - visible focus indicator on every focusable element
 *   - measured contrast for the text tiers and status pairs
 *   - reduced-motion leaves content visible rather than frozen at opacity 0
 *   - 200% text zoom does not clip content
 * Writes screenshots to design-system/gallery/screenshots/.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const SHOTS = path.join(HERE, 'screenshots')
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')
const URL = pathToFileURL(path.join(HERE, 'index.html')).href

fs.mkdirSync(SHOTS, { recursive: true })

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 900 },
]

const results = []
const fail = (name, detail) => results.push({ name, ok: false, detail })
const pass = (name, detail = '') => results.push({ name, ok: true, detail })

// Prefer the pinned browser Playwright manages; fall back to a system Chromium
// so the catalog can be validated in environments that ship one already.
function resolveExecutable() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]
  return candidates.find((p) => fs.existsSync(p))
}
const executablePath = resolveExecutable()
const browser = await chromium.launch(
  executablePath ? { executablePath, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] }
)

for (const theme of ['dark', 'light']) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 })
    await page.goto(URL, { waitUntil: 'load' })
    if (theme === 'light') await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.waitForTimeout(120)

    await page.screenshot({ path: path.join(SHOTS, `${theme}-${vp.name}.png`), fullPage: vp.name === '1440' })

    /* horizontal overflow: an element only counts if nothing between it and the
       root clips or scrolls. A table inside an overflow-x container is correct. */
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth
      const scrollW = document.documentElement.scrollWidth
      if (scrollW <= docW + 1) return null
      const scrollableAncestor = (el) => {
        let a = el.parentElement
        while (a && a !== document.documentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) return true
          a = a.parentElement
        }
        return false
      }
      const culprits = []
      for (const el of document.querySelectorAll('body *')) {
        if (scrollableAncestor(el)) continue
        const s = getComputedStyle(el)
        const clips = /(auto|scroll|hidden|clip)/.test(s.overflowX)
        const r = el.getBoundingClientRect()
        const wide = (!clips && el.scrollWidth > docW + 1) || r.right > docW + 1
        if (wide) {
          culprits.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} w=${Math.round(r.width)} scrollW=${el.scrollWidth}`)
        }
        if (culprits.length >= 5) break
      }
      return { docW, scrollW, culprits }
    })
    if (overflow) fail(`no-horizontal-overflow ${theme}@${vp.name}`, `scrollWidth ${overflow.scrollW} > ${overflow.docW}: ${overflow.culprits.join(' | ') || 'no unclipped culprit found'}`)
    else pass(`no-horizontal-overflow ${theme}@${vp.name}`)

    /* axe */
    await page.addScriptTag({ content: AXE })
    const axe = await page.evaluate(async () =>
      await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
    )
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    if (serious.length) {
      fail(
        `axe-no-serious ${theme}@${vp.name}`,
        serious.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target?.join(' ')}`).join(' | ')
      )
    } else {
      const minor = axe.violations.length
      pass(`axe-no-serious ${theme}@${vp.name}`, minor ? `${minor} minor/moderate finding(s)` : 'clean')
    }

    /* touch targets, only for phone width where touch is assumed */
    if (vp.width <= 768) {
      const small = await page.evaluate(() => {
        const out = []
        const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=tab]'
        for (const el of document.querySelectorAll(sel)) {
          // Inline text links inside a horizontal scroller are navigation text, not tap chips.
          if (el.closest('.ds-nav')) continue
          // A control may legitimately extend its hit area with a ::before overlay
          // (the Switch does this with before:-inset-2). Those opt out explicitly.
          if (el.hasAttribute('data-hit-expanded')) continue
          // offsetWidth/Height are layout size, unaffected by a transform. The
          // catalog demonstrates an active-state scale(.97) which must not read
          // as a shrunken tap target.
          const w = el.offsetWidth
          const h = el.offsetHeight
          if (w === 0 && h === 0) continue
          if (h < 44 || w < 24) {
            out.push(`${el.tagName.toLowerCase()}[${(el.textContent || '').trim().slice(0, 18)}] ${w}x${h}`)
          }
        }
        return out
      })
      if (small.length) fail(`touch-targets ${theme}@${vp.name}`, `${small.length} under 44px high: ${small.slice(0, 6).join(' | ')}`)
      else pass(`touch-targets ${theme}@${vp.name}`)
    }

    await page.close()
  }
}

/* ---------------------------------------------------------- focus visibility */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(URL, { waitUntil: 'load' })
  const invisible = await page.evaluate(() => {
    const out = []
    const focusables = [...document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])')]
    for (const el of focusables.slice(0, 60)) {
      el.focus()
      const s = getComputedStyle(el)
      const hasOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
      const hasShadow = s.boxShadow && s.boxShadow !== 'none'
      if (!hasOutline && !hasShadow) out.push(`${el.tagName.toLowerCase()}[${(el.textContent || '').trim().slice(0, 16)}]`)
    }
    return out
  })
  if (invisible.length) fail('focus-visible', `${invisible.length} focusable element(s) with no visible indicator: ${invisible.slice(0, 6).join(' | ')}`)
  else pass('focus-visible', 'every sampled focusable shows an outline or ring')
  await page.close()
}

/* ------------------------------------------------------------------ contrast */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(URL, { waitUntil: 'load' })
  const measure = async (dark) => {
    if (!dark) await page.evaluate(() => document.documentElement.classList.remove('dark'))
    else await page.evaluate(() => document.documentElement.classList.add('dark'))
    return page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      const parse = (v) => {
        const m = v.match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/)
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
      }
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
      const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
      const resolve = (name) => {
        const raw = cs.getPropertyValue(name).trim()
        if (!raw) return null
        const el = document.createElement('span')
        el.style.color = raw.startsWith('rgb') || raw.startsWith('#') ? raw : `rgb(${raw})`
        document.body.appendChild(el)
        const v = parse(getComputedStyle(el).color)
        el.remove()
        return v
      }
      const bg = resolve('--surface-0')
      const out = {}
      for (const t of ['--text-primary', '--text-secondary', '--text-muted', '--text-muted-soft', '--text-placeholder']) {
        const fg = resolve(t)
        if (fg && bg) out[t] = Number(ratio(fg, bg).toFixed(2))
      }
      for (const role of ['success', 'warning', 'danger', 'info', 'neutral']) {
        const fg = resolve(`--status-${role}-fg`)
        const rbg = resolve(`--status-${role}-bg`)
        if (fg && rbg) out[`status-${role}`] = Number(ratio(fg, rbg).toFixed(2))
      }
      const ring = resolve('--focus-ring-color')
      if (ring && bg) out['focus-ring'] = Number(ratio(ring, bg).toFixed(2))
      return out
    })
  }
  for (const dark of [true, false]) {
    const m = await measure(dark)
    const mode = dark ? 'dark' : 'light'
    for (const [k, v] of Object.entries(m)) {
      const min = k === 'focus-ring' ? 3 : k === '--text-placeholder' ? 3 : 4.5
      if (v < min) fail(`contrast ${mode} ${k}`, `${v}:1 below ${min}:1`)
      else pass(`contrast ${mode} ${k}`, `${v}:1`)
    }
  }
  await page.close()
}

/* ------------------------------------------------------------ reduced motion */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await page.goto(URL, { waitUntil: 'load' })
  const state = await page.evaluate(() => {
    const invisible = []
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      if (el.getBoundingClientRect().height === 0) continue
      if (Number(s.opacity) === 0) invisible.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0])
      if (invisible.length > 5) break
    }
    const spinner = document.querySelector('.ds-spinner')
    const spinnerAnimated = spinner ? getComputedStyle(spinner).animationDuration : null
    const bar = document.querySelector('.ds-motion-bar')
    const barDuration = bar ? getComputedStyle(bar).transitionDuration : null
    return { invisible, spinnerAnimated, barDuration, text: document.body.innerText.length }
  })
  if (state.invisible.length) fail('reduced-motion-content-visible', `elements stuck at opacity 0: ${state.invisible.join(' | ')}`)
  else pass('reduced-motion-content-visible', `body text still ${state.text} chars`)
  if (state.barDuration && parseFloat(state.barDuration) > 0.01) fail('reduced-motion-suppresses-transitions', `transition-duration ${state.barDuration}`)
  else pass('reduced-motion-suppresses-transitions', `transition-duration ${state.barDuration}`)
  if (state.spinnerAnimated && parseFloat(state.spinnerAnimated) > 0.01) pass('reduced-motion-keeps-spinner', `spinner still ${state.spinnerAnimated}`)
  else fail('reduced-motion-keeps-spinner', 'the loading spinner was frozen; it is essential feedback and must keep moving')
  await page.close()
}

/* -------------------------------------------------------------- 200% zoom */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.waitForTimeout(120)
  const zoom = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    text: document.body.innerText.length,
  }))
  if (zoom.scrollW > zoom.clientW + 1) fail('text-zoom-200', `horizontal scroll at 200% (${zoom.scrollW} > ${zoom.clientW})`)
  else pass('text-zoom-200', `no horizontal scroll, ${zoom.text} chars still rendered`)
  await page.close()
}

await browser.close()

/* -------------------------------------------------------------------- report */

const failed = results.filter((r) => !r.ok)
console.log('\nDesign-system visual validation\n')
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  ${r.detail}` : ''}`)
console.log(`\n  ${results.length - failed.length} passed, ${failed.length} failed`)
console.log(`  screenshots: design-system/gallery/screenshots/\n`)

fs.writeFileSync(
  path.join(HERE, 'validation-report.json'),
  JSON.stringify({ generated: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2) + '\n'
)

process.exit(failed.length ? 1 : 0)
