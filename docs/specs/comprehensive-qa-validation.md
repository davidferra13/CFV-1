# Spec: Comprehensive QA Validation (Pre-Launch)

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none (all builder agents must finish first)
> **Estimated complexity:** large (test infrastructure exists; execution is the work)

## Timeline

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-04-01 14:00 | Planner (Opus 4.6) |        |
| Status: ready | 2026-04-01 14:00 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

"I personally do not feel like getting other people to test right now, so our only option is to survey and to test it ourselves and do everything ourselves. You have to understand, I do have OpenClaw on a Raspberry Pi that can also help with any of these tasks if we need it.

You also stated you have an agent building right now, currently finishing the latest patch with Playwright testing. So you need to tell me if we should wait, like a half hour, so we have the version of the website in its most refined form, so we never create regression.

Everything we're about to do costs money. Especially if we use Claude, which I want to use because Claude will test better than anything else. I figured that I would turn Opus into a premium system, give it a true and thorough test, like a final finishing of the website.

We have to use OpenClaw too. If there's anything we can do instead of just Playwrighting one by one, using a VS Code kitchen, please let me know and we can try that avenue as well.

Let's create the infrastructure to test the website right now. Make sure everything works. Make sure you can test out any error. Make sure that whatever is built is built. What is performed properly is performed properly.

We have to remember too that we eventually do this from the client's perspective also and a public user. Chef operators are the most important. So we need to map out every single thing that you can do on the Chef portal.

Test every single input and output. We need to make sure that we are reinforcing on our own or instantly reporting back with things to be fixed.

We always need to make sure too that we are all constantly aligning with the goal that we're heading towards. There can never be any sort of drift.

The website's pretty much done besides just waiting on the databases to be built and then this other bot to finish the pages it's working on - the recipes page, the pricing page, the catalog, network, and the homepage.

I need you to perfectly discuss what our plan going forward is. It's very important that any plan we have gets fully planned out and documented and turned into a spec with developer notes because I'm passionately talking about what needs to get done and if we do not tie this to the builds for the building agent, we will lose crucial information."

### Developer Intent

- **Core goal:** Validate the entire ChefFlow application before launch, using Claude (Opus) as the primary QA system, with no external testers
- **Key constraints:** Must wait for the active builder agent to finish (~30 min). Must not create regression. Every test run costs money, so be efficient. Pi is available for OpenClaw tasks. No drift from goals.
- **Motivation:** The website is functionally complete. This is the final gate before launch. The developer wants a thorough, systematic validation, not spot checks.
- **Success from the developer's perspective:** Every page loads. Every button works. Every form submits. Every error is handled. Client portal works. Public pages work. Chef portal (highest priority) is fully mapped and validated. Findings are immediately fixed or documented for fix. Zero drift.

---

## What This Does (Plain English)

This is not a feature build. This is a systematic QA execution plan that uses existing Playwright test infrastructure to validate every surface of ChefFlow before launch. It prioritizes Chef portal (primary user), then Client portal, then Public pages. It uses Claude Opus as the QA engine, the existing 100+ test files as the test battery, and the Pi for any OpenClaw-specific validation.

---

## Why It Matters

The website is functionally complete. The only thing between "built" and "launched" is confidence that it works. This spec creates that confidence with evidence, not assumptions.

---

## The Plan: 4 Phases

### Phase 0: Wait and Prepare (NOW, while builder agent finishes)

**Duration:** ~30 minutes (while builder completes recipes, pricing, catalog, network, homepage)

**What we do:**

1. This spec is the deliverable (done)
2. Verify test infrastructure is ready (auth files, dev server config)
3. Do NOT write code, do NOT run tests against the active codebase
4. When the builder commits and pushes, we pull latest and verify build is green

**Why wait:** The builder is touching recipes, pricing, catalog, network, and homepage. Running tests now would test stale code and waste tokens. Worse, if we touch the same files, we create merge conflicts.

### Phase 1: Smoke + Experiential (Fastest coverage, highest ROI)

**What:** Run the two test suites that give the most coverage per token:

1. **Experiential suite** (`npm run test:experiential`) - 9 tests covering:
   - Chef sign-in flow
   - Client sign-in flow
   - Chef navigation (every sidebar link loads without blank screen)
   - Inquiry-to-event full flow
   - Event lifecycle (FSM transitions)
   - Client portal
   - Cross-boundary transitions (chef <-> client <-> public)
   - Loading states (no blank screens)
   - Error states (no silent failures)

2. **Coverage suite** (`npm run test:coverage`) - 7 test files covering:
   - All public routes (no 500s)
   - All chef routes (no 500s, proper auth)
   - All client routes (no 500s, proper auth)
   - All admin routes (proper admin gate)
   - Auth boundaries (role isolation)
   - API routes (no unprotected endpoints)

**This alone covers:** Authentication, authorization, route health, blank screen detection, loading states, error handling, and cross-portal transitions. If these pass, the app is fundamentally sound.

**Estimated time:** 15-25 minutes for both suites
**Estimated cost:** Minimal (Playwright runs locally, no AI tokens)

### Phase 2: Deep Interaction Testing (Chef Portal Focus)

**What:** Run the interaction test battery that validates every form, button, and mutation on the Chef portal:

```
npm run test:interactions
```

This runs 49 test files covering:

- Create flows (events, clients, quotes, recipes, menus)
- FSM transitions (event state machine)
- Quote flows (generate, send, accept, reject)
- Form validation (required fields, error messages)
- Close-out wizard
- Day-of-Plan and Kitchen Display
- Chat and activity
- Calendar and schedule
- AAR and debrief
- Onboarding wizard
- Inquiry pipeline (filters, actions)
- Search and filter
- Export and reports
- Mobile viewports
- Data persistence (refresh retains data)
- Error handling (server failures show errors, not zeros)
- Navigation completeness
- Staff management
- Menus deep (ingredient linking, cost calc)
- Grocery and quoting
- Inventory, waste, costing
- Loyalty program
- Proposals, goals, partners
- Marketing campaigns
- Mutation verification (actions actually persist)
- Multi-tenant isolation
- Analytics deep
- Finance deep
- Culinary deep
- Client subsections
- Social and network
- Settings deep

**If Phase 1 passes but Phase 2 has failures:** Each failure is a specific, fixable bug. We fix in-session and re-run just the failing test.

**Estimated time:** 45-90 minutes (49 test files, sequential)
**Estimated cost:** Minimal (Playwright, no AI tokens)

### Phase 3: Journey Tests + Client/Public Perspective

**What:** User journey tests that simulate real workflows end-to-end:

```
npx playwright test --config=playwright.journey.config.ts
```

17 journey tests covering:

- Remy AI drawer interaction
- Onboarding setup flow
- Import/grandfather data
- Calendar and availability
- First inquiry handling
- Archetype setup
- Client management workflows
- Recipes and menus creation
- Financial basics (expenses, ledger)
- Event lifecycle (full cycle)
- Communication flows
- Analytics review
- Grocery sourcing
- Safety and compliance
- Document generation
- Marketing and growth
- Loyalty and retention

**Plus client portal specific:**

```
npm run test:e2e:client
npm run test:e2e:cross-portal
```

### Phase 4: Fix, Verify, Ship

**What:** For every failure found in Phases 1-3:

1. Categorize: crash, wrong data, missing feature, cosmetic
2. Crashes and wrong data: fix immediately in this session
3. Missing features: check if it's a known spec (probably is, given 127 specs exist)
4. Cosmetic: document, don't block launch
5. Re-run failing tests after each fix
6. When all phases pass: commit test results, update build-state.md, push

---

## Alternative to One-by-One Playwright: Batch Execution

The developer asked about alternatives to running Playwright tests one by one. Here's the answer:

**We already have batch runners:**

- `npm run test:coverage` runs all 7 coverage files in one command
- `npm run test:experiential` runs all 9 experiential tests in one command
- `npm run test:coverage:overnight` runs the full screenshot crawler across all routes overnight
- Each `npm run test:interactions` runs all 49 interaction tests sequentially

**The VS Code Playwright extension** (if installed) provides a test explorer panel where you can run/debug tests visually, see results inline, and click through to failure screenshots.

**For maximum efficiency:** Run Phase 1 first (experiential + coverage). If that's green, you know 80% of the app works. Phase 2 (interactions) catches the remaining 20%. Phase 3 (journeys) is the final confidence layer.

---

## Pi / OpenClaw Role

The Pi handles:

- Price scraping pipeline health (are chains running? are they producing data?)
- OpenClaw database integrity (are prices populating correctly?)
- The 3 remaining ready specs (openclaw-total-capture, openclaw-archive-digester, openclaw-capture-countdown) all require Pi SSH

**During this QA session, Pi tasks are:**

1. Verify OpenClaw services are running: `ssh pi@10.0.0.177 'systemctl --user status openclaw-*'`
2. Check price data freshness: query the prices.db for last update timestamps
3. If price data is stale, the catalog and costing pages will show gaps (not errors, but incomplete data)

These are independent of ChefFlow QA and can run in parallel.

---

## Success Criteria

| Phase   | Pass Condition                                           |
| ------- | -------------------------------------------------------- |
| Phase 0 | Builder agent finished, latest pulled, build green       |
| Phase 1 | Experiential (9/9 pass) + Coverage (7/7 pass)            |
| Phase 2 | All 49 interaction tests pass (or failures are fixed)    |
| Phase 3 | All 17 journey tests pass + client portal + public pages |
| Phase 4 | All fixes committed, build green, pushed to main         |

**Launch gate:** Phases 1-3 all green. Phase 4 committed. Build state updated.

---

## Out of Scope

- External beta tester recruitment (developer explicitly deferred)
- OpenClaw spec building (3 remaining specs need Pi SSH, separate sessions)
- Infrastructure changes (Cloudflare, monitoring, backup automation)
- New feature development (this is QA only)
- Terms of Service / Privacy Policy (legal, not engineering)

---

## Notes for Builder Agent

- **Do not start until the active builder agent has finished and pushed**
- Dev server must be running on port 3100
- Auth files must exist: `.auth/agent.json`, `.auth/chef.json`, `.auth/client.json`
- If any auth file is missing, run `npm run agent:setup` first
- Run phases sequentially (1 -> 2 -> 3 -> 4), not in parallel
- For each failure: fix it, don't report it. You have the code and the browser.
- Anti-loop rule applies: 3 failures on the same issue = stop and document
- Take screenshots of key pages even when tests pass (evidence for the developer)
