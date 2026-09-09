#!/usr/bin/env node
/**
 * Builds the rendered visual catalog at design-system/gallery/index.html.
 *
 * The catalog is generated from design-system/tokens/tokens.json and the exact
 * class strings recorded in design-system/registry/components.json, then styled
 * with the product's REAL compiled CSS: this script runs the project's own
 * Tailwind config over app/globals.css. So what you see is what ships, not an
 * approximation drawn by hand.
 *
 *   node design-system/gallery/build-gallery.mjs          build html + css
 *   node design-system/gallery/build-gallery.mjs --html   html only (no tailwind run)
 *
 * Open design-system/gallery/index.html in a browser. Toggle light/dark and the
 * viewport frames at the top. There is also a live version at /design-system
 * inside the app, which renders the actual React components.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'design-system/tokens/tokens.json'), 'utf8'))
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'design-system/registry/components.json'), 'utf8'))

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ------------------------------------------------------------- swatch helpers */

function swatch(name, cssValue, note = '') {
  return `<figure class="ds-swatch">
    <div class="ds-swatch-chip" style="background:${cssValue}"></div>
    <figcaption><code>${esc(name)}</code>${note ? `<span>${esc(note)}</span>` : ''}</figcaption>
  </figure>`
}

// Any table wider than a phone lives in a keyboard-reachable scroll region.
// This is the same rule the spec puts on product tables.
function tableWrap(inner) {
  return `<div class="ds-table-wrap" tabindex="0" role="region" aria-label="Reference table">${inner}</div>`
}

function section(id, title, blurb, body) {
  return `<section id="${id}" class="ds-section">
    <h2 class="ds-h2">${esc(title)}</h2>
    ${blurb ? `<p class="ds-blurb">${blurb}</p>` : ''}
    ${body}
  </section>`
}

function subsection(title, body, note = '') {
  return `<div class="ds-sub"><h3 class="ds-h3">${esc(title)}</h3>${note ? `<p class="ds-note">${note}</p>` : ''}<div class="ds-sub-body">${body}</div></div>`
}

/* --------------------------------------------------------------- token panels */

const brandRamp = Object.entries(tokens.brand.scale)
  .map(([stop]) => swatch(`brand-${stop}`, `rgb(var(--brand-${stop}))`))
  .join('')

const neutralRamp = Object.keys(tokens.neutral.dark)
  .map((stop) => swatch(`stone-${stop}`, `rgb(var(--stone-${stop}))`))
  .join('')

const surfaces = [0, 1, 2, 3, 4].map((n) => swatch(`--surface-${n}`, `var(--surface-${n})`, tokens.semantic.surface.roles[`surface-${n}`].use)).join('')

const textTiers = Object.entries(tokens.semantic.text)
  .map(([k, v]) => `<div class="ds-text-row"><span style="color:var(--${k})">The quick brown fox jumps</span><code>--${k}</code><span class="ds-note">${esc(v.use)}</span></div>`)
  .join('')

const borders = Object.entries(tokens.semantic.border)
  .map(([k, v]) => `<div class="ds-border-row"><div class="ds-border-box" style="border-color:var(--${k})"></div><code>--${k}</code><span class="ds-note">${esc(v.use)}</span></div>`)
  .join('')

const statusRoles = ['success', 'warning', 'danger', 'info', 'neutral']
const statusGrid = statusRoles
  .map(
    (r) => `<div class="ds-status-cell">
      <div class="ds-status-chip status-${r}">${r}</div>
      <div class="ds-status-dot"><span style="background:var(--status-${r}-solid)"></span> dot</div>
      <div class="ds-status-row" style="border-left:3px solid var(--status-${r}-solid)">row accent</div>
      <code>--status-${r}-*</code>
    </div>`
  )
  .join('')

const elevation = Object.entries(tokens.elevation.scale)
  .map(([k, v]) => `<div class="ds-elev" style="box-shadow:var(--elevation-${k})"><code>${k}</code><span class="ds-note">${esc(v.use)}</span></div>`)
  .join('')

const radii = Object.entries(tokens.radius.semantic)
  .map(([k, v]) => `<div class="ds-radius"><div class="ds-radius-box" style="border-radius:${v}"></div><code>rounded-${k}</code><span class="ds-note">${v}</span></div>`)
  .join('')

const layers = Object.entries(tokens.layer.scale)
  .map(([k, v]) => `<tr><td><code>z-${k}</code></td><td>${v}</td><td class="ds-note">${esc(layerUse(k))}</td></tr>`)
  .join('')

function layerUse(k) {
  const map = {
    below: 'behind the flow',
    base: 'default',
    raised: 'in-card raised elements',
    sticky: 'sticky headers inside a scroll region',
    chrome: 'app chrome, skip link',
    nav: 'sidebar, mobile nav',
    overlay: 'dialog scrim',
    dialog: 'dialog and drawer panels',
    float: 'menus, selects, popovers (deliberately above dialog)',
    toast: 'toasts',
    tooltip: 'the tooltip singleton',
    max: 'last resort, justify it',
  }
  return map[k] ?? ''
}

const durations = Object.entries(tokens.motion.duration)
  .map(([k, v]) => `<div class="ds-motion"><div class="ds-motion-bar" style="transition-duration:${v}"></div><code>duration-${k}</code><span class="ds-note">${v}</span></div>`)
  .join('')

const spacing = Object.entries(tokens.space.semantic)
  .map(([k, v]) => `<div class="ds-space-row"><span class="ds-space-bar" style="width:${v}"></span><code>--space-${k}</code><span class="ds-note">${v}</span></div>`)
  .join('')

/* ------------------------------------------------------------------ typography */

const typeRoles = Object.entries(tokens.typography.roles)
  .map(([role, spec]) => {
    const fam = spec.family === 'display' ? 'font-display' : spec.family === 'mono' ? 'font-mono' : 'font-sans'
    const style = [
      spec.size && spec.size.startsWith('clamp') ? `font-size:${spec.size}` : '',
      spec.weight ? `font-weight:${spec.weight}` : '',
      spec.tracking ? `letter-spacing:${spec.tracking}` : '',
      spec.lineHeight ? `line-height:${spec.lineHeight}` : '',
      spec.transform ? `text-transform:${spec.transform}` : '',
      spec.style ? `font-style:${spec.style}` : '',
      spec.numeric ? `font-variant-numeric:${spec.numeric}` : '',
      spec.color ? `color:var(--${spec.color})` : '',
    ]
      .filter(Boolean)
      .join(';')
    const sizeClass = spec.size && !spec.size.startsWith('clamp') ? spec.size.split(' ')[0].replace(/^/, 'text-') : ''
    const sample = role === 'metric' || role === 'metric-sm' ? '128 covers' : role === 'code' ? 'evt_01J9K2M4' : 'Ops for Artists'
    return `<div class="ds-type-row">
      <div class="${fam} ${sizeClass}" style="${style}">${sample}</div>
      <div class="ds-type-meta"><code>${role}</code><span class="ds-note">${fam} ${esc(spec.size ?? '')} ${spec.weight ?? ''} ${esc(spec.element ?? '')}</span></div>
    </div>`
  })
  .join('')

/* ------------------------------------------------------------------ components */

const BTN_BASE =
  'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 touch-manipulation'
const BTN_VARIANT = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-500 shadow-sm',
  secondary: 'bg-[var(--surface-2)] text-stone-100 border border-stone-600/80 hover:bg-[var(--surface-3)] focus-visible:ring-stone-400 shadow-sm',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-500 shadow-sm',
  ghost: 'bg-transparent text-stone-300 hover:bg-[var(--surface-2)] focus-visible:ring-stone-400',
}
const BTN_SIZE = {
  sm: 'min-h-touch px-3.5 text-sm rounded-lg gap-1.5',
  md: 'min-h-touch px-5 py-2.5 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 py-3 text-base rounded-lg gap-2',
}

const buttonMatrix = Object.keys(BTN_VARIANT)
  .map(
    (v) => `<div class="ds-matrix-row"><code class="ds-matrix-label">${v}</code>${Object.keys(BTN_SIZE)
      .map((s) => `<button class="${BTN_BASE} ${BTN_VARIANT[v]} ${BTN_SIZE[s]}">${v} ${s}</button>`)
      .join('')}</div>`
  )
  .join('')

const buttonStates = `
<div class="ds-matrix-row"><code class="ds-matrix-label">default</code><button class="${BTN_BASE} ${BTN_VARIANT.primary} ${BTN_SIZE.md}">Save</button></div>
<div class="ds-matrix-row"><code class="ds-matrix-label">hover</code><button class="${BTN_BASE} bg-brand-800 text-white shadow-md ${BTN_SIZE.md}">Save</button></div>
<div class="ds-matrix-row"><code class="ds-matrix-label">active</code><button class="${BTN_BASE} bg-brand-900 text-white ${BTN_SIZE.md}" style="transform:scale(.97)">Save</button></div>
<div class="ds-matrix-row"><code class="ds-matrix-label">focus-visible</code><button class="${BTN_BASE} ${BTN_VARIANT.primary} ${BTN_SIZE.md}" style="outline:3px solid var(--focus-ring-color);outline-offset:2px">Save</button></div>
<div class="ds-matrix-row"><code class="ds-matrix-label">disabled</code><button class="${BTN_BASE} ${BTN_VARIANT.primary} ${BTN_SIZE.md} opacity-50 pointer-events-none" disabled>Save</button></div>
<div class="ds-matrix-row"><code class="ds-matrix-label">loading</code><button disabled aria-busy="true" class="${BTN_BASE} ${BTN_VARIANT.primary} ${BTN_SIZE.md} opacity-50 pointer-events-none"><span class="ds-spinner motion-essential"></span>Saving</button></div>`

const BADGE_BASE = 'inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ring-1 ring-inset'
const badges = [
  ['default', 'bg-stone-800 text-stone-100 ring-stone-600'],
  ['info', 'bg-brand-950/70 text-brand-100 ring-brand-800'],
  ['success', 'bg-emerald-950/70 text-emerald-100 ring-emerald-800'],
  ['warning', 'bg-amber-950/70 text-amber-100 ring-amber-800'],
  ['error', 'bg-red-950/70 text-red-100 ring-red-800'],
]
  .map(([n, c]) => `<span class="${BADGE_BASE} ${c}">${n}</span>`)
  .join('')

// The real class strings from components/ui/alert.tsx, light and dark.
const alerts = [
  ['info', 'bg-brand-100 border-brand-200 text-brand-900 border-l-brand-600 dark:bg-brand-950/60 dark:border-brand-800/60 dark:text-brand-100 dark:border-l-brand-500'],
  ['success', 'bg-emerald-100 border-emerald-200 text-emerald-900 border-l-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800/60 dark:text-emerald-100 dark:border-l-emerald-500'],
  ['warning', 'bg-amber-100 border-amber-200 text-amber-900 border-l-amber-600 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-100 dark:border-l-amber-500'],
  ['error', 'bg-red-100 border-red-200 text-red-900 border-l-red-600 dark:bg-red-950/60 dark:border-red-800/60 dark:text-red-100 dark:border-l-red-500'],
]
  .map(
    ([n, c]) =>
      `<div role="${n === 'error' || n === 'warning' ? 'alert' : 'status'}" class="rounded-lg border border-l-[3px] p-4 ${c}"><strong>${n}</strong><div class="text-sm mt-1">Every alert now announces. error and warning are assertive; info and success are polite.</div></div>`
  )
  .join('')

const CARD = {
  default: 'bg-[var(--surface-2)] border-stone-700/40 shadow-card',
  elevated: 'bg-[var(--surface-3)] border-stone-600/50 shadow-card-hover',
  glass: 'bg-[var(--glass-bg)] border-stone-600/30 shadow-card backdrop-blur-xl',
  highlight: 'bg-[var(--surface-2)] border-brand-600/30 shadow-card',
}
const cards = Object.entries(CARD)
  .map(
    ([n, c]) => `<div class="rounded-card border ${c}">
      <div class="px-6 py-4 border-b border-stone-800"><h4 class="text-lg font-semibold text-stone-50">${n}</h4><p class="text-sm text-stone-300">Card variant</p></div>
      <div class="px-6 py-4 text-sm text-stone-300">Cards group 3 to 8 related things. Never one card per toggle.</div>
      <div class="px-6 py-4 border-t border-stone-800 bg-stone-800/40" style="border-bottom-left-radius:12px;border-bottom-right-radius:12px"><button class="${BTN_BASE} ${BTN_VARIANT.ghost} ${BTN_SIZE.sm}">Action</button></div>
    </div>`
  )
  .join('')

// min-h-touch is deliberate: a form field is a tap target like any other control.
const FIELD = 'block w-full min-h-touch rounded-field border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400'
const fields = `
<label class="ds-field"><span class="text-xs font-medium text-stone-300">Default</span><input class="${FIELD}" placeholder="hello@example.com" /></label>
<label class="ds-field"><span class="text-xs font-medium text-stone-300">Focus</span><input class="${FIELD}" placeholder="focused" style="border-color:rgb(var(--brand-500));box-shadow:0 0 0 2px rgb(var(--brand-500)/.2)" /></label>
<label class="ds-field"><span class="text-xs font-medium text-stone-300">Error</span><input class="${FIELD} border-red-400" aria-invalid="true" placeholder="not an email" /><span role="alert" class="text-xs text-red-600 dark:text-red-400">Enter a valid email address.</span></label>
<label class="ds-field"><span class="text-xs font-medium text-stone-300">Disabled</span><input class="${FIELD} bg-stone-800 text-stone-500 cursor-not-allowed" disabled placeholder="disabled" /></label>
<label class="ds-field"><span class="text-xs font-medium text-stone-300">Textarea with counter</span><textarea class="${FIELD}" rows="3" placeholder="Notes"></textarea><span class="text-xs" style="color:var(--text-placeholder)">0 / 280</span></label>
<div class="ds-field"><span class="text-xs font-medium text-stone-300">Switch</span>
  <div class="flex items-center gap-4">
    <button role="switch" aria-checked="true" aria-label="Notifications on" data-hit-expanded="true" class="relative inline-flex h-7 w-12 items-center rounded-full border-2 border-transparent bg-brand-600"><span class="block h-5 w-5 rounded-full bg-stone-900 shadow-lg" style="transform:translateX(1.25rem)"></span></button>
    <button role="switch" aria-checked="false" aria-label="Notifications off" data-hit-expanded="true" class="relative inline-flex h-7 w-12 items-center rounded-full border-2 border-transparent bg-stone-700"><span class="block h-5 w-5 rounded-full bg-stone-900 shadow-lg" style="transform:translateX(.125rem)"></span></button>
    <button role="switch" aria-checked="false" aria-disabled="true" aria-label="Notifications, unavailable" data-hit-expanded="true" disabled class="relative inline-flex h-7 w-12 items-center rounded-full border-2 border-transparent bg-stone-700 opacity-50 cursor-not-allowed"><span class="block h-5 w-5 rounded-full bg-stone-900 shadow-lg" style="transform:translateX(.125rem)"></span></button>
    <span class="ds-note">on / off / disabled</span>
  </div>
</div>`

const table = `<div class="overflow-x-auto rounded-card border border-stone-700/40" tabindex="0" role="region" aria-label="Upcoming events">
<table class="min-w-full divide-y divide-stone-700 text-left">
  <thead class="bg-stone-800/60"><tr>
    <th class="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Client</th>
    <th class="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Date</th>
    <th class="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Status</th>
    <th class="px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Total</th>
  </tr></thead>
  <tbody class="bg-stone-900 divide-y divide-stone-800">
    <tr class="hover:bg-stone-800/50"><td class="px-6 py-4 text-sm text-stone-300">Harbour House</td><td class="px-6 py-4 text-sm text-stone-300">12 Sep</td><td class="px-6 py-4"><span class="${BADGE_BASE} bg-emerald-950/70 text-emerald-100 ring-emerald-800">confirmed</span></td><td class="px-6 py-4 text-sm text-stone-300 text-right font-mono">1,290.00</td></tr>
    <tr class="hover:bg-stone-800/50"><td class="px-6 py-4 text-sm text-stone-300">Elm Street</td><td class="px-6 py-4 text-sm text-stone-300">19 Sep</td><td class="px-6 py-4"><span class="${BADGE_BASE} bg-amber-950/70 text-amber-100 ring-amber-800">awaiting client</span></td><td class="px-6 py-4 text-sm text-stone-300 text-right font-mono">860.00</td></tr>
    <tr class="hover:bg-stone-800/50"><td class="px-6 py-4 text-sm text-stone-300">Ridgeway</td><td class="px-6 py-4 text-sm text-stone-300">02 Oct</td><td class="px-6 py-4"><span class="${BADGE_BASE} bg-red-950/70 text-red-100 ring-red-800">expired</span></td><td class="px-6 py-4 text-sm text-stone-300 text-right font-mono">0.00</td></tr>
  </tbody>
</table></div>`

const feedbackStates = `
<div class="ds-state-grid">
  <div class="rounded-card border border-stone-700/40 bg-[var(--surface-2)] p-6">
    <div class="text-xs uppercase tracking-wider text-stone-400 mb-4">loading</div>
    <div class="skeleton h-4 w-2/3 mb-2"></div><div class="skeleton h-4 w-1/2 mb-2"></div><div class="skeleton h-4 w-5/6"></div>
  </div>
  <div class="rounded-card border border-stone-700/40 bg-[var(--surface-2)] p-6 text-center">
    <div class="text-xs uppercase tracking-wider text-stone-400 mb-4">empty</div>
    <h4 class="text-lg font-semibold text-stone-100 mb-2 tracking-tight">No events yet</h4>
    <p class="text-sm text-stone-400 mb-6">An empty state names the next action, it does not just say there is nothing here.</p>
    <button class="${BTN_BASE} ${BTN_VARIANT.primary} ${BTN_SIZE.sm}">Create an event</button>
  </div>
  <div class="rounded-card border border-stone-700/40 bg-[var(--surface-2)] p-6 text-center" role="alert">
    <div class="text-xs uppercase tracking-wider text-stone-400 mb-4">error</div>
    <div class="mx-auto mb-3 inline-flex rounded-full bg-red-500/10 p-2"><span style="width:24px;height:24px;display:block;border-radius:9999px;background:var(--status-danger-solid)"></span></div>
    <h4 class="text-base font-semibold text-stone-100 mb-1">Could not load events</h4>
    <p class="text-sm text-stone-400 mb-4">Never render a failed load as an empty list.</p>
    <button class="${BTN_BASE} ${BTN_VARIANT.secondary} ${BTN_SIZE.sm}">Try again</button>
  </div>
  <div class="rounded-card border border-stone-700/40 bg-[var(--surface-2)] p-6">
    <div class="text-xs uppercase tracking-wider text-stone-400 mb-4">partial</div>
    <p class="text-sm text-stone-300 mb-3">3 of 5 sections loaded.</p>
    <div class="h-2 w-full rounded-pill bg-stone-700 overflow-hidden"><div class="h-full rounded-pill motion-essential" style="width:60%;background:var(--status-info-solid)"></div></div>
  </div>
</div>`

const overlay = `<div class="ds-overlay-demo">
  <div class="ds-scrim"></div>
  <div class="ds-dialog" role="dialog" aria-modal="true" aria-label="Delete event">
    <h4 class="text-lg font-semibold text-stone-100">Delete this event?</h4>
    <p class="mt-2 text-sm text-stone-400">This cannot be undone. Destructive actions are never adjacent to confirm actions.</p>
    <div class="ds-dialog-footer">
      <button class="${BTN_BASE} ${BTN_VARIANT.ghost} ${BTN_SIZE.sm}">Cancel</button>
      <span style="flex:1"></span>
      <button class="${BTN_BASE} ${BTN_VARIANT.danger} ${BTN_SIZE.sm}">Delete</button>
    </div>
  </div>
</div>
<div class="ds-menu-demo">
  <div class="ds-menu">
    <div class="ds-menu-item">Duplicate</div>
    <div class="ds-menu-item ds-menu-item-hi">Export</div>
    <div class="ds-menu-sep"></div>
    <div class="ds-menu-item ds-menu-item-off">Archive</div>
  </div>
  <p class="ds-note">A menu sits at <code>z-float</code> (70), above <code>z-dialog</code> (60), so a menu opened inside a modal renders over it.</p>
</div>`

const mediaScrim = `<div class="ds-media">
  <div class="ds-media-img"></div>
  <div class="ds-media-scrim media-scrim"></div>
  <div class="ds-media-copy"><h4 class="font-display text-2xl">Text over photography</h4><p class="text-sm">Only <code>.media-scrim</code>. Never a flat colour wash, and never below 4.5:1.</p></div>
</div>`

const limits = Object.entries(tokens.limits)
  .filter(([, v]) => typeof v === 'number')
  .map(([k, v]) => `<tr><td>${esc(k.replace(/([A-Z])/g, ' $1').toLowerCase())}</td><td><strong>${v}</strong></td></tr>`)
  .join('')

const componentIndex = registry.components
  .map(
    (c) =>
      `<tr><td><code>${esc(c.name.split(',')[0])}</code></td><td class="ds-status-tag ds-status-${c.status}">${c.status}</td><td class="ds-note">${esc(c.path ?? 'not implemented')}</td></tr>`
  )
  .join('')

/* ------------------------------------------------------------------- assembly */

const nav = [
  ['colour', 'Colour'],
  ['typography', 'Typography'],
  ['space', 'Space and size'],
  ['radius-elevation', 'Radius and elevation'],
  ['layer', 'Layering'],
  ['motion', 'Motion'],
  ['actions', 'Actions'],
  ['status', 'Status'],
  ['surfaces', 'Surfaces'],
  ['forms', 'Forms'],
  ['data', 'Data'],
  ['states', 'Feedback states'],
  ['overlays', 'Overlays'],
  ['media', 'Media'],
  ['limits', 'Limits'],
  ['index', 'Component index'],
]
  .map(([id, label]) => `<a href="#${id}">${label}</a>`)
  .join('')

const body = [
  section(
    'colour',
    'Colour',
    'Every colour comes from a role. The brand ramp is swapped at runtime across eight palettes, which is why a hardcoded hex is a correctness bug and not a style preference.',
    subsection('Brand ramp', `<div class="ds-swatches">${brandRamp}</div>`, 'Stops 600 and 700 are deliberately identical: the light-mode focus ring resolves to brand-600 and measures 4.63:1 there.') +
      subsection('Neutral ramp', `<div class="ds-swatches">${neutralRamp}</div>`, 'Inverted in light mode on purpose, so dark-first utility usage renders correctly on a light ground. zinc, gray and neutral are aliases of this scale.') +
      subsection('Surfaces', `<div class="ds-swatches">${surfaces}</div>`) +
      subsection('Text tiers', `<div class="ds-text-tiers">${textTiers}</div>`) +
      subsection('Borders', `<div class="ds-borders">${borders}</div>`) +
      subsection('Status roles', `<div class="ds-status-grid">${statusGrid}</div>`, 'Meaning is global, silhouette is local. The same role must read the same whether it is a chip, a dot, a row accent or an icon.')
  ),
  section('typography', 'Typography', 'Two visible families and one functional monospace. Playfair Display carries the editorial voice; the interface family is a system stack with no webfont cost.', `<div class="ds-type">${typeRoles}</div>`),
  section('space', 'Space and size', 'A 4px grid, with a named 2px half-step for dense control padding. Touch targets are 44px minimum, always.', subsection('Semantic spacing', `<div class="ds-spaces">${spacing}</div>`) + subsection('Touch target', `<div class="ds-targets"><div class="ds-target-ok">44 x 44</div><div class="ds-target-bad">32 x 32</div><span class="ds-note">44px minimum on touch, 24px for mouse-only, 8px between adjacent targets.</span></div>`)),
  section('radius-elevation', 'Radius and elevation', 'Semantic radius aliases sit on top of Tailwind’s own numeric scale, so nothing that already shipped moved. Three elevation tiers, not five.', subsection('Radius', `<div class="ds-radii">${radii}</div>`) + subsection('Elevation', `<div class="ds-elevs">${elevation}</div>`)),
  section('layer', 'Layering', 'The complete stacking contract. Four of these class names were used in 122 files while being undefined, so every dialog and popover stacked by DOM order.', tableWrap(`<table class="ds-table"><thead><tr><th>class</th><th>z-index</th><th>use</th></tr></thead><tbody>${layers}</tbody></table>`)),
  section('motion', 'Motion', 'Motion explains hierarchy, state, causality or spatial movement. Nothing animates to look richer. Hover a bar to see its duration.', `<div class="ds-motions">${durations}</div><p class="ds-note">Under <code>prefers-reduced-motion</code> everything here collapses to 0.01ms and entrance animations resolve to their final state. Spinners, skeleton shimmer and progress fills are exempt, because they are the only feedback that work is happening.</p>`),
  section('actions', 'Actions', 'One primary button per screen. Every size clears the 44px touch minimum; sizes differ in padding and type, not height.', subsection('Variants and sizes', `<div class="ds-matrix">${buttonMatrix}</div>`) + subsection('States', `<div class="ds-matrix">${buttonStates}</div>`, 'White on brand-700 measures 4.74:1.')),
  section('status', 'Status', 'Badges and alerts. Colour is never the only carrier of meaning: the label does the work.', subsection('Badges', `<div class="ds-inline">${badges}</div>`) + subsection('Alerts', `<div class="ds-stack">${alerts}</div>`)),
  section('surfaces', 'Surfaces', 'Cards group 3 to 8 related things. Never one card per toggle, never cards for a list of ten similar items.', `<div class="ds-cards">${cards}</div>`),
  section('forms', 'Forms', 'Validate inline. An error message names what to do. Inputs never render below 16px, so iOS does not auto-zoom.', `<div class="ds-fields">${fields}</div>`),
  section('data', 'Data', 'Seven columns by default; anything more goes behind a column chooser. On a phone a table becomes a card list rather than a sideways scroll.', table),
  section('states', 'Feedback states', 'All five data states, every time: empty, loading, loaded, error, partial. Never render a failed load as an empty list.', feedbackStates),
  section('overlays', 'Overlays', 'Dialogs trap focus, close on Escape, restore focus, and carry the full ARIA. Destructive and confirm actions sit apart.', overlay),
  section('media', 'Media', 'Real photography, kept legible. Do not bury important media under an aggressive gradient.', mediaScrim),
  section('limits', 'Limits', 'Exceeding one of these is a design defect, not a preference.', tableWrap(`<table class="ds-table"><tbody>${limits}</tbody></table>`)),
  section('index', 'Component index', 'The full registry. Search it with <code>node design-system/registry/find.mjs &lt;query&gt;</code>.', tableWrap(`<table class="ds-table"><thead><tr><th>component</th><th>status</th><th>path</th></tr></thead><tbody>${componentIndex}</tbody></table>`)),
].join('\n')

const html = `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>ChefFlow Design System</title>
<link rel="stylesheet" href="./gallery.css" />
</head>
<body class="font-sans">
<header class="ds-header">
  <div class="ds-header-inner">
    <div>
      <h1 class="font-display ds-h1">ChefFlow Design System</h1>
      <p class="ds-blurb">Version ${tokens.meta.version}. Generated from <code>design-system/tokens/tokens.json</code> and rendered with the product's own compiled CSS, so this is what ships.</p>
    </div>
    <div class="ds-controls">
      <button id="ds-theme" class="ds-ctl" aria-pressed="true">Dark</button>
      <button class="ds-ctl ds-w" data-w="375">375</button>
      <button class="ds-ctl ds-w" data-w="768">768</button>
      <button class="ds-ctl ds-w" data-w="1024">1024</button>
      <button class="ds-ctl ds-w ds-ctl-on" data-w="0">Full</button>
      <button id="ds-motion" class="ds-ctl" aria-pressed="false">Reduce motion</button>
    </div>
  </div>
  <div class="ds-nav-wrap"><nav class="ds-nav" aria-label="Catalog sections">${nav}</nav></div>
</header>
<main id="ds-main" class="ds-main">
${body}
</main>
<footer class="ds-footer">
  <p>Rules: <code>design-system/SPEC.md</code>. Checklist: <code>design-system/BUILD-CHECKLIST.md</code>. Search: <code>node design-system/registry/find.mjs &lt;query&gt;</code>.</p>
</footer>
<script>
(function () {
  var root = document.documentElement
  var theme = document.getElementById('ds-theme')
  theme.addEventListener('click', function () {
    var dark = root.classList.toggle('dark')
    theme.textContent = dark ? 'Dark' : 'Light'
    theme.setAttribute('aria-pressed', String(dark))
  })
  var main = document.getElementById('ds-main')
  Array.prototype.forEach.call(document.querySelectorAll('.ds-w'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.ds-w'), function (x) { x.classList.remove('ds-ctl-on') })
      b.classList.add('ds-ctl-on')
      var w = b.getAttribute('data-w')
      main.style.maxWidth = w === '0' ? '' : w + 'px'
      main.style.margin = w === '0' ? '' : '0 auto'
      main.style.outline = w === '0' ? '' : '1px dashed var(--border-strong)'
    })
  })
  var motion = document.getElementById('ds-motion')
  motion.addEventListener('click', function () {
    var on = root.classList.toggle('ds-reduce')
    motion.setAttribute('aria-pressed', String(on))
    motion.textContent = on ? 'Motion reduced' : 'Reduce motion'
  })
})()
</script>
</body>
</html>
`

fs.writeFileSync(path.join(HERE, 'index.html'), html)
console.log('wrote  design-system/gallery/index.html')

/* --------------------------------------------------- gallery-only stylesheet */

const galleryCss = `/* Catalog chrome only. Every product value comes from the generated token block. */
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: var(--surface-0); color: var(--text-primary); margin: 0; overflow-x: clip; }
.ds-header { max-width: 100vw; }
.ds-header { position: sticky; top: 0; z-index: 40; background: var(--glass-heavy-bg); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border-subtle); }
.ds-header-inner { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; justify-content: space-between; padding: 1.5rem 1rem 1rem; max-width: 72rem; margin: 0 auto; }
.ds-h1 { font-size: clamp(1.5rem, 4vw, 2.25rem); line-height: 1.1; margin: 0; letter-spacing: -0.02em; }
.ds-h2 { font-family: var(--font-display); font-size: clamp(1.375rem, 3vw, 1.875rem); margin: 0 0 .5rem; letter-spacing: -0.01em; }
.ds-h3 { font-size: .8125rem; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin: 2rem 0 .75rem; font-weight: 700; }
.ds-blurb { color: var(--text-secondary); font-size: .9375rem; max-width: 60ch; margin: .5rem 0 0; }
.ds-note { color: var(--text-muted); font-size: .8125rem; }
.ds-controls { display: flex; gap: .5rem; flex-wrap: wrap; }
.ds-ctl { min-height: 44px; padding: 0 .875rem; border-radius: 8px; border: 1px solid var(--border-default); background: var(--surface-2); color: var(--text-primary); font-size: .8125rem; cursor: pointer; }
.ds-ctl:focus-visible { outline: 3px solid var(--focus-ring-color); outline-offset: 2px; }
.ds-ctl-on { background: rgb(var(--brand-700)); color: #fff; border-color: rgb(var(--brand-700)); }
.ds-nav-wrap { max-width: 72rem; margin: 0 auto; overflow-x: auto; }
.ds-nav { display: flex; gap: 1rem; padding: 0 1rem 1rem; width: max-content; }
.ds-header, .ds-header-inner, .ds-nav-wrap { max-width: 100%; }
.ds-nav a { color: var(--text-muted); font-size: .8125rem; white-space: nowrap; text-decoration: none; padding: .25rem 0; }
.ds-nav a:hover { color: var(--text-primary); text-decoration: underline; text-underline-offset: 3px; }
.ds-main { max-width: 72rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
.ds-section { padding: 2.5rem 0; border-top: 1px solid var(--border-subtle); }
.ds-section:first-child { border-top: 0; }
.ds-sub-body { }
.ds-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: .75rem; }
.ds-swatch { margin: 0; }
.ds-swatch-chip { height: 56px; border-radius: 8px; border: 1px solid var(--border-subtle); }
.ds-swatch figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: .375rem; font-size: .6875rem; color: var(--text-muted); }
.ds-text-tiers, .ds-borders, .ds-spaces { display: flex; flex-direction: column; gap: .625rem; }
.ds-text-row, .ds-border-row, .ds-space-row { display: flex; align-items: center; gap: .875rem; flex-wrap: wrap; font-size: .875rem; }
.ds-border-box { width: 56px; height: 28px; border: 2px solid; border-radius: 6px; }
.ds-space-bar { display: inline-block; height: 14px; background: rgb(var(--brand-500)); border-radius: 3px; }
.ds-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.ds-status-cell { display: flex; flex-direction: column; gap: .5rem; font-size: .75rem; color: var(--text-muted); }
.ds-status-chip { padding: .25rem .75rem; border-radius: 6px; border: 1px solid; font-weight: 500; text-align: center; }
.ds-status-dot { display: flex; align-items: center; gap: .5rem; }
.ds-status-dot span { width: 10px; height: 10px; border-radius: 9999px; display: inline-block; }
.ds-status-row { padding: .375rem .625rem; background: var(--surface-2); border-radius: 0 6px 6px 0; }
.ds-elevs, .ds-radii { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
.ds-elev { background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: .25rem; font-size: .75rem; }
.ds-radius { display: flex; flex-direction: column; gap: .375rem; font-size: .75rem; }
.ds-radius-box { height: 56px; background: var(--surface-3); border: 1px solid var(--border-default); }
.ds-motions { display: flex; flex-direction: column; gap: .625rem; }
.ds-motion { display: flex; align-items: center; gap: .875rem; font-size: .8125rem; }
.ds-motion-bar { width: 60px; height: 12px; border-radius: 3px; background: rgb(var(--brand-500)); transition-property: width; transition-timing-function: var(--ease-spring); }
.ds-motion:hover .ds-motion-bar { width: 220px; }
.ds-matrix { display: flex; flex-direction: column; gap: .75rem; }
.ds-matrix-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.ds-matrix-label { min-width: 106px; font-size: .75rem; color: var(--text-muted); }
.ds-inline { display: flex; gap: .625rem; flex-wrap: wrap; }
.ds-stack { display: flex; flex-direction: column; gap: .75rem; }
.ds-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
.ds-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.ds-field { display: flex; flex-direction: column; gap: .375rem; }
.ds-state-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
.ds-table-wrap { overflow-x: auto; }
.ds-table-wrap:focus-visible { outline: 3px solid var(--focus-ring-color); outline-offset: 2px; }
.ds-table { width: 100%; min-width: 34rem; border-collapse: collapse; font-size: .875rem; }
.ds-table th { text-align: left; font-size: .6875rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: .5rem .75rem; border-bottom: 1px solid var(--border-default); }
.ds-table td { padding: .5rem .75rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); }
.ds-status-tag { font-size: .6875rem; text-transform: uppercase; letter-spacing: .04em; }
.ds-status-canonical { color: var(--status-success-fg); }
.ds-status-canonical-gap { color: var(--status-warning-fg); }
.ds-status-duplicate, .ds-status-missing { color: var(--status-danger-fg); }
.ds-overlay-demo { position: relative; height: 260px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-subtle); background: var(--surface-1); }
.ds-scrim { position: absolute; inset: 0; background: var(--scrim); backdrop-filter: var(--scrim-blur); z-index: 50; }
.ds-dialog { position: absolute; z-index: 60; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(420px, calc(100% - 2rem)); background: var(--glass-heavy-bg); border: 1px solid var(--border-subtle); box-shadow: var(--elevation-overlay); border-radius: 12px; padding: 1.25rem; backdrop-filter: blur(20px) saturate(1.3); }
.ds-dialog-footer { display: flex; align-items: center; gap: 1rem; margin-top: 1.25rem; }
.ds-menu-demo { margin-top: 1rem; }
.ds-menu { width: 200px; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--glass-heavy-bg); box-shadow: var(--elevation-overlay); padding: .375rem; }
.ds-menu-item { padding: .5rem .75rem; border-radius: 8px; font-size: .875rem; color: var(--text-secondary); }
.ds-menu-item-hi { background: var(--surface-3); color: var(--text-primary); }
.ds-menu-item-off { color: var(--disabled-foreground); }
.ds-menu-sep { height: 1px; background: var(--border-subtle); margin: .375rem -.375rem; }
.ds-media { position: relative; height: 240px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-subtle); }
.ds-media-img { position: absolute; inset: 0; background: linear-gradient(120deg, rgb(var(--brand-700)), rgb(var(--brand-400)) 45%, rgb(var(--brand-900))); }
.ds-media-scrim { position: absolute; inset: 0; }
.ds-media-copy { position: absolute; left: 1.25rem; right: 1.25rem; bottom: 1.25rem; color: #fff; }
.ds-targets { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.ds-target-ok { width: 44px; height: 44px; display: grid; place-items: center; font-size: .625rem; border-radius: 8px; background: var(--status-success-bg); color: var(--status-success-fg); border: 1px solid var(--status-success-border); }
.ds-target-bad { width: 32px; height: 32px; display: grid; place-items: center; font-size: .5625rem; border-radius: 8px; background: var(--status-danger-bg); color: var(--status-danger-fg); border: 1px solid var(--status-danger-border); }
.ds-type { display: flex; flex-direction: column; gap: 1.25rem; }
.ds-type-row { display: flex; flex-direction: column; gap: .25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); }
.ds-type-meta { display: flex; gap: .75rem; flex-wrap: wrap; align-items: baseline; }
.ds-spinner { width: 14px; height: 14px; border-radius: 9999px; border: 2px solid currentColor; border-right-color: transparent; border-bottom-color: transparent; display: inline-block; margin-right: .375rem; animation: ds-spin .9s linear infinite; }
@keyframes ds-spin { to { transform: rotate(360deg); } }
.ds-footer { border-top: 1px solid var(--border-subtle); padding: 1.5rem 1rem 3rem; max-width: 72rem; margin: 0 auto; color: var(--text-muted); font-size: .8125rem; }
code { font-family: var(--font-mono); font-size: .8125em; }

/* The "Reduce motion" control mirrors what the media query does, for demonstration. */
.ds-reduce *:not(.motion-essential):not(.motion-essential *):not(.ds-spinner) { animation-duration: .01ms !important; transition-duration: .01ms !important; animation-fill-mode: forwards !important; }
`

fs.writeFileSync(path.join(HERE, 'gallery.src.css'), galleryCss)

if (!process.argv.includes('--html')) {
  const globals = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')
  // Reuse the product's generated token block verbatim, without the app's
  // feature-specific CSS, so the catalog shows the system and not the app.
  const start = globals.indexOf('/* === GENERATED:design-system-tokens')
  const end = globals.indexOf('/* === END GENERATED:design-system-tokens === */')
  const tokenBlock = start !== -1 && end !== -1 ? globals.slice(start, end + 48) : ''
  const legacyStart = globals.indexOf(':root {')
  const legacyEnd = globals.indexOf('/* ============================================\n   GLOBAL BASE')
  const legacyBlock = legacyStart !== -1 && legacyEnd !== -1 ? globals.slice(legacyStart, legacyEnd) : ''
  const input = path.join(HERE, '.gallery-input.css')
  fs.writeFileSync(input, `${galleryCss}\n${legacyBlock}\n${tokenBlock}\n`)
  execFileSync(
    'npx',
    ['tailwindcss', '-c', path.join(ROOT, 'tailwind.config.ts'), '-i', input, '-o', path.join(HERE, 'gallery.css'), '--content', path.join(HERE, 'index.html'), '--minify'],
    { cwd: ROOT, stdio: 'inherit' }
  )
  fs.unlinkSync(input)
  console.log('wrote  design-system/gallery/gallery.css')
}
