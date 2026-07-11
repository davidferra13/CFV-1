# Rescue Workstream 3: Phase B Core Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the specific gaps that block a real chef from running one booking end to end: a proven journey test, one recipe door, an inbox alias every new chef actually gets, recipe costing on the free floor, a single day-of door, leads folded into inquiries, a prep index, hub discipline, and a ts-nocheck sweep.

**Architecture:** ChefFlow is a Next.js App Router monolith; chef portal routes live under `app/(chef)/`, server actions under `lib/{domain}/`, shared UI under `components/{domain}/`. This workstream adds tests and small route/component moves on top of the Phase A tiering infrastructure built by Workstreams 1 and 2; it creates no tables and deletes nothing. Every route conversion is a `redirect()` with the old page body preserved as a live, compiling file.

**Tech Stack:** Next.js (App Router, server components, server actions), TypeScript, PostgreSQL via Drizzle/postgres.js and a Supabase-style query client, Auth.js v5, Playwright (config: `playwright.config.ts`, canonical server `http://localhost:3100`), node:test + tsx for unit tests.

**Source of truth:** `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md` Sections 5, 6, 10, 12 (Phase B table), 13. Do not re-litigate its decisions.

---

## Global Constraints

1. **Never delete work.** No file deletion anywhere in this plan. Route conversions keep the old URL resolving via `redirect()` from `next/navigation` (temporary semantics, matching the precedent at `app/(chef)/payments/page.tsx:7` and `app/(chef)/culinary/menus/page.tsx`). Old page bodies move to live, imported-or-parked `.tsx` files in the same directory or the target surface. Record every conversion in `docs/CLAUDE-DOMAINS.md`.
2. **DB:** no migrations in this workstream. Never touch `ledger_entries`, `event_transitions`, `quote_state_transitions` write paths.
3. **Multi-user:** all copy and behavior works for any chef. No David-specific rationale in shipped copy. No new AI dependencies; everything here is deterministic.
4. **Dirty working tree warning:** ~69 files are modified in the working tree, including `components/navigation/nav-config.tsx`, `components/navigation/chef-mobile-nav.tsx` (hardcoded `/tables` tab), `lib/auth/route-policy.ts`, and dashboard `_sections`. **Phase A item 1 (workspace settlement, owned by the Phase A workstream) is a prerequisite for Tasks 1, 12, and 13**, which touch navigation files. All line anchors in this plan were read from the dirty tree on 2026-07-10 and may shift after settlement; anchor by the quoted code content, not the line number, when they disagree.
5. **Hands off:** `app/(chef)/studio/`, `app/api/studio/`, `components/studio/`, `lib/studio/`, `docs/specs/website-builder-studio.md`, `database/migrations/20260617000001_chef_sites_studio.sql`. Another tool owns these uncommitted files.
6. **Sequencing:** this is Phase B. It assumes Phase A items 1 through 8 (workspace settlement, contract amendment, wiring-audit retool, security P0, module vocabulary, tier renderer, tagging, nav defect sweep) have landed. Before starting, check `lib/feature-gates/gate-registry.ts` for the `nav_tiered_ia` flag; if it is absent, Phase A has not landed, and Tasks 1 (parity assertions only), 12, and 13 must wait. All other tasks can proceed.
7. **Gates:** tasks marked `GATE (owner)` are skipped unless the gate is marked approved in this file or by the dispatcher. The blueprint's recommended default is stated on each.
8. **Verification canon:** typecheck is `npx tsc --noEmit --skipLibCheck`. Closeout gate is `npm run regression:firewall`. Playwright runs against `http://localhost:3100` (agent auth: `POST http://localhost:3100/api/e2e/auth` with `.auth/agent.json`; most specs here use the prebuilt `.auth/chef.json` / `.auth/client.json` storage states written by `tests/helpers/global-setup.ts`). `npm run test:affected` does NOT exist in package.json; do not invent it. Unit tests run with `npm run test:unit` or targeted `node --test --import tsx <file>`.
9. **Empty states over zeros; no success without confirmation.** Any UI added here renders nothing rather than a placeholder value when data is absent.
10. **Build queue:** before starting a task, mark its matching row in `docs/UNIFIED-BUILD-QUEUE.md` as `IN-FLIGHT`; after its commit lands, mark `DONE` (verified) or `PARTIAL`. Update in place, never rebuild the queue.
11. **No em dashes** in any code, copy, or doc text you write. `compliance-guard.sh` enforces this on every Edit/Write.
12. **Test coverage blueprint:** every task that adds a test updates `docs/test-coverage-blueprint.md` in the same commit.

---

### Task 1: Core journey test, inquiry to follow-up [OPUS-ONLY]

The flagship deliverable. One Playwright spec drives a booking through the whole floor: chef logs an inquiry, quotes it, sends it, the client accepts in the client portal, an event appears, the chef plans a menu, records a payment on a phone-sized screen, and the follow-up door opens. A second test in the same file asserts the desktop/mobile primary-nav parity contract.

**Prerequisite:** Phase A item 1 (workspace settlement) because this task edits `components/navigation/chef-nav.tsx`, `components/navigation/chef-mobile-nav.tsx`, and `components/navigation/action-bar.tsx`, all in or near the dirty set. The parity test additionally assumes Phase A items 6 and 8 (tier renderer, label sweep, "Pipeline" retired) have landed; if they have not, ship the parity test wrapped in `test.fixme()` with a comment naming the dependency, and file a follow-up in `docs/UNIFIED-BUILD-QUEUE.md` to unfix it.

**Files:**

- Create: `tests/journey/00-core-loop.spec.ts` (the `journey-chef` project matches `**/journey/[0-2][0-9]-*.spec.ts`, so the `00-` prefix is load-bearing; `01-` through `29-` are taken)
- Modify: `components/navigation/chef-nav.tsx` (anchor: the element `<nav className="flex-1 overflow-y-auto pt-3 pb-6 custom-scrollbar">`, near line 1006 pre-settlement)
- Modify: `components/navigation/chef-mobile-nav.tsx` (anchor: the `<nav` that wraps the top tab bar, `className="md:hidden fixed top-[calc(3.5rem...`, near line 284 pre-settlement)
- Modify: `components/navigation/action-bar.tsx` (both return branches of `ActionBar`: the collapsed branch root `<div className="space-y-1 px-2 py-2">` and the outermost element of the non-collapsed return)
- Modify: `docs/test-coverage-blueprint.md` (Critical Gaps list, item 1 "Client inquiry-to-booking lifecycle", near line 103-105)

**Interfaces:**

- Consumes: `.auth/chef.json`, `.auth/client.json`, `.auth/seed-ids.json` (shape: `SeedResult` from `tests/helpers/e2e-seed.ts`, fields used: `clientId`, `eventIds.completed`), `createAdminClient` from `@/lib/db/admin`.
- Produces: `data-testid="chef-action-bar"` (desktop primary items), `data-testid="chef-nav-mobile-tabs"` (phone primary tabs), and the spec file. No exported functions.

**Steps:**

- [ ] Add stable selectors to the three nav files. In `components/navigation/action-bar.tsx`, add `data-testid="chef-action-bar"` to the root element of BOTH return branches (the collapsed branch root is `<div className="space-y-1 px-2 py-2">`; find the analogous outermost element of the non-collapsed return below it). In `components/navigation/chef-mobile-nav.tsx`, add `data-testid="chef-nav-mobile-tabs"` to the `<nav` element whose className starts with `md:hidden fixed top-[calc(3.5rem`. In `components/navigation/chef-nav.tsx`, add `data-testid="chef-nav-desktop"` to `<nav className="flex-1 overflow-y-auto pt-3 pb-6 custom-scrollbar">`. These are attributes only; no behavior change.
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0 before writing the spec.
- [ ] Write the failing spec at `tests/journey/00-core-loop.spec.ts` with exactly this content (selectors were researched from the live pages on 2026-07-10; the sources are cited inline so a builder can re-verify):

```ts
// tests/journey/00-core-loop.spec.ts
// THE core journey: inquiry -> quote -> client acceptance -> event -> menu ->
// payment -> follow-up. Closes docs/test-coverage-blueprint.md Critical Gap 1.
// A second test asserts desktop/mobile primary-nav parity (rescue blueprint
// Section 8: same items, same labels, both form factors).
//
// Selector sources:
//   inquiry form:  components/inquiries/inquiry-form.tsx (labels Channel,
//                  Link to Existing Client, Client Name, Occasion; submit "Log Inquiry")
//   inquiry page:  app/(chef)/inquiries/[id]/page.tsx ("+ Create Quote" link)
//   quote form:    components/quotes/quote-form.tsx (labels Client, Quote Name,
//                  Total Quoted Amount ($); submit "Create Quote")
//   quote detail:  components/quotes/quote-transitions.tsx ("Send to Client",
//                  confirm dialog action "Send Quote")
//   client portal: tests/e2e/chef_client_golden_path.spec.ts precedent
//                  ("Accept Quote" clicked twice: action then confirm)
//   payment:       components/events/payment-actions-panel.tsx +
//                  components/events/record-payment-modal.tsx
//   menu wizard:   app/(chef)/menus/new/create-menu-form.tsx
//   follow-up:     app/(chef)/events/[id]/follow-up/page.tsx (h1 "Post-Event Follow-Up")

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { createAdminClient } from '@/lib/db/admin'
import type { SeedResult } from '../helpers/e2e-seed'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

function loadSeedIds(): SeedResult {
  return JSON.parse(readFileSync('.auth/seed-ids.json', 'utf-8')) as SeedResult
}

test.describe('Core loop: inquiry to follow-up', () => {
  test.setTimeout(300_000)

  test('a booking travels from inquiry to logged payment in one thread', async ({ browser }) => {
    const seedIds = loadSeedIds()
    const admin = createAdminClient()
    const stamp = Date.now().toString()
    const occasion = `TEST Core Loop Dinner ${stamp}`
    const quoteName = `TEST Core Loop Quote ${stamp}`
    const menuName = `TEST Core Loop Menu ${stamp}`

    const chefContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 1280, height: 800 },
    })
    const clientContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/client.json',
    })
    const chefPhoneContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 375, height: 812 },
    })
    const chef = await chefContext.newPage()
    const client = await clientContext.newPage()
    const chefPhone = await chefPhoneContext.newPage()

    try {
      // ---- 1. Capture the inquiry ----
      await chef.goto('/inquiries/new')
      await chef.getByLabel('Channel').selectOption('email')
      await chef.getByLabel('Link to Existing Client').selectOption(seedIds.clientId)
      const nameInput = chef.getByLabel('Client Name')
      if (!(await nameInput.inputValue())) {
        await nameInput.fill('Joy (Test User)')
      }
      await chef.getByLabel('Occasion').fill(occasion)
      await chef.getByRole('button', { name: 'Log Inquiry' }).click()
      await chef.waitForURL(/\/inquiries\/[0-9a-f-]{36}/, { timeout: 30_000 })
      const inquiryId = chef.url().split('/inquiries/')[1].split('?')[0]
      expect(inquiryId).toBeTruthy()

      // ---- 2. Quote it from the inquiry ----
      await chef.getByRole('link', { name: /Create Quote/ }).click()
      await chef.waitForURL(/\/quotes\/new/, { timeout: 30_000 })
      const clientSelect = chef.getByLabel('Client')
      if (!(await clientSelect.inputValue())) {
        await clientSelect.selectOption(seedIds.clientId)
      }
      await chef.getByLabel('Quote Name').fill(quoteName)
      // pricing model defaults to flat_rate, so Total Quoted Amount is visible
      await chef.getByLabel(/Total Quoted Amount/).fill('2200.00')
      await chef.getByRole('button', { name: 'Create Quote' }).click()
      await chef.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 30_000 })
      const quoteId = chef.url().split('/quotes/')[1].split('?')[0]

      // ---- 3. Send it (policy confirmation dialog) ----
      await chef.getByRole('button', { name: 'Send to Client' }).click()
      await chef.getByRole('button', { name: 'Send Quote' }).click()
      await expect
        .poll(
          async () => {
            const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('sent')

      // ---- 4. Client accepts in the client portal ----
      await client.goto(`/my-quotes/${quoteId}`)
      await client
        .getByRole('button', { name: /^Accept Quote$/ })
        .first()
        .click()
      // confirmation step re-shows the button
      await client
        .getByRole('button', { name: /^Accept Quote$/ })
        .last()
        .click()
      await expect
        .poll(
          async () => {
            const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('accepted')

      // ---- 5. An event exists (inquiry conversion fired on acceptance) ----
      let eventId: string | null = null
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('quotes')
              .select('event_id')
              .eq('id', quoteId)
              .single()
            eventId = (data?.event_id as string | null) ?? null
            return eventId
          },
          { timeout: 60_000 }
        )
        .not.toBeNull()
      await chef.goto(`/events/${eventId}`)
      await expect(chef.getByText(occasion).first()).toBeVisible({ timeout: 30_000 })

      // ---- 6. Plan a menu ----
      await chef.goto('/menus/new')
      await chef.locator('input[placeholder="e.g., Summer BBQ Menu"]').fill(menuName)
      await chef.getByRole('button', { name: 'Next: Add Courses' }).click()
      await chef.locator('input[placeholder="e.g., Main Course"]').first().fill('Main Course')
      await chef.locator('input[placeholder="e.g., Duck Breast"]').first().fill('Roasted Chicken')
      await chef.getByRole('button', { name: /Create Menu \(1 course\)/ }).click()
      await expect(chef.getByText('Menu Created')).toBeVisible({ timeout: 30_000 })

      // ---- 7. Record the payment, phone-sized screen ----
      // If the Record button never appears, the acceptance conversion did not
      // carry quoted_price_cents onto the event. That is a real core-flow gap:
      // fix lib/inquiries convertInquiryToEventWithContext, do not weaken this test.
      await chefPhone.goto(`/events/${eventId}?tab=money`)
      const recordButton = chefPhone.getByRole('button', { name: /Record (Deposit|Payment)/ })
      await expect(recordButton).toBeVisible({ timeout: 30_000 })
      await recordButton.click()
      await chefPhone.locator('input[placeholder="0.00"]').fill('500.00')
      await chefPhone.locator('button[type="submit"]', { hasText: 'Record Payment' }).click()
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('ledger_entries')
              .select('id')
              .eq('event_id', eventId!)
            return (data ?? []).length
          },
          { timeout: 30_000 }
        )
        .toBeGreaterThan(0)

      // ---- 8. Follow-up door opens ----
      // The freshly booked event has not been served yet, so the follow-up
      // assertion uses the seeded completed event: the door must exist and load.
      await chef.goto(`/events/${seedIds.eventIds.completed}/follow-up`)
      await expect(chef.getByRole('heading', { name: 'Post-Event Follow-Up' })).toBeVisible({
        timeout: 30_000,
      })
    } finally {
      await chefContext.close()
      await clientContext.close()
      await chefPhoneContext.close()
    }
  })

  test('primary nav shows the same label for the same door on desktop and phone', async ({
    browser,
  }) => {
    const desktop = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 1280, height: 800 },
    })
    const phone = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 375, height: 812 },
    })
    const dPage = await desktop.newPage()
    const mPage = await phone.newPage()

    try {
      await dPage.goto('/dashboard')
      await dPage.waitForSelector('[data-testid="chef-action-bar"] a', { timeout: 30_000 })
      const desktopLinks = await dPage
        .locator('[data-testid="chef-action-bar"] a')
        .evaluateAll((els) =>
          els.map((el) => ({
            href: el.getAttribute('href') || '',
            label: (el.textContent || '').trim(),
          }))
        )

      await mPage.goto('/dashboard')
      await mPage.waitForSelector('[data-testid="chef-nav-mobile-tabs"] a', { timeout: 30_000 })
      const mobileLinks = await mPage
        .locator('[data-testid="chef-nav-mobile-tabs"] a')
        .evaluateAll((els) =>
          els.map((el) => ({
            href: el.getAttribute('href') || '',
            label: (el.textContent || '').trim(),
          }))
        )

      expect(desktopLinks.length).toBeGreaterThan(0)
      expect(mobileLinks.length).toBeGreaterThan(0)

      // Same door, same name, both form factors.
      const desktopByHref = new Map(desktopLinks.map((l) => [l.href, l.label]))
      for (const m of mobileLinks) {
        if (desktopByHref.has(m.href)) {
          expect.soft(desktopByHref.get(m.href), `label parity for ${m.href}`).toBe(m.label)
        }
      }

      // The word Pipeline is retired from the UI (contract amendment, Phase A item 8).
      for (const l of [...desktopLinks, ...mobileLinks]) {
        expect.soft(l.label, `retired label on ${l.href}`).not.toMatch(/pipeline/i)
      }
    } finally {
      await desktop.close()
      await phone.close()
    }
  })
})
```

- [ ] Run it and watch it run (first run may fail on a selector drift; fix the selector against the live page, not by weakening an assertion): `npx playwright test --project=journey-chef tests/journey/00-core-loop.spec.ts`. The canonical dev server on port 3100 is started by the config's webServer command if not already running.
- [ ] If step 7 fails because the Record button never appears: verify with the admin client that the auto-created event has `status='accepted'` and `quoted_price_cents` equal to the quote total. If either is missing, STOP this task and execute Task 1B (the named conversion-fix contingency below); do not attempt core-flow surgery inside this checkbox and do not weaken the test. Mark this task PARTIAL in `docs/UNIFIED-BUILD-QUEUE.md` with "blocked on Task 1B" until 1B lands, then resume here.
- [ ] Re-run until green: `npx playwright test --project=journey-chef tests/journey/00-core-loop.spec.ts`
- [ ] Update `docs/test-coverage-blueprint.md`: in the "Critical Gaps (P0)" list, change item 1 from `**Client inquiry-to-booking lifecycle** - The CORE flow. Only coverage crawl. No journey test.` to `**Client inquiry-to-booking lifecycle** - VERIFIED 2026-07: tests/journey/00-core-loop.spec.ts covers inquiry -> quote -> acceptance -> event -> payment -> follow-up, plus desktop/mobile nav parity.` Add a matching VERIFIED row to whatever domain table tracks the inquiries/quotes routes.
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add tests/journey/00-core-loop.spec.ts components/navigation/chef-nav.tsx components/navigation/chef-mobile-nav.tsx components/navigation/action-bar.tsx docs/test-coverage-blueprint.md && git commit -m "test: add core journey e2e, inquiry to follow-up, with nav parity contract"`

---

### Task 1B: Conversion-path fix, quote acceptance must price the event [OPUS-ONLY]

**Contingency task: run ONLY if Task 1 step 7 fails with the Record button missing.** If Task 1 went green end to end, skip this task and mark it N/A in `docs/UNIFIED-BUILD-QUEUE.md`. This is potentially a day of core-flow surgery; it gets its own task so the journey test is never blocked-in-place inside a single checkbox.

The journey test (Task 1) is the failing test for this task; no separate RED step is needed. The defect class: when a client accepts a quote, the inquiry-to-event conversion must carry the accepted quote's price onto the event so the money tab can offer Record Deposit/Payment. Finish-line item 2's whole point.

**Files:**

- Modify: `lib/inquiries/actions.ts` (`convertInquiryToEventWithContext`, declared near line 2080; anchor by the function name, not the line, after workspace settlement)
- Modify (only if diagnosis shows the gap is downstream): the acceptance path that calls the conversion (locate with `grep -rn "convertInquiryToEventWithContext" lib app`)

**Interfaces:**

- Consumes: the quote row (`quotes.total_amount_cents`, `quotes.status`, `quotes.event_id`), the event insert payload inside the conversion function.
- Produces: no signature changes; the auto-created event carries `status='accepted'` semantics and `quoted_price_cents` equal to the accepted quote total.

**Steps:**

- [ ] Reproduce: re-run `npx playwright test --project=journey-chef tests/journey/00-core-loop.spec.ts` and let it fail at step 7. Capture the created `eventId` from the test output or the quotes row.
- [ ] Diagnose with read-only SQL via the admin client: `SELECT status, quoted_price_cents FROM events WHERE id = '<eventId>';` and `SELECT status, total_amount_cents, event_id FROM quotes WHERE id = '<quoteId>';`. Name which field is missing or wrong before touching code.
- [ ] Read `convertInquiryToEventWithContext` in `lib/inquiries/actions.ts` end to end. Find the event insert/update payload. If it omits the quote's price, add the field to the payload, sourcing it from the accepted quote (the exact property names must come from the function's own variables; the contract is: event `quoted_price_cents` = quote `total_amount_cents`). If the payload is correct but the caller passes no quote context, fix the call site found by the grep instead. Keep the change minimal: one field wired through, no refactor.
- [ ] Confirm no regression on the conversion's other callers: `grep -rn "convertInquiryToEventWithContext" lib app` and re-read each call site to confirm the added field cannot overwrite a real value with null (guard with a conditional spread if the quote context is optional).
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Re-run the journey test until step 7 passes: `npx playwright test --project=journey-chef tests/journey/00-core-loop.spec.ts`. The journey test going green IS this task's verification.
- [ ] Commit: `git add lib/inquiries/actions.ts && git commit -m "fix(inquiries): carry accepted quote price onto the converted event"` (add the caller file to the stage list if the fix landed there instead).

---

### Task 2: Recipe save persistence test, and retire the debug spec's open question [CODEX-SAFE]

`tests/debug-recipe-save.spec.ts` exists but asserts nothing (it screenshots and logs; no `expect` on the outcome). `docs/test-coverage-blueprint.md` Critical Gap 6 says recipe save/edit has no persistence test. This task writes a real one and marks the debug spec superseded (kept, never deleted).

**Files:**

- Create: `tests/diagnostic/recipe-save-persistence.spec.ts` (the `diagnostic` project matches `**/diagnostic/*.spec.ts` with `.auth/chef.json`)
- Modify: `tests/debug-recipe-save.spec.ts` (header comment only)
- Modify: `docs/test-coverage-blueprint.md` (Critical Gaps item 6, near line 108-110)

**Interfaces:**

- Consumes: `/recipes/new` manual-entry flow (`app/(chef)/recipes/new/create-recipe-client.tsx`: button "Manual Entry", name input placeholder `e.g., Diane Sauce`, submit "Save Recipe", success redirect `router.push('/recipes/'+id)`), `/recipes?search=` filter (`app/(chef)/recipes/page.tsx` reads `params.search`).
- Produces: the spec file. No exports.

**Steps:**

- [ ] Write the failing test at `tests/diagnostic/recipe-save-persistence.spec.ts`:

```ts
// tests/diagnostic/recipe-save-persistence.spec.ts
// Recipe save persistence (docs/test-coverage-blueprint.md Critical Gap 6).
// Supersedes the assertion-free tests/debug-recipe-save.spec.ts.

import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('manual recipe save persists, survives reload, and is findable in the library', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const recipeName = `TEST Persistence Check ${Date.now()}`

  await page.goto('/recipes/new')
  await page.getByRole('button', { name: 'Manual Entry' }).click()
  await page.locator('input[placeholder*="Diane Sauce"]').fill(recipeName)
  const saveButton = page.getByRole('button', { name: /Save Recipe/ })
  await expect(saveButton).toBeEnabled({ timeout: 10_000 })
  await saveButton.click()

  // Success is a redirect to the recipe detail page, nothing less.
  await page.waitForURL(/\/recipes\/[0-9a-f-]{36}/, { timeout: 30_000 })
  await expect(page.getByText(recipeName).first()).toBeVisible()

  // Survives a hard reload (server persisted, not client state).
  await page.reload()
  await expect(page.getByText(recipeName).first()).toBeVisible({ timeout: 30_000 })

  // Findable in the library via server-side search.
  await page.goto(`/recipes?search=${encodeURIComponent(recipeName)}`)
  await expect(page.getByText(recipeName).first()).toBeVisible({ timeout: 30_000 })
})
```

- [ ] Run it and see the result: `npx playwright test --project=diagnostic tests/diagnostic/recipe-save-persistence.spec.ts`. If it fails at the save step, that is the open recipe-persistence bug the debug spec was chasing: diagnose (`lib/recipes/actions.ts` `createRecipeWithIngredients`) and fix before proceeding. If it passes first try, the open question is resolved as "save works"; say so in the blueprint update.
- [ ] Add this header to `tests/debug-recipe-save.spec.ts` above line 1 (keep the file; deletion is banned): `// SUPERSEDED 2026-07: this exploratory spec asserts nothing. The real persistence test lives at tests/diagnostic/recipe-save-persistence.spec.ts. Kept for reference only.`
- [ ] Update `docs/test-coverage-blueprint.md` Critical Gaps item 6 from `**Recipe save/edit** - Chef IP. No persistence tests.` to `**Recipe save/edit** - VERIFIED 2026-07: tests/diagnostic/recipe-save-persistence.spec.ts (save, reload, library search).`
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add tests/diagnostic/recipe-save-persistence.spec.ts tests/debug-recipe-save.spec.ts docs/test-coverage-blueprint.md && git commit -m "test: verify recipe save persistence, supersede debug spec"`

---

### Task 3: One recipe door: capture mode strip on /recipes [CODEX-SAFE]

The recipe door gets one visible strip naming every capture mode, so eight scattered doors become modes of one door. Nothing moves yet; every existing route keeps working. (The `/culinary/recipes` shell is Task 4 and is gated separately.)

**Files:**

- Create: `components/recipes/capture-mode-strip.tsx`
- Modify: `app/(chef)/recipes/recipes-client.tsx` (577 lines; the header action block renders `Button href="/recipes/quick-capture"` near line 157 and `Link href="/recipes/new"` near line 245; mount the strip directly below whichever header block renders on desktop)

**Interfaces:**

- Consumes: existing routes `/recipes/dump`, `/recipes/quick-capture`, `/recipes/new`, `/recipes/sprint`, `/recipes/import`, `/recipes/photos` (all verified present under `app/(chef)/recipes/`).
- Produces: `export function CaptureModeStrip(): JSX.Element` (no props needed).

**Steps:**

- [ ] Create `components/recipes/capture-mode-strip.tsx`:

```tsx
// One recipe door, many capture modes (rescue blueprint Section 6, recipe cluster).
// Brain Dump leads; quick capture is the non-AI mode; the rest keep their names.
// These are links to the existing routes. No capture surface was removed.

import Link from 'next/link'

const CAPTURE_MODES = [
  { href: '/recipes/dump', label: 'Brain Dump', hint: 'Talk or type, sort later' },
  { href: '/recipes/quick-capture', label: 'Quick Capture', hint: 'Fast manual entry' },
  { href: '/recipes/new', label: 'Full Recipe', hint: 'Complete form with ingredients' },
  { href: '/recipes/sprint', label: 'Sprint', hint: 'Batch through a backlog' },
  { href: '/recipes/import', label: 'Import', hint: 'From files or pasted text' },
  { href: '/recipes/photos', label: 'Photos', hint: 'Shoot recipe cards or notebooks' },
] as const

export function CaptureModeStrip() {
  return (
    <div
      data-testid="recipe-capture-modes"
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {CAPTURE_MODES.map((mode) => (
        <Link
          key={mode.href}
          href={mode.href}
          title={mode.hint}
          className="shrink-0 rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300 hover:border-brand-500 hover:text-stone-100 transition-colors no-underline"
        >
          {mode.label}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] In `app/(chef)/recipes/recipes-client.tsx`, add `import { CaptureModeStrip } from '@/components/recipes/capture-mode-strip'` to the imports, and render `<CaptureModeStrip />` immediately after the page header action block (the JSX region containing `<Button href="/recipes/new" data-tour="add-recipe"` around lines 157-247; place the strip once, after the outermost header container so it renders on both the mobile and desktop header variants exactly one time).
- [ ] Verify in the browser: with the dev server on 3100, run this one-liner probe: `npx playwright test --project=diagnostic tests/diagnostic/recipe-capture-strip.spec.ts` after creating it:

```ts
// tests/diagnostic/recipe-capture-strip.spec.ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('the recipe door names every capture mode', async ({ page }) => {
  await page.goto('/recipes')
  const strip = page.getByTestId('recipe-capture-modes')
  await expect(strip).toHaveCount(1)
  for (const label of [
    'Brain Dump',
    'Quick Capture',
    'Full Recipe',
    'Sprint',
    'Import',
    'Photos',
  ]) {
    await expect(strip.getByRole('link', { name: label })).toBeVisible()
  }
})
```

- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add components/recipes/capture-mode-strip.tsx "app/(chef)/recipes/recipes-client.tsx" tests/diagnostic/recipe-capture-strip.spec.ts && git commit -m "feat: capture mode strip makes /recipes the single recipe door"`

---

### Task 4: Shell /culinary/recipes into /recipes [CODEX-SAFE]

**GATE (owner): blueprint open question 5, recipe cluster. Approve converting the live page at /culinary/recipes into a redirect, with its page body preserved as a live file. Recommended default: approve.** Skip this task entirely unless the gate is marked approved.

**Files:**

- Create: `app/(chef)/culinary/recipes/recipe-book-archive-view.tsx` (the old page body, parked live and unrouted in the same directory, per blueprint Tier 4 rules)
- Modify: `app/(chef)/culinary/recipes/page.tsx` (303 lines today; becomes a redirect)
- Modify: `docs/CLAUDE-DOMAINS.md` (record the conversion)

**Interfaces:**

- Consumes: the redirect precedent at `app/(chef)/culinary/menus/page.tsx` (comment plus `redirect('/menus')`). Subroutes `/culinary/recipes/[id]`, `/new`, `/drafts`, `/tags`, `/dietary-flags`, `/seasonal-notes` remain at their original paths, exactly like the menus precedent kept its subroutes.
- Produces: `export function RecipeBookArchiveView()` (default-export renamed; unreferenced but compiling), redirect page.

**Steps:**

- [ ] Copy the entire current contents of `app/(chef)/culinary/recipes/page.tsx` into `app/(chef)/culinary/recipes/recipe-book-archive-view.tsx`. In the new file: remove the `export const metadata` line (only routes export metadata), rename the default-exported component to `RecipeBookArchiveView`, change `export default async function` to `export async function`, and add this header comment: `// Parked live view (rescue blueprint Tier 4 rule): this was the /culinary/recipes page body before the route became a redirect to /recipes. Unrouted but compiling; do not delete.`
- [ ] Replace `app/(chef)/culinary/recipes/page.tsx` entirely with:

```tsx
// Consolidated: /culinary/recipes now redirects to the canonical recipe door at /recipes.
// Sub-routes (/culinary/recipes/[id], /new, /drafts, /tags, etc.) remain at their original paths.
// The old page body is preserved live at ./recipe-book-archive-view.tsx.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Recipe Book | ChefFlow' }

export default function CulinaryRecipesRedirect() {
  redirect('/recipes')
}
```

- [ ] Route-alias map: if `lib/navigation/` contains a route-alias module from Phase A item 9 (check with `dir lib\navigation` or Glob `lib/navigation/*alias*`), add the entry mapping `/culinary/recipes` to `/recipes` there. If the module does not exist yet, add a line to `docs/UNIFIED-BUILD-QUEUE.md` under the rescue section: `Register /culinary/recipes -> /recipes in the route-alias map once Phase A item 9 lands. Status: BLOCKED (alias map not built).`
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: /culinary/recipes converted to a redirect shell (canonical: /recipes). Page body preserved live at app/(chef)/culinary/recipes/recipe-book-archive-view.tsx. Subroutes unchanged.`
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0; this proves the parked file still compiles).
- [ ] Verify with a Playwright probe file `tests/diagnostic/culinary-recipes-shell.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('/culinary/recipes resolves by redirecting to /recipes', async ({ page }) => {
  await page.goto('/culinary/recipes')
  await expect(page).toHaveURL(/\/recipes(\?|$)/)
})

test('/culinary/recipes/new still resolves at its original path', async ({ page }) => {
  const response = await page.goto('/culinary/recipes/new')
  expect(response?.status()).toBeLessThan(400)
})
```

Run: `npx playwright test --project=diagnostic tests/diagnostic/culinary-recipes-shell.spec.ts`

- [ ] Commit: `git add "app/(chef)/culinary/recipes/page.tsx" "app/(chef)/culinary/recipes/recipe-book-archive-view.tsx" docs/CLAUDE-DOMAINS.md tests/diagnostic/culinary-recipes-shell.spec.ts && git commit -m "refactor: shell /culinary/recipes into the canonical /recipes door, body preserved live"` (also stage `lib/navigation/route-aliases.ts` or `docs/UNIFIED-BUILD-QUEUE.md` if the alias step touched them)

---

### Task 5: Inbox alias provisioning in onboarding [CODEX-SAFE]

Every new chef gets their inbound email alias during setup, so the owner's number one need (inquiries flowing into the inbox) cannot silently never turn on. The alias machinery already exists (`getOrCreateEmailChannel` in `lib/comms/email-channel.ts`, idempotent, collision-safe); this task calls it from the wizard's "Connect Your Inbox" step and shows the address.

**Files:**

- Create: `lib/onboarding/inbox-alias-actions.ts`
- Modify: `components/onboarding/onboarding-steps/connect-gmail-step.tsx` (157 lines)

**Interfaces:**

- Consumes: `getOrCreateEmailChannel(chefId): Promise<{ alias, address, signalCount }>` from `@/lib/comms/email-channel`; `requireChef()` from `@/lib/auth/get-user` (chef id at `user.entityId`, the same pattern as `app/(chef)/inbox/page.tsx:119`).
- Produces: `export async function provisionOnboardingInboxAlias(): Promise<{ alias: string; address: string; signalCount: number }>` (server action).

**Steps:**

- [ ] Create `lib/onboarding/inbox-alias-actions.ts`:

```ts
'use server'

// Onboarding step: provision the chef's inbound email alias.
// Idempotent: getOrCreateEmailChannel returns the existing alias if one exists.
// Auth gate: requireChef. Tenant scoping: the alias row is keyed by chef id.

import { requireChef } from '@/lib/auth/get-user'
import { getOrCreateEmailChannel } from '@/lib/comms/email-channel'

export type OnboardingInboxAlias = {
  alias: string
  address: string
  signalCount: number
}

export async function provisionOnboardingInboxAlias(): Promise<OnboardingInboxAlias> {
  const user = await requireChef()
  return getOrCreateEmailChannel(user.entityId!)
}
```

- [ ] In `components/onboarding/onboarding-steps/connect-gmail-step.tsx`, add the import and state (after the existing `useState` imports at the top of the component body):

```tsx
import { provisionOnboardingInboxAlias } from '@/lib/onboarding/inbox-alias-actions'
```

and inside `ConnectGmailStep`, alongside the existing `loading`/`error` state:

```tsx
const [inboxAddress, setInboxAddress] = useState<string | null>(null)

useEffect(() => {
  let cancelled = false
  provisionOnboardingInboxAlias()
    .then((result) => {
      if (!cancelled) setInboxAddress(result.address)
    })
    .catch(() => {
      // Leave null: the step still works, and we never render a fake address.
    })
  return () => {
    cancelled = true
  }
}, [])
```

- [ ] Add the display block. Define it once inside the component, above the `if (gmailAlreadyConnected)` early return:

```tsx
const aliasPanel = inboxAddress ? (
  <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
    <p className="text-sm font-medium text-foreground">Your ChefFlow inbox address</p>
    <p className="mt-1 font-mono text-sm text-foreground" data-testid="inbox-alias-address">
      {inboxAddress}
    </p>
    <p className="mt-1 text-xs text-muted-foreground">
      Give this address to booking platforms, or forward mail to it. Anything sent here lands in
      your Inbox and becomes an inquiry.
    </p>
  </div>
) : null
```

Render `{aliasPanel}` in BOTH return branches: inside the `gmailAlreadyConnected` branch (after the intro paragraph, before the Continue button) and in the main return (after the header block, before the benefits list). The Gmail OAuth flow is untouched.

- [ ] Write the verification probe `tests/diagnostic/onboarding-inbox-alias.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('the onboarding inbox step shows the provisioned alias address', async ({ page }) => {
  test.setTimeout(90_000)
  // reconfigure=true always renders the wizard, even for completed accounts
  await page.goto('/onboarding?reconfigure=true')
  // If the wizard opens on archetype selection, pick the first option to unlock the steps
  const inboxStep = page.getByRole('button', { name: /Connect Your Inbox/ })
  if (!(await inboxStep.isVisible().catch(() => false))) {
    await page
      .locator('button, [role="button"]')
      .filter({ hasText: /chef|caterer|meal/i })
      .first()
      .click()
      .catch(() => {})
  }
  await inboxStep.click()
  const address = page.getByTestId('inbox-alias-address')
  await expect(address).toBeVisible({ timeout: 20_000 })
  // The route returns the stored inbound_alias verbatim; only freshly
  // generated aliases match cf-<8 hex>@ (lib/comms/email-channel.ts). A
  // pre-existing alias in another format is valid, so assert only that a
  // real address rendered, never a specific generation format.
  await expect(address).toHaveText(/\S+@\S+/)
})
```

- [ ] Run it and see it fail (the testid does not exist until the component change is saved; if you wrote the component first, expect green and note that): `npx playwright test --project=diagnostic tests/diagnostic/onboarding-inbox-alias.spec.ts`
- [ ] Make it pass; re-run the same command until green.
- [ ] Update `docs/test-coverage-blueprint.md`: add a row for the onboarding inbox-alias step, status VERIFIED, spec `tests/diagnostic/onboarding-inbox-alias.spec.ts`.
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add lib/onboarding/inbox-alias-actions.ts components/onboarding/onboarding-steps/connect-gmail-step.tsx tests/diagnostic/onboarding-inbox-alias.spec.ts docs/test-coverage-blueprint.md && git commit -m "feat: provision and show the inbound email alias in onboarding"`

---

### Task 6: Recipe costing moves to the free floor [CODEX-SAFE]

**GATE (owner): blueprint open question 2. This reverses the April 2026 two-tier decision (recipe costing was pro-gated after the March free-access experiment rolled back). Blueprint recommends yes: a Tier 0 door that opens onto a paywall teaches a new chef the floor is fake. Skip unless approved.**

Depends on nothing, but only has runtime effect once Workstream 1's security P0 (wiring `requirePro` to `requireGate` and giving the gate registry real consumers) has landed. Safe to land in either order.

**Files:**

- Create: `tests/unit/gate-registry.test.ts`
- Modify: `lib/feature-gates/gate-registry.ts` (the `recipe_costing` gate, lines 41-46: `gate('recipe_costing', 'Recipe Costing', 'pro', ...)`)

**Interfaces:**

- Consumes: `GATE_REGISTRY` export from `@/lib/feature-gates/gate-registry`.
- Produces: `GATE_REGISTRY.recipe_costing.tier === 'free'`.

**Steps:**

- [ ] Write the failing test at `tests/unit/gate-registry.test.ts`:

```ts
// Gate registry contract tests.
// recipe_costing sits on the free floor (rescue blueprint finish-line item 6,
// owner decision Q2 approved). Costing is part of the Tier 0 workflow:
// receipts -> ingredient prices -> recipe cost -> menu ticker -> quote guard.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GATE_REGISTRY } from '../../lib/feature-gates/gate-registry'

describe('gate registry', () => {
  it('recipe_costing is a free-tier gate', () => {
    assert.equal(GATE_REGISTRY.recipe_costing.tier, 'free')
  })

  it('every gate has a key matching its registry slot', () => {
    for (const [slot, def] of Object.entries(GATE_REGISTRY)) {
      assert.equal(def.key, slot)
    }
  })
})
```

- [ ] Run it and see it fail: `node --test --import tsx tests/unit/gate-registry.test.ts` (expected failure: `recipe_costing.tier` is `'pro'`).
- [ ] In `lib/feature-gates/gate-registry.ts`, change the `recipe_costing` definition's third argument from `'pro'` to `'free'`:

```ts
  recipe_costing: gate(
    'recipe_costing',
    'Recipe Costing',
    'free',
    'Ingredient-level cost analysis and margin tracking'
  ),
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/gate-registry.test.ts`
- [ ] Run the full unit suite to catch any test that asserted the old tier: `npm run test:unit`. If a pre-existing test hardcodes `recipe_costing` as pro, update that assertion in the same commit and say so in the commit body.
- [ ] Commit: `git add lib/feature-gates/gate-registry.ts tests/unit/gate-registry.test.ts && git commit -m "feat: move recipe costing to the free floor (owner decision Q2)"` (also stage any pre-existing test file whose tier assertion was updated)

---

### Task 7: Fold the /leads intake surfaces into /inquiries as an Intake tab [CODEX-SAFE]

`/leads` renders three intake surfaces (website contact-form claims, operator evaluations, guest QR referrals) under an h1 that already says "Inquiries". This task moves the body into a shared live component and gives `/inquiries` an Intake tab that renders it. `/leads` keeps rendering the same component, so nothing changes for the old URL until the gated Task 8 flips it to a redirect.

**Files:**

- Create: `components/leads/lead-intake-panel.tsx`
- Modify: `app/(chef)/leads/page.tsx` (137 lines)
- Modify: `app/(chef)/inquiries/page.tsx` (424 lines; searchParams type near line 228, tab row near lines 308-327, list region near line 330)

**Interfaces:**

- Consumes: `getUnclaimedSubmissions`, `getOperatorEvaluationInbox` from `@/lib/contact/claim`; `getGuestLeads`, `getGuestLeadStats`, `getLeadsByEvent` from `@/lib/guests/lead-actions`; presentational components `LeadsList`, `OperatorEvaluationInbox`, `GuestLeadsList`, `BatchEmailButton` (all already under `components/leads/` and `components/guest-leads/`).
- Produces: `export async function LeadIntakePanel(): Promise<JSX.Element>` (async server component, fetches its own data, no props).

**Steps:**

- [ ] Create `components/leads/lead-intake-panel.tsx` by moving everything below the page header out of `app/(chef)/leads/page.tsx` (the three `<section>` blocks: operator evaluations, website inquiries, guest referrals, including the stats grid and the by-event grouping). The component fetches its own data:

```tsx
// Intake surfaces shared by /inquiries (Intake tab) and the legacy /leads route.
// Moved from app/(chef)/leads/page.tsx (rescue blueprint, funnel cluster).
// Server component: fetches unclaimed website submissions, operator evaluations,
// and guest QR referrals for the signed-in chef.

import { getOperatorEvaluationInbox, getUnclaimedSubmissions } from '@/lib/contact/claim'
import { getGuestLeads, getGuestLeadStats, getLeadsByEvent } from '@/lib/guests/lead-actions'
import { LeadsList } from '@/components/leads/leads-list'
import { OperatorEvaluationInbox } from '@/components/leads/operator-evaluation-inbox'
import { GuestLeadsList } from '@/components/guest-leads/guest-leads-list'
import { BatchEmailButton } from '@/components/guest-leads/batch-email-button'
import { Card } from '@/components/ui/card'

export async function LeadIntakePanel() {
  const [submissions, operatorEvaluationInbox, guestLeads, guestLeadStats, leadsByEvent] =
    await Promise.all([
      getUnclaimedSubmissions(),
      getOperatorEvaluationInbox(),
      getGuestLeads(),
      getGuestLeadStats(),
      getLeadsByEvent(),
    ])

  return (
    <div className="space-y-8">
      {/* paste the three <section> blocks from app/(chef)/leads/page.tsx here,
          verbatim, including the guest-referral stats grid, the empty state,
          and the leadsByEvent map with BatchEmailButton */}
    </div>
  )
}
```

The comment placeholder above is for this plan's brevity only: the builder pastes the actual JSX from the current `app/(chef)/leads/page.tsx` (lines 45 to 135, the `operatorEvaluationInbox.isOwner` section through the closing of the guest referrals section) into that div, unchanged. **The component must NOT ship with that comment as its body**; a `LeadIntakePanel` whose div contains only the comment renders three fetches and an empty page. Before committing, confirm with `grep -c "paste the three" components/leads/lead-intake-panel.tsx` returning 0.

- [ ] Rewrite `app/(chef)/leads/page.tsx` as a thin wrapper (same URL, same content, body now shared):

```tsx
// Legacy intake route. The body now lives in components/leads/lead-intake-panel.tsx
// and also renders as the Intake tab of /inquiries. This route becomes a redirect
// once the funnel-cluster shell conversion is approved (rescue blueprint Q5).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { LeadIntakePanel } from '@/components/leads/lead-intake-panel'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Leads' }

export default async function LeadsPage() {
  await requireChef()
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Inquiries</h1>
          <p className="text-stone-400 mt-1">
            Website inquiries, operator evaluations, and guest referrals in one place.
          </p>
        </div>
        <Link href="/inquiries/new">
          <Button>+ Log Inquiry</Button>
        </Link>
      </div>
      <LeadIntakePanel />
    </div>
  )
}
```

- [ ] In `app/(chef)/inquiries/page.tsx`: (a) extend the props type to `searchParams: { status?: InquiryFilter; view?: string }`; (b) after `const filter = ...` add `const showIntake = searchParams.view === 'intake'`; (c) import `LeadIntakePanel` from `@/components/leads/lead-intake-panel`; (d) in the tab row (the `primaryTabs.map` block inside the `Card`), append after `<InquiriesOverflowSelect ... />`:

```tsx
<Link href="/inquiries?view=intake">
  <Button
    size="sm"
    variant={showIntake ? 'primary' : 'secondary'}
    className="shrink-0 whitespace-nowrap"
  >
    Intake
  </Button>
</Link>
```

and (e) wrap the list region so intake replaces the inquiry list, never both:

```tsx
{
  showIntake ? (
    <LeadIntakePanel />
  ) : (
    <WidgetErrorBoundary name="Inquiry List">
      {/* existing InquiryList Suspense block, unchanged */}
    </WidgetErrorBoundary>
  )
}
```

- [ ] Write the verification probe `tests/diagnostic/inquiries-intake-tab.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('the Intake tab shows website inquiries and guest referrals inside /inquiries', async ({
  page,
}) => {
  await page.goto('/inquiries?view=intake')
  await expect(page.getByRole('heading', { name: 'Website inquiries' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole('heading', { name: 'Guest referrals' })).toBeVisible()
})

test('/leads still renders the same intake surfaces', async ({ page }) => {
  await page.goto('/leads')
  await expect(page.getByRole('heading', { name: 'Website inquiries' })).toBeVisible({
    timeout: 30_000,
  })
})
```

- [ ] Run it: `npx playwright test --project=diagnostic tests/diagnostic/inquiries-intake-tab.spec.ts` (green required).
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Update `docs/test-coverage-blueprint.md` with the new spec (VERIFIED).
- [ ] Commit: `git add components/leads/lead-intake-panel.tsx "app/(chef)/leads/page.tsx" "app/(chef)/inquiries/page.tsx" tests/diagnostic/inquiries-intake-tab.spec.ts docs/test-coverage-blueprint.md && git commit -m "feat: fold lead intake into /inquiries as an Intake tab, body shared with /leads"`

---

### Task 8: Shell /leads to /inquiries?view=intake [CODEX-SAFE]

**GATE (owner): blueprint open question 5, funnel cluster. Recommended default: approve.** Requires Task 7 merged first (the shared panel must exist). Skip unless approved.

**Files:**

- Modify: `app/(chef)/leads/page.tsx` (the thin wrapper from Task 7 becomes a redirect)
- Modify: `docs/CLAUDE-DOMAINS.md`

**Interfaces:**

- Consumes: `/inquiries?view=intake` (Task 7). Subroutes `/leads/new`, `/leads/archived`, `/leads/contacted`, `/leads/converted`, `/leads/qualified` remain at their original paths.
- Produces: redirect page.

**Steps:**

- [ ] Replace `app/(chef)/leads/page.tsx` entirely with:

```tsx
// Consolidated: /leads now redirects to the Intake tab of the canonical inquiry door.
// Sub-routes (/leads/new, /leads/archived, etc.) remain at their original paths.
// The intake surfaces live at components/leads/lead-intake-panel.tsx.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Leads | ChefFlow' }

export default function LeadsRedirect() {
  redirect('/inquiries?view=intake')
}
```

- [ ] Route-alias map: if `lib/navigation/route-aliases.ts` exists (WS2 Task 9), confirm it already carries `'/leads': '/inquiries'` and leave it exactly that; `resolveRouteAlias` cannot carry query strings, so the alias records the canonical PATH for affinity keying while this redirect adds `?view=intake`. This difference is intentional (recorded in WS2 Task 9's plan); note it in the `docs/CLAUDE-DOMAINS.md` line below. If the alias module does not exist yet, add the BLOCKED line to `docs/UNIFIED-BUILD-QUEUE.md` as in Task 4.
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: /leads converted to a redirect shell (canonical: /inquiries?view=intake). Intake surfaces live at components/leads/lead-intake-panel.tsx. Subroutes unchanged.`
- [ ] Update `tests/diagnostic/inquiries-intake-tab.spec.ts`: change the second test's assertion from expecting the heading on `/leads` to expecting the redirect:

```ts
test('/leads resolves by redirecting to the Intake tab', async ({ page }) => {
  await page.goto('/leads')
  await expect(page).toHaveURL(/\/inquiries\?view=intake/)
  await expect(page.getByRole('heading', { name: 'Website inquiries' })).toBeVisible({
    timeout: 30_000,
  })
})
```

- [ ] Run: `npx playwright test --project=diagnostic tests/diagnostic/inquiries-intake-tab.spec.ts` (green required) and `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add "app/(chef)/leads/page.tsx" docs/CLAUDE-DOMAINS.md tests/diagnostic/inquiries-intake-tab.spec.ts && git commit -m "refactor: shell /leads into /inquiries Intake tab (funnel cluster, Q5 approved)"` (also stage `docs/UNIFIED-BUILD-QUEUE.md` if the alias step touched it)

---

### Task 9: Prep index route [CODEX-SAFE]

`app/(chef)/prep/` has no `page.tsx` (only `consolidation/`), so the bare `/prep` URL 404s. Finish-line item 9. The prep door is `/culinary/prep` (blueprint floor table row "Prep"). This is a brand new route file, not a live-page conversion, so it is not gated.

**Files:**

- Create: `app/(chef)/prep/page.tsx`

**Interfaces:**

- Consumes: `/culinary/prep` (exists: `app/(chef)/culinary/prep/page.tsx`, "Prep Overview").
- Produces: redirect page.

**Steps:**

- [ ] Create `app/(chef)/prep/page.tsx`:

```tsx
// /prep had no index route (rescue blueprint finish-line item 9).
// The prep door lives at /culinary/prep; this route exists so the bare URL resolves.
// /prep/consolidation remains at its original path.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Prep | ChefFlow' }

export default function PrepIndexRedirect() {
  redirect('/culinary/prep')
}
```

- [ ] Verify with a probe appended to a new file `tests/diagnostic/prep-and-production-routes.spec.ts` (Task 10 adds to this same file):

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('/prep resolves by redirecting to the culinary prep door', async ({ page }) => {
  await page.goto('/prep')
  await expect(page).toHaveURL(/\/culinary\/prep(\?|$)/)
})

test('/prep/consolidation still resolves at its original path', async ({ page }) => {
  const response = await page.goto('/prep/consolidation')
  expect(response?.status()).toBeLessThan(400)
})
```

Run: `npx playwright test --project=diagnostic tests/diagnostic/prep-and-production-routes.spec.ts`

- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add "app/(chef)/prep/page.tsx" tests/diagnostic/prep-and-production-routes.spec.ts && git commit -m "feat: add /prep index route resolving to the culinary prep door"`

---

### Task 10: Production month grid becomes a calendar view [CODEX-SAFE]

`/production` (379 lines) renders a month grid of events with a prep overlay (`getMonthPrepOverlay`). The blueprint keeps that capability and mounts it as a view of `/calendar`. This task extracts the page body into a live component and mounts it at `/calendar?view=production`; `/production` keeps rendering it unchanged. The redirect flip is Task 11 (gated).

**Files:**

- Create: `app/(chef)/production/production-calendar-view.tsx` (extracted body, live and routed through both surfaces)
- Modify: `app/(chef)/production/page.tsx` (becomes a thin wrapper)
- Modify: `app/(chef)/calendar/page.tsx` (140 lines; add the `view=production` branch and a view link)

**Interfaces:**

- Consumes: everything `app/(chef)/production/page.tsx` imports today (`getEvents`, `getMonthPrepOverlay`, date-fns helpers, Badge).
- Produces: `export async function ProductionCalendarView({ month }: { month?: string }): Promise<JSX.Element>` where `month` is `YYYY-MM`.

**Steps:**

- [ ] Create `app/(chef)/production/production-calendar-view.tsx`: move the entire body of the current `page.tsx` default export (and its module-level helpers `STATUS_BADGE`, `STATUS_DOT`, and any formatters) into it. Signature: `export async function ProductionCalendarView({ month }: { month?: string })`. Remove `requireChef()` from the view only if the callers gate (they do; keep `requireChef()` in both callers, not in the view, so the view has exactly one job). Keep every existing month-navigation `Link` but make the base path a prop with a default: `basePath?: string` defaulting to `'/production'`, and build month links as `` `${basePath}?month=...` `` so the same component paginates correctly from `/calendar?view=production` (pass `basePath="/calendar?view=production&"` is wrong; instead accept `hrefForMonth: (month: string) => string` as an optional prop with default `` (m) => `/production?month=${m}` ``). Header comment: `// Production month grid with prep overlay. Rendered by /production and by /calendar?view=production (rescue blueprint, time cluster).`
- [ ] Rewrite `app/(chef)/production/page.tsx` as:

```tsx
// Production Calendar route. The month grid lives in ./production-calendar-view.tsx
// and also renders as /calendar?view=production. This route becomes a redirect once
// the time-cluster shell conversion is approved (rescue blueprint Q5).
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { ProductionCalendarView } from './production-calendar-view'

export const metadata: Metadata = { title: 'Production Calendar | ChefFlow' }

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  await requireChef()
  return <ProductionCalendarView month={searchParams.month} />
}
```

- [ ] In `app/(chef)/calendar/page.tsx`: (a) add a `searchParams: { view?: string; month?: string }` prop to the default export (it currently takes none; verify against the settled file); (b) import `ProductionCalendarView` from `@/app/(chef)/production/production-calendar-view`; (c) at the top of the returned JSX, when `searchParams.view === 'production'`, render the production view instead of the FullCalendar client, with month links pointing back into the calendar route:

```tsx
if (searchParams.view === 'production') {
  return (
    <ProductionCalendarView
      month={searchParams.month}
      hrefForMonth={(m) => `/calendar?view=production&month=${m}`}
    />
  )
}
```

(d) add one link in the calendar page header area: `<Link href="/calendar?view=production" className="text-sm text-stone-400 hover:text-stone-200 underline underline-offset-2">Production view</Link>`, and inside `ProductionCalendarView` add the mirror link `<Link href="/calendar">Calendar view</Link>` near its own header.

- [ ] Append to `tests/diagnostic/prep-and-production-routes.spec.ts`:

```ts
test('the production month grid renders as a calendar view', async ({ page }) => {
  await page.goto('/calendar?view=production')
  await expect(page.getByText(/Production/i).first()).toBeVisible({ timeout: 30_000 })
})

test('/production still renders its month grid', async ({ page }) => {
  const response = await page.goto('/production')
  expect(response?.status()).toBeLessThan(400)
})
```

Run: `npx playwright test --project=diagnostic tests/diagnostic/prep-and-production-routes.spec.ts` (all four tests green).

- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add "app/(chef)/production/production-calendar-view.tsx" "app/(chef)/production/page.tsx" "app/(chef)/calendar/page.tsx" tests/diagnostic/prep-and-production-routes.spec.ts && git commit -m "feat: mount the production month grid as a /calendar view, body shared"`

---

### Task 11: Shell /production to /calendar?view=production [CODEX-SAFE]

**GATE (owner): blueprint open question 5, time cluster. Recommended default: approve.** Requires Task 10 merged first. Skip unless approved.

**Files:**

- Modify: `app/(chef)/production/page.tsx`
- Modify: `docs/CLAUDE-DOMAINS.md`
- Modify: `tests/diagnostic/prep-and-production-routes.spec.ts`

**Interfaces:**

- Consumes: `/calendar?view=production` (Task 10).
- Produces: redirect page preserving the `month` query param.

**Steps:**

- [ ] Replace `app/(chef)/production/page.tsx` entirely with:

```tsx
// Consolidated: /production now redirects to the production view of the calendar door.
// The month grid lives at ./production-calendar-view.tsx (live, shared).
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Production Calendar | ChefFlow' }

export default function ProductionRedirect({ searchParams }: { searchParams: { month?: string } }) {
  const suffix = searchParams.month ? `&month=${encodeURIComponent(searchParams.month)}` : ''
  redirect(`/calendar?view=production${suffix}`)
}
```

- [ ] Route-alias map: if `lib/navigation/route-aliases.ts` exists (WS2 Task 9), confirm it carries `'/production': '/calendar'` and leave it exactly that; the alias records the canonical PATH only (no query strings in the map), while this redirect adds `?view=production`. This difference is intentional; note it in the `docs/CLAUDE-DOMAINS.md` line below. If the alias module does not exist yet, add the BLOCKED line to `docs/UNIFIED-BUILD-QUEUE.md` as in Task 4.
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: /production converted to a redirect shell (canonical: /calendar?view=production). Month grid preserved live at app/(chef)/production/production-calendar-view.tsx.`
- [ ] Update the last test in `tests/diagnostic/prep-and-production-routes.spec.ts` to assert the redirect:

```ts
test('/production resolves by redirecting to the calendar production view', async ({ page }) => {
  await page.goto('/production?month=2026-08')
  await expect(page).toHaveURL(/\/calendar\?view=production&month=2026-08/)
})
```

- [ ] Run: `npx playwright test --project=diagnostic tests/diagnostic/prep-and-production-routes.spec.ts` and `npx tsc --noEmit --skipLibCheck` (both green).
- [ ] Commit: `git add "app/(chef)/production/page.tsx" docs/CLAUDE-DOMAINS.md tests/diagnostic/prep-and-production-routes.spec.ts && git commit -m "refactor: shell /production into the calendar production view (time cluster, Q5 approved)"` (also stage `docs/UNIFIED-BUILD-QUEUE.md` if the alias step touched it)

---

### Task 12: One day-of door, seven contained cockpits [OPUS-ONLY]

**GATE (owner): blueprint open question 1. The owner must name the winner among the 8 cockpits before any step below runs. There is no recommended default; do not guess. Skip this task entirely until the gate is approved with a winner named.**

**Prerequisite: WS2 Task 14 has landed and the read-only sheet exists at `app/(chef)/events/[id]/day-of/page.tsx`.** That sheet IS the day-of door. This task mounts the view switcher and a prominent "Open <winner>" link at the top of the sheet; it must NEVER replace the sheet file with a redirect (doing so would delete the Phase A deliverable, a hard never-delete-work violation). If the file at that path is missing or contains `redirect(`, stop: either WS2 Task 14 has not landed (wait) or the sheet was clobbered (restore from git history first).

The 8 cockpits, verified present on 2026-07-10:

| Key          | Route                       | File                                                                    |
| ------------ | --------------------------- | ----------------------------------------------------------------------- |
| service      | `/events/[id]/service`      | `app/(chef)/events/[id]/service/page.tsx`                               |
| kds          | `/events/[id]/kds`          | `app/(chef)/events/[id]/kds/page.tsx`                                   |
| kitchen-mode | `/events/[id]/kitchen-mode` | `app/(chef)/events/[id]/kitchen-mode/page.tsx`                          |
| execution    | `/events/[id]/execution`    | `app/(chef)/events/[id]/execution/page.tsx`                             |
| briefing     | `/events/[id]/briefing`     | `app/(chef)/events/[id]/briefing/page.tsx` (also `/briefing` top-level) |
| dop-mobile   | `/events/[id]/dop/mobile`   | `app/(chef)/events/[id]/dop/mobile/page.tsx`                            |
| call-sheet   | `/culinary/call-sheet`      | `app/(chef)/culinary/call-sheet/page.tsx`                               |
| kitchen      | `/kitchen`                  | `app/(chef)/kitchen/page.tsx` (launcher)                                |

Containment pattern (applies whichever cockpit wins; `WINNER` below is the owner's pick):

**Prerequisite:** Phase A item 1 (workspace settlement) because this task touches `components/navigation/nav-config.tsx`.

**Files:**

- Create: `lib/events/day-of-door.ts`
- Create: `tests/unit/day-of-door.test.ts`
- Modify: `app/(chef)/events/[id]/day-of/page.tsx` (the WS2 Task 14 sheet; mount the switcher and the "Open <winner>" link at the top of its JSX; do not touch its sections and never convert it to a redirect)
- Create: `components/events/day-of-view-switcher.tsx`
- Modify: the six event-scoped cockpit `page.tsx` files above (mount the switcher; content untouched)
- Modify: `app/(chef)/kitchen/page.tsx` (add one link into the day-of door; the launcher stays)
- Modify: `components/navigation/nav-config.tsx` (any entry pointing at a non-winner cockpit gains the winner's day-of door as its primary target; old entries stay resolvable) (dirty-tree warning applies)
- Modify: `docs/CLAUDE-DOMAINS.md`

**Interfaces:**

- Produces: `export const DAY_OF_COCKPITS`, `export const DAY_OF_WINNER: DayOfCockpitKey`, `export function dayOfDoorHref(eventId: string): string`, `export function DayOfViewSwitcher({ eventId }: { eventId: string }): JSX.Element`.

**Steps:**

- [ ] Write the failing unit test at `tests/unit/day-of-door.test.ts`:

```ts
// Day-of door contract (rescue blueprint finish-line item 8, owner decision Q1).
// One door; all eight cockpits reachable from it; none removed.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DAY_OF_COCKPITS, DAY_OF_WINNER, dayOfDoorHref } from '../../lib/events/day-of-door'

describe('day-of door', () => {
  it('lists all eight cockpits, none removed', () => {
    const keys = DAY_OF_COCKPITS.map((c) => c.key).sort()
    assert.deepEqual(keys, [
      'briefing',
      'call-sheet',
      'dop-mobile',
      'execution',
      'kds',
      'kitchen',
      'kitchen-mode',
      'service',
    ])
  })

  it('the winner is one of the cockpits', () => {
    assert.ok(DAY_OF_COCKPITS.some((c) => c.key === DAY_OF_WINNER))
  })

  it('the door resolves to the winner for an event', () => {
    const winner = DAY_OF_COCKPITS.find((c) => c.key === DAY_OF_WINNER)!
    assert.equal(dayOfDoorHref('abc-123'), winner.href('abc-123'))
  })
})
```

- [ ] Run and see it fail (module does not exist): `node --test --import tsx tests/unit/day-of-door.test.ts`
- [ ] Create `lib/events/day-of-door.ts`, substituting the owner's approved winner for the `DAY_OF_WINNER` value:

```ts
// Day-of door registry (rescue blueprint Section 10 item 8, owner decision Q1).
// One canonical door per event; the seven non-winners stay reachable as views.
// No cockpit is removed; existing names are kept.

export type DayOfCockpitKey =
  | 'service'
  | 'kds'
  | 'kitchen-mode'
  | 'execution'
  | 'briefing'
  | 'dop-mobile'
  | 'call-sheet'
  | 'kitchen'

export type DayOfCockpit = {
  key: DayOfCockpitKey
  label: string
  eventScoped: boolean
  href: (eventId: string) => string
}

export const DAY_OF_COCKPITS: DayOfCockpit[] = [
  { key: 'service', label: 'Service', eventScoped: true, href: (id) => `/events/${id}/service` },
  { key: 'kds', label: 'KDS', eventScoped: true, href: (id) => `/events/${id}/kds` },
  {
    key: 'kitchen-mode',
    label: 'Kitchen Mode',
    eventScoped: true,
    href: (id) => `/events/${id}/kitchen-mode`,
  },
  {
    key: 'execution',
    label: 'Execution',
    eventScoped: true,
    href: (id) => `/events/${id}/execution`,
  },
  { key: 'briefing', label: 'Briefing', eventScoped: true, href: (id) => `/events/${id}/briefing` },
  {
    key: 'dop-mobile',
    label: 'Pocket Sheet',
    eventScoped: true,
    href: (id) => `/events/${id}/dop/mobile`,
  },
  {
    key: 'call-sheet',
    label: 'Call Sheet',
    eventScoped: false,
    href: () => `/culinary/call-sheet`,
  },
  { key: 'kitchen', label: 'Kitchen', eventScoped: false, href: () => `/kitchen` },
]

// OWNER DECISION Q1: replace 'kitchen-mode' with the approved winner before merging.
export const DAY_OF_WINNER: DayOfCockpitKey = 'kitchen-mode'

export function dayOfDoorHref(eventId: string): string {
  const winner = DAY_OF_COCKPITS.find((c) => c.key === DAY_OF_WINNER)
  if (!winner) throw new Error(`day-of winner ${DAY_OF_WINNER} is not a registered cockpit`)
  return winner.href(eventId)
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/day-of-door.test.ts`
- [ ] Modify `app/(chef)/events/[id]/day-of/page.tsx` (the WS2 Task 14 read-only sheet; it stays a full page, never a redirect). Add two imports:

```tsx
import { DayOfViewSwitcher } from '@/components/events/day-of-view-switcher'
import { dayOfDoorHref } from '@/lib/events/day-of-door'
```

and insert this block as the FIRST children inside the sheet's returned root `<div className="mx-auto max-w-xl space-y-4 pb-16">`, above the existing `<header>`:

```tsx
      {/* Day-of door (owner decision Q1): the sheet is the door; the winning
          cockpit is one tap away and the other cockpits are views. */}
      <DayOfViewSwitcher eventId={id} />
      <Link
        href={dayOfDoorHref(id)}
        className="block rounded-lg border border-brand-500 bg-brand-950 px-4 py-3 text-center text-lg font-semibold text-brand-500 no-underline"
      >
        Open live cockpit
      </Link>
```

The sheet already imports `Link` and already has `id` in scope from its params handling; everything below the inserted block stays byte-for-byte as WS2 shipped it.

- [ ] Create `components/events/day-of-view-switcher.tsx`:

```tsx
'use client'

// View switcher mounted on every day-of cockpit. Presents the eight cockpits
// as views of one door instead of eight rival pages. None removed.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DAY_OF_COCKPITS } from '@/lib/events/day-of-door'

export function DayOfViewSwitcher({ eventId }: { eventId: string }) {
  const pathname = usePathname() ?? ''
  return (
    <div
      data-testid="day-of-view-switcher"
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
    >
      {DAY_OF_COCKPITS.map((cockpit) => {
        const href = cockpit.href(eventId)
        const active = pathname === href
        return (
          <Link
            key={cockpit.key}
            href={href}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs no-underline transition-colors ${
              active
                ? 'border-brand-500 bg-brand-950 text-brand-500'
                : 'border-stone-700 bg-stone-900 text-stone-400 hover:text-stone-200'
            }`}
          >
            {cockpit.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] Mount `<DayOfViewSwitcher eventId={params.id} />` at the top of the returned JSX in each of the six event-scoped cockpit pages (`service`, `kds`, `kitchen-mode`, `execution`, `briefing`, `dop/mobile`). Each is a one-line import plus a one-line JSX insertion; do not touch any other logic in those files. For `kitchen-mode` and `kds`, which are full-screen surfaces, place the switcher above the full-screen client component so it is visible before entering full-screen.
- [ ] In `app/(chef)/kitchen/page.tsx`, add a line of copy with a link near the launcher: `Looking for one event's day-of view? Open it from the event page or /events/[id]/day-of.` implemented as a `Link` to `/events` (the launcher itself keeps working; `/kitchen` is frozen pending fold-in per blueprint Tier 1 "kitchen" row).
- [ ] In `components/navigation/nav-config.tsx` (after workspace settlement), find every nav entry deep-linking to a non-winner cockpit and confirm each still resolves (they do; routes unchanged). Add no new nav entries for non-winners. If a "Day-Of" nav entry is wanted on the event workspace, that belongs to the event workspace tab discipline in Task 13.
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: day-of door is the Phase A sheet at /events/[id]/day-of, now carrying the view switcher and an Open-cockpit link to the Q1 winner (<winner>). All eight cockpits preserved as views via components/events/day-of-view-switcher.tsx. The sheet was not replaced.`
- [ ] Verify: `npx tsc --noEmit --skipLibCheck` (exit 0), then a Playwright probe `tests/diagnostic/day-of-door.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'

test.use({ storageState: '.auth/chef.json' })

test('the day-of door is the sheet plus the switcher, not a redirect', async ({ page }) => {
  const seedIds = JSON.parse(readFileSync('.auth/seed-ids.json', 'utf-8'))
  await page.goto(`/events/${seedIds.eventIds.confirmed}/day-of`)
  // still on the sheet URL: the Phase A deliverable was not clobbered
  await expect(page).toHaveURL(new RegExp(`/events/${seedIds.eventIds.confirmed}/day-of`))
  await expect(page.getByTestId('day-of-view-switcher')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('link', { name: 'Open live cockpit' })).toBeVisible()
})
```

Run: `npx playwright test --project=diagnostic tests/diagnostic/day-of-door.spec.ts`

- [ ] Commit: `git add lib/events/day-of-door.ts tests/unit/day-of-door.test.ts "app/(chef)/events/[id]/day-of/page.tsx" components/events/day-of-view-switcher.tsx "app/(chef)/events/[id]/service/page.tsx" "app/(chef)/events/[id]/kds/page.tsx" "app/(chef)/events/[id]/kitchen-mode/page.tsx" "app/(chef)/events/[id]/execution/page.tsx" "app/(chef)/events/[id]/briefing/page.tsx" "app/(chef)/events/[id]/dop/mobile/page.tsx" "app/(chef)/kitchen/page.tsx" components/navigation/nav-config.tsx docs/CLAUDE-DOMAINS.md tests/diagnostic/day-of-door.spec.ts && git commit -m "feat: one day-of door with all eight cockpits contained as views (owner decision Q1)"`

---

### Task 13: Internal tier pass for Tier 0 hubs [OPUS-ONLY]

Tier 0 hubs obey the same one-door-per-job rule inside themselves. Three moves: a written sub-assignment table for `/culinary`'s 53 pages, the finance payroll and tax subsections tagged with the Payroll and Tax module, and a written tab-discipline table for the event workspace's 30+ subroutes. This task writes decisions down and tags nav entries; it moves no pages (moves already covered by Tasks 4/8/11/12 or queued).

**Prerequisites:** Phase A items 1 (settlement), 5 (module vocabulary mapping table: blueprint name, billing slug, gate keys, plan tier), 6 and 7 (tier renderer reading `tier`/`module` tags). This task consumes the module slug for "Payroll and Tax" from the Phase A vocabulary table; if that table has not landed, stop and mark this task BLOCKED in `docs/UNIFIED-BUILD-QUEUE.md` rather than inventing a slug.

**Files:**

- Create: `docs/specs/rescue/2026-07-10-tier0-hub-subassignments.md`
- Modify: `components/navigation/nav-config.tsx` (finance group, payroll/tax entries near lines 842-905 pre-settlement: `Payroll` with children 941/employees/run/w2, `Tax Center` with its seven children, `Sales Tax`, `Tax Prep`, `Year-End Close`) (dirty-tree warning applies)
- Modify: `docs/CLAUDE-DOMAINS.md`

**Interfaces:**

- Consumes: the tier/module tagging mechanism Phase A item 6 built on `NavCollapsibleItem`/`NavGroup` (today: `NavGroup.module?: string` exists at `nav-config.tsx:129`; Phase A extends item-level tagging; use whatever field shape Phase A shipped).
- Produces: the sub-assignment doc; module tags on finance payroll/tax nav entries.

**Steps:**

- [ ] Write `docs/specs/rescue/2026-07-10-tier0-hub-subassignments.md` with three tables. Table 1, `/culinary` (verified directory listing 2026-07-10; 53 page.tsx files): the three doors that carry the hub are `prep`, `prep/shopping` (with `costing`), and `costing`; assign each subdirectory one row with its disposition:

| Culinary section                                               | Disposition                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| prep (+ timeline, shopping)                                    | Door. Carries the hub                                                                              |
| costing                                                        | Door. Carries the hub                                                                              |
| ingredients                                                    | Door-adjacent library, stays in hub nav                                                            |
| recipes                                                        | Shell to /recipes (Task 4, Q5 recipe cluster)                                                      |
| menus                                                          | Already a shell to /menus (precedent)                                                              |
| dish-index, components, substitutions                          | Library group, one search away                                                                     |
| price-catalog, sourcing, vendors, supplier-calls               | Rides Sourcing and Inventory module surfaces where tagged; hub links stay                          |
| call-sheet                                                     | Day-of family (Task 12 registry)                                                                   |
| chefnotes, cheftips, tips                                      | Library group                                                                                      |
| chromatic-atlas, seasonal-calendar, sustainability, my-kitchen | Contained below the fold of the hub index; candidates for module tags in a later pass, no move now |

Table 2, finance: payments, invoices, expenses, ledger, reporting stay on the floor; `Payroll` (941, Employees, Run Payroll, W-2), `Tax Center` (all children), `Sales Tax`, `Tax Prep`, `Year-End Close` ride the Payroll and Tax module. Table 3, event workspace: list the subroute directories of `app/(chef)/events/[id]/` (read the directory when writing the doc) and assign each to one of: a lifecycle tab (overview, money, prep, ops, wrap, tickets), the day-of family (dop, execution, service, kds, kitchen-mode, briefing), records (documents, photos, invoice, receipts, report, aar, debrief, outcome, close-out, replay), or Labs (god-mode, stays per security finding 7). State in the doc header that this table is the containment contract for future event-workspace work, and that no route moves in this pass.

- [ ] In `components/navigation/nav-config.tsx`, tag the finance payroll/tax entries with the Payroll and Tax module using the Phase A mechanism and the slug from the Phase A vocabulary table. Example shape (adjust the field name to match what Phase A shipped): add `module: '<payroll-tax-slug-from-vocabulary-table>'` to the `Payroll`, `Tax Center`, `Sales Tax`, `Tax Prep`, and `Year-End Close` items. Do not tag payments, invoices, ledger, expenses, or reporting; they are floor.
- [ ] Run the retooled wiring audit (Phase A item 3 taught it to read tier tags): `npm run regression:firewall:fast` and confirm no new weak/orphan failures were introduced by the tags.
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: Tier 0 hub sub-assignments written (docs/specs/rescue/2026-07-10-tier0-hub-subassignments.md). Finance payroll and tax subsections tagged with the Payroll and Tax module.`
- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Commit: `git add docs/specs/rescue/2026-07-10-tier0-hub-subassignments.md components/navigation/nav-config.tsx docs/CLAUDE-DOMAINS.md && git commit -m "feat: internal tier pass for culinary, finance, and event workspace hubs"`

---

### Task 14: Repo-wide @ts-nocheck sweep [CODEX-SAFE]

Finish-line item 11: find every real `@ts-nocheck` directive, apply the triage rule, and write the result down. This replaces the withdrawn generate-ics claim (that file only mentions the string in a comment; verified 2026-07-10).

**Files:**

- Modify: only files the triage rule flags (expected: none; see baseline below)
- Modify: `docs/CLAUDE-DOMAINS.md` (sweep record)
- Create: `tests/unit/ts-nocheck-sweep.test.ts` (a guard so the class of defect cannot silently return)

**Interfaces:** none consumed; produces the guard test.

**Baseline measured 2026-07-10.** The directive grep (a line that is exactly a `@ts-nocheck` comment) found 9 files: `types/database.generated.d.ts` and 8 under `scripts/` (`check-pie-state`, `cleanup-e2e-data`, `run-pie-migrations`, `seed-e2e-remote`, `seed-full-simulation`, `seed-ingredients-backfill`, `seed-local-demo`, `seed-pie-nationwide`). Zero of the scripts export anything; the generated `.d.ts` exports types only (declarations, not callable functions). Files that merely mention the string in comments (`lib/events/fire-order.ts`, `lib/scheduling/generate-ics.ts`, `lib/waste/actions.ts`, and several scripts) are not violations.

**Triage rule (the CLAUDE.md contract is "@ts-nocheck files must not export callable functions"):**

1. Directive file under `scripts/` with zero `export` statements: allowed, record it.
2. Generated declaration files (`*.generated.d.ts`): allowed, type-only exports, record it.
3. Directive file under `app/`, `lib/`, `components/`, `database/` OR any directive file exporting a function/const: violation. Fix by removing the directive and repairing the types; if the file is deferred-schema work (like `lib/waste/actions.ts`'s pattern), convert the exports to commented-out code with a `DEFERRED` header instead. Never delete the file.

**Steps:**

- [ ] Run the directive grep and save the list (Git Bash):
      `grep -rln -E '^\s*//\s*@ts-nocheck\s*$' --include='*.ts' --include='*.tsx' app lib components types database scripts middleware.ts`
- [ ] For each hit, run the export check: `grep -c -E '^export ' <file>`. Apply the triage rule. With the 2026-07-10 baseline, the expected result is zero violations; if the list differs from the baseline, triage the new entries the same way.
- [ ] Fix any rule-3 violations found (remove directive, repair types, `npx tsc --noEmit --skipLibCheck` must exit 0 after).
- [ ] Write the guard test at `tests/unit/ts-nocheck-sweep.test.ts`:

```ts
// Guard: @ts-nocheck directives may not exist in product code
// (app/, lib/, components/, database/). Scripts and generated declaration
// files are allowlisted (rescue blueprint finish-line item 11).

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'

describe('ts-nocheck sweep', () => {
  it('no @ts-nocheck directive exists in product source directories', () => {
    let out = ''
    try {
      out = execSync(
        'git grep -l -E "^\\s*//\\s*@ts-nocheck\\s*$" -- "app/**/*.ts" "app/**/*.tsx" "lib/**/*.ts" "lib/**/*.tsx" "components/**/*.tsx" "components/**/*.ts" "database/**/*.ts"',
        { encoding: 'utf-8' }
      )
    } catch (err: unknown) {
      // git grep exits 1 when nothing matches; that is the passing case
      const status = (err as { status?: number }).status
      assert.equal(status, 1, `git grep failed unexpectedly: ${String(err)}`)
      return
    }
    assert.fail(`@ts-nocheck directive found in product code:\n${out}`)
  })
})
```

- [ ] Run it: `node --test --import tsx tests/unit/ts-nocheck-sweep.test.ts` (green; if red, a rule-3 violation was missed, go back one step).
- [ ] Record in `docs/CLAUDE-DOMAINS.md`: `2026-07: @ts-nocheck sweep complete. Directives exist only in scripts/ (8 files, zero exports) and types/database.generated.d.ts (type-only). Guard: tests/unit/ts-nocheck-sweep.test.ts. The earlier generate-ics claim was verified false.`
- [ ] Commit: `git add tests/unit/ts-nocheck-sweep.test.ts docs/CLAUDE-DOMAINS.md && git commit -m "chore: repo-wide ts-nocheck sweep with unit guard (finish-line item 11)"` (also stage any file the triage rule fixed)

---

### Task 15: Workstream closeout [OPUS-ONLY]

Run once after every ungated task (and any approved gated task) has merged.

**Files:**

- Modify: `docs/UNIFIED-BUILD-QUEUE.md`, `docs/test-coverage-blueprint.md`, `docs/build-state.md` (status updates only)

**Steps:**

- [ ] Run `npx tsc --noEmit --skipLibCheck` (exit 0).
- [ ] Run `npm run regression:firewall` (the closeout gate: nav audit, wiring audit with zero weak/orphan contract, typecheck, runtime verification, affected-route probes). Fix anything red before proceeding; do not mark the workstream done with a red firewall. Known pre-existing exception: until WS2 Task 2 (expected-orphan allowlist in `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`) lands, the wiring audit fails on the `/studio/preview` orphan from the untouchable dirty Studio work; that single documented failure does not block this closeout, anything else red does.
- [ ] Run the full new-test set once, in order:
  - `node --test --import tsx tests/unit/gate-registry.test.ts tests/unit/day-of-door.test.ts tests/unit/ts-nocheck-sweep.test.ts` (skip files for skipped gated tasks)
  - `npx playwright test --project=diagnostic tests/diagnostic/recipe-save-persistence.spec.ts tests/diagnostic/recipe-capture-strip.spec.ts tests/diagnostic/onboarding-inbox-alias.spec.ts tests/diagnostic/inquiries-intake-tab.spec.ts tests/diagnostic/prep-and-production-routes.spec.ts`
  - `npx playwright test --project=journey-chef tests/journey/00-core-loop.spec.ts`
- [ ] In `docs/UNIFIED-BUILD-QUEUE.md`, set every Phase B row this workstream owns to its true state: `DONE` for merged-and-verified, `BLOCKED (gate: Qn)` for skipped gated tasks, listing the exact gate question. One row is delivered by another workstream: mark the Phase B "'platform' inquiry-channel enum fix" row `DONE (delivered by WS1 Task 10, docs/specs/rescue/2026-07-10-rescue-ws1-security.md)` rather than leaving it dangling; this workstream has no task for it by design.
- [ ] Confirm `docs/test-coverage-blueprint.md` has a VERIFIED row for every spec added by Tasks 1, 2, 3, 5, 7, 9/10, 12 (as applicable).
- [ ] Name the exact URL verified in the closeout note: `http://localhost:3100`.
- [ ] Commit: `git add docs/UNIFIED-BUILD-QUEUE.md docs/test-coverage-blueprint.md docs/build-state.md && git commit -m "docs: close out rescue workstream 3 phase b, statuses reconciled"`
